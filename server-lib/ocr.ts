import sharp from "sharp";
import path from "path";
import { createRequire } from "module";
import { createWorker, Worker } from "tesseract.js";
import type { BoundingBox } from "../src/types";

// By default tesseract.js downloads its English language data from a public
// CDN (jsdelivr) the first time it runs. That's an unnecessary runtime
// network dependency for a demo/viva (campus wifi, firewalls, or offline
// rooms can all break it silently). Since @tesseract.js-data/eng is an
// installable npm package, we point langPath at the copy already sitting in
// node_modules so recognition works fully offline with no CDN calls at all.
//
// Getting a working `require` here is genuinely different in the two places
// this file runs, and it matters to get both right:
//  - Dev (`npm run dev`, via tsx): this project has "type": "module", so tsx
//    runs this file as real ESM. There is NO ambient `require` at all here
//    (verified: `typeof require` is "undefined" in this exact context) - it
//    must be constructed via `createRequire(import.meta.url)`.
//  - Production (`npm run build`, via `esbuild --format=cjs`): esbuild
//    compiles this file to real CommonJS, where `require` is a genuine
//    native global (verified against the actual bundled output) - but
//    `import.meta.url` is empty in that format (esbuild warns about this
//    directly), so `createRequire(import.meta.url)` cannot be used there.
//
// Neither option alone covers both cases, so we feature-detect at runtime
// and use whichever is actually available.
function getRequire(): NodeRequire {
  if (typeof require !== "undefined") {
    return require;
  }
  return createRequire(import.meta.url);
}

function resolveLocalLangPath(): string {
  const pkgJsonPath = getRequire().resolve("@tesseract.js-data/eng/package.json");
  return path.join(path.dirname(pkgJsonPath), "4.0.0_best_int");
}

// A single shared Tesseract worker is reused across requests instead of
// spinning one up per request, since worker startup (loading the trained
// data) is the slowest part of the OCR pipeline.
let worker: Worker | null = null;
let workerInitPromise: Promise<Worker> | null = null;

// Classic OCR confusions between visually similar characters.
const DIGIT_TO_LETTER: Record<string, string> = { "0": "O", "1": "I", "2": "Z", "5": "S", "8": "B", "6": "G" };
const LETTER_TO_DIGIT: Record<string, string> = { O: "0", I: "1", Z: "2", S: "5", B: "8", G: "6", Q: "0" };

/**
 * Syntax-aware correction pass for the standard Indian plate format
 * (2 letters + 2 digits + 1-2 letters + 4 digits, e.g. "KA05MJ7890"). Raw
 * OCR frequently confuses 0/O, 1/I, 5/S, 8/B, 2/Z, 6/G depending on font and
 * lighting; knowing which position *must* be a letter vs a digit lets us fix
 * these without guessing. This is the same category of post-processing
 * described in ALPR literature (see Ref #10 in your Presentation tab) to
 * compensate for raw OCR ambiguity, layered on top of - not instead of -
 * the actual character recognition.
 *
 * Only the common 10-char (LL DD LL DDDD) and 9-char (LL DD L DDDD) layouts
 * are corrected. Anything else (BH-series plates, partially occluded
 * plates, etc.) is returned unchanged rather than risk a wrong guess.
 */
export function normalizeIndianPlateText(raw: string): string {
  const chars = raw.split("");
  let pattern: ("L" | "D")[] | null = null;

  if (chars.length === 10) pattern = ["L", "L", "D", "D", "L", "L", "D", "D", "D", "D"];
  else if (chars.length === 9) pattern = ["L", "L", "D", "D", "L", "D", "D", "D", "D"];

  if (!pattern) return raw;

  return chars
    .map((ch, i) => {
      const expected = pattern![i];
      if (expected === "L" && /[0-9]/.test(ch)) return DIGIT_TO_LETTER[ch] ?? ch;
      if (expected === "D" && /[A-Z]/.test(ch)) return LETTER_TO_DIGIT[ch] ?? ch;
      return ch;
    })
    .join("");
}

async function getWorker(): Promise<Worker> {
  if (worker) return worker;
  if (!workerInitPromise) {
    workerInitPromise = (async () => {
      let langPath: string | undefined;
      try {
        langPath = resolveLocalLangPath();
      } catch {
        // @tesseract.js-data/eng isn't installed for some reason; tesseract.js
        // will fall back to downloading from jsdelivr instead of failing outright.
        console.warn("[OCR] Local @tesseract.js-data/eng not found; falling back to CDN download.");
      }

      const w = await createWorker("eng", 1, langPath ? { langPath, cacheMethod: "none" } : undefined);
      await w.setParameters({
        // Restrict recognition to the character set license plates actually use.
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      });
      worker = w;
      return w;
    })();
  }
  return workerInitPromise;
}

/**
 * Crops the plate region out of the full frame using normalized
 * [ymin, xmin, ymax, xmax] (0-1000 scale) coordinates returned by the Gemini
 * detector, then upscales and cleans up the crop (grayscale, contrast
 * normalization, sharpening, binarization) so the small, often low-contrast
 * plate region is much easier for Tesseract to read correctly.
 */
export async function cropAndPreprocessPlate(imageBuffer: Buffer, box: BoundingBox): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 1000;
  const height = metadata.height || 1000;

  const [ymin, xmin, ymax, xmax] = box;
  const left = Math.max(0, Math.floor((xmin / 1000) * width));
  const top = Math.max(0, Math.floor((ymin / 1000) * height));
  const rawWidth = Math.max(1, Math.floor(((xmax - xmin) / 1000) * width));
  const rawHeight = Math.max(1, Math.floor(((ymax - ymin) / 1000) * height));

  // Clamp so the extract() call never runs past the image bounds
  const cropWidth = Math.min(rawWidth, width - left);
  const cropHeight = Math.min(rawHeight, height - top);

  if (cropWidth <= 0 || cropHeight <= 0) {
    throw new Error("Invalid plate bounding box: crop region has zero area.");
  }

  return sharp(imageBuffer)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize({ width: Math.min(cropWidth * 3, 1200) }) // upscale small/distant plates
    .grayscale()
    .normalize()
    .sharpen()
    .threshold(140)
    .toFormat("png")
    .toBuffer();
}

/**
 * Runs real OCR (Tesseract) on a preprocessed plate crop and returns the
 * cleaned alphanumeric text (after syntax-aware correction), the raw
 * pre-correction OCR text (handy to log/display for your viva to show the
 * correction step working), and a 0-1 confidence score.
 */
export async function ocrPlate(
  plateBuffer: Buffer
): Promise<{ text: string; rawText: string; confidence: number }> {
  const w = await getWorker();
  const { data } = await w.recognize(plateBuffer);

  const rawText = (data.text || "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .trim();

  const text = normalizeIndianPlateText(rawText);

  return {
    text,
    rawText,
    confidence: (data.confidence ?? 0) / 100,
  };
}

/**
 * Convenience helper combining crop + OCR. Returns null instead of throwing
 * so a single bad plate box never fails the whole /api/analyze request.
 */
export async function detectPlateText(
  imageBuffer: Buffer,
  box: BoundingBox
): Promise<{ text: string; rawText: string; confidence: number } | null> {
  try {
    const cropped = await cropAndPreprocessPlate(imageBuffer, box);
    const result = await ocrPlate(cropped);
    return result.text.length >= 4 ? result : null; // discard near-empty/garbage reads
  } catch (err) {
    console.error("[OCR] Plate detection failed:", (err as Error).message);
    return null;
  }
}

export async function terminateOcrWorker() {
  if (worker) {
    await worker.terminate();
    worker = null;
    workerInitPromise = null;
  }
}
