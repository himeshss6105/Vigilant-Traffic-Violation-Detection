// Quick check: can this PC reach the Gemini API with your key?  Run:  node test-gemini.mjs
import "dotenv/config";

const key = process.env.GEMINI_API_KEY;
if (!key || key === "MY_GEMINI_API_KEY") {
  console.log("X GEMINI_API_KEY is missing in .env");
  process.exit(1);
}
const base = "https://generativelanguage.googleapis.com/v1beta";

async function step(label, fn) {
  const t = Date.now();
  try {
    const out = await fn();
    console.log(`OK   ${label} (${Date.now() - t} ms)${out ? " - " + out : ""}`);
    return true;
  } catch (e) {
    console.log(`FAIL ${label} (${Date.now() - t} ms): ${e.message}`);
    if (e.cause) console.log("     cause:", e.cause.code || "", e.cause.message || e.cause);
    return false;
  }
}

await step("1. Reach Google API + list models", async () => {
  const r = await fetch(`${base}/models?pageSize=200&key=${key}`, { signal: AbortSignal.timeout(20000) });
  const body = await r.json();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${body?.error?.message || JSON.stringify(body).slice(0, 200)}`);
  const names = (body.models || []).map((m) => m.name.replace("models/", ""));
  const flash = names.filter((n) => /^gemini-[\d.]+-flash$/.test(n));
  return `flash models available to your key: ${flash.join(", ") || "none"}`;
});

for (const model of ["gemini-2.5-flash", "gemini-3.8-flash"]) {
  await step(`2. generateContent with ${model}`, async () => {
    const r = await fetch(`${base}/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with the single word: ready" }] }] }),
      signal: AbortSignal.timeout(30000),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${body?.error?.message || "unknown"}`);
    return (body.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  });
}

// 3. Upload speed: sends ~3 MB of data to Google (the request is rejected, we only time the upload)
await step("3. Upload speed (3 MB)", async () => {
  const blob = "A".repeat(3 * 1024 * 1024);
  const t = Date.now();
  const r = await fetch(`${base}/models/gemini-2.5-flash:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType: "image/jpeg", data: blob } }, { text: "hi" }] }] }),
    signal: AbortSignal.timeout(120000),
  });
  await r.text();
  const secs = (Date.now() - t) / 1000;
  return `${secs.toFixed(1)}s for 3 MB (~${Math.round(3072 / secs)} kB/s). Under 20s is fine.`;
});
