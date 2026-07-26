/**
 * Standalone sanity check for the plate crop + OCR + syntax-correction
 * pipeline (server-lib/ocr.ts), using synthetic plate images generated at
 * runtime with sharp's SVG rasterizer - no external fixtures, no Python,
 * no Gemini API key required.
 *
 * Run with: npx tsx server-lib/__tests__/ocr.test.ts
 *
 * This exists so any teammate can confirm "OCR actually reads characters
 * correctly on this machine" in a few seconds, independent of whether the
 * Gemini API key is configured.
 */
import sharp from "sharp";
import { cropAndPreprocessPlate, ocrPlate, detectPlateText, terminateOcrWorker } from "../ocr";

interface Case {
  name: string;
  plateText: string;
  sceneWidth: number;
  sceneHeight: number;
  plateBoxPx: { left: number; top: number; width: number; height: number };
  fontSize: number;
}

const CASES: Case[] = [
  {
    name: "large/clear plate (10-char format)",
    plateText: "KA05MJ7890",
    sceneWidth: 1200,
    sceneHeight: 800,
    plateBoxPx: { left: 480, top: 520, width: 260, height: 70 },
    fontSize: 40,
  },
  {
    name: "small/distant plate (9-char format)",
    plateText: "MH12A1234",
    sceneWidth: 1200,
    sceneHeight: 800,
    plateBoxPx: { left: 550, top: 430, width: 130, height: 34 },
    fontSize: 20,
  },
];

async function buildSceneBuffer(c: Case): Promise<Buffer> {
  const { left, top, width, height } = c.plateBoxPx;
  const plateSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" stroke="#000000" stroke-width="2"/>
      <text x="50%" y="50%" font-family="monospace" font-weight="bold" font-size="${c.fontSize}"
            fill="#000000" text-anchor="middle" dominant-baseline="central">${c.plateText}</text>
    </svg>`;
  const platePng = await sharp(Buffer.from(plateSvg)).png().toBuffer();

  return sharp({
    create: {
      width: c.sceneWidth,
      height: c.sceneHeight,
      channels: 3,
      background: { r: 60, g: 65, b: 75 },
    },
  })
    .composite([{ input: platePng, left, top }])
    .png()
    .toBuffer();
}

function toNormalizedBox(c: Case): [number, number, number, number] {
  const { left, top, width, height } = c.plateBoxPx;
  return [
    Math.round((top / c.sceneHeight) * 1000),
    Math.round((left / c.sceneWidth) * 1000),
    Math.round(((top + height) / c.sceneHeight) * 1000),
    Math.round(((left + width) / c.sceneWidth) * 1000),
  ];
}

async function main() {
  let allPassed = true;

  for (const c of CASES) {
    console.log(`\n--- ${c.name} ---`);
    const scene = await buildSceneBuffer(c);
    const box = toNormalizedBox(c);

    const cropped = await cropAndPreprocessPlate(scene, box);
    const direct = await ocrPlate(cropped);
    const wrapped = await detectPlateText(scene, box);

    const passed = direct.text === c.plateText;
    allPassed &&= passed;

    console.log("Ground truth      :", c.plateText);
    console.log("OCR raw text      :", direct.rawText);
    console.log("OCR corrected text:", direct.text);
    console.log("Confidence        :", direct.confidence.toFixed(2));
    console.log("Full pipeline OK  :", wrapped?.text === c.plateText);
    console.log(passed ? "PASS" : "FAIL");
  }

  await terminateOcrWorker();

  console.log("\n=====================================");
  console.log(allPassed ? "ALL OCR TESTS PASSED" : "SOME OCR TESTS FAILED");
  console.log("=====================================");
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("OCR test script crashed:", err);
  process.exit(1);
});
