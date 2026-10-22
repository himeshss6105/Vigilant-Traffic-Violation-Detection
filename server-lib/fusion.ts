// Fuses the trained YOLO detectors (traffic_best.pt + mirror_best.pt) with the
// Gemini Vision result.
//
// Division of labour:
//   Gemini -> finds vehicles, groups riders/occupants to each vehicle.
//   YOLO   -> overrides the fine-grained attributes it was trained for:
//             helmet / no-helmet, seatbelt / no-seatbelt, license-plate, mirror.
//
// Gemini boxes are [ymin, xmin, ymax, xmax] on a 0-1000 scale.
// YOLO boxes are [x1, y1, x2, y2] in pixels, so they are normalised first.
// Everything here is defensive: if YOLO data is missing or malformed the
// Gemini result is returned untouched.

import type { BoundingBox } from "../src/types";

export interface YoloDetection {
  class_id: number;
  class_name: string;
  confidence: number;
  box: [number, number, number, number]; // x1, y1, x2, y2 in pixels
}

export interface YoloResponse {
  image_width?: number;
  image_height?: number;
  traffic?: { detections?: YoloDetection[] };
  mirrors?: { detections?: YoloDetection[] };
}

interface NormDet {
  cls: string;
  conf: number;
  box: BoundingBox;
}

// Minimum YOLO confidence before a detection is allowed to override Gemini.
const MIN_ATTRIBUTE_CONF = 0.35;
const MIN_PLATE_CONF = 0.3;
const MIN_MIRROR_CONF = 0.3;

const clamp = (v: number) => Math.max(0, Math.min(1000, Math.round(v)));

function normaliseClass(name: string): string {
  return String(name || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function toNorm(d: YoloDetection, w: number, h: number): NormDet | null {
  if (!Array.isArray(d.box) || d.box.length !== 4 || !w || !h) return null;
  const [x1, y1, x2, y2] = d.box;
  return {
    cls: normaliseClass(d.class_name),
    conf: Number(d.confidence) || 0,
    box: [clamp((y1 / h) * 1000), clamp((x1 / w) * 1000), clamp((y2 / h) * 1000), clamp((x2 / w) * 1000)],
  };
}

const area = (b: BoundingBox) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);

function center(b: BoundingBox): [number, number] {
  return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; // [y, x]
}

function contains(outer: BoundingBox, point: [number, number]): boolean {
  return point[0] >= outer[0] && point[0] <= outer[2] && point[1] >= outer[1] && point[1] <= outer[3];
}

// Grow a box by a fraction of its size. `up` extends extra room above the box
// (riders' heads sit above the motorcycle's own bounding box).
function expand(b: BoundingBox, frac: number, up = 0): BoundingBox {
  const h = b[2] - b[0];
  const w = b[3] - b[1];
  return [clamp(b[0] - h * (frac + up)), clamp(b[1] - w * frac), clamp(b[2] + h * frac), clamp(b[3] + w * frac)];
}

// Index of the smallest vehicle whose (expanded) box contains the detection's
// centre, or -1. Smallest wins so a detection on a bike in front of a car goes
// to the bike.
function owner(vehicles: any[], det: NormDet, frac: number, up = 0): number {
  const c = center(det.box);
  let best = -1;
  let bestArea = Infinity;
  vehicles.forEach((v, i) => {
    if (!Array.isArray(v?.box) || v.box.length !== 4) return;
    const grown = expand(v.box as BoundingBox, frac, up);
    if (contains(grown, c) && area(v.box) < bestArea) {
      best = i;
      bestArea = area(v.box);
    }
  });
  return best;
}

export interface FusionSummary {
  applied: boolean;
  yoloDetections: number;
  helmetOverrides: number;
  ridersAdded: number;
  seatbeltOverrides: number;
  platesReplaced: number;
  mirrorsConfirmed: number;
  mirrorsMissingFlagged: number;
  triplesRidingFlagged: number;
}

export function fuseYoloWithGemini(parsed: any, yolo: YoloResponse | null): FusionSummary {
  const summary: FusionSummary = {
    applied: false,
    yoloDetections: 0,
    helmetOverrides: 0,
    ridersAdded: 0,
    seatbeltOverrides: 0,
    platesReplaced: 0,
    mirrorsConfirmed: 0,
    mirrorsMissingFlagged: 0,
    triplesRidingFlagged: 0,
  };
  if (!parsed || !yolo) return summary;

  const w = Number(yolo.image_width);
  const h = Number(yolo.image_height);
  if (!w || !h) return summary; // old yolo-service without image size: skip safely

  const traffic = (yolo.traffic?.detections || [])
    .map((d) => toNorm(d, w, h))
    .filter((d): d is NormDet => d !== null);
  const mirrors = (yolo.mirrors?.detections || [])
    .map((d) => toNorm(d, w, h))
    .filter((d): d is NormDet => d !== null);

  summary.yoloDetections = traffic.length + mirrors.length;
  if (summary.yoloDetections === 0) return summary;
  summary.applied = true;

  const bikes: any[] = parsed.motorcycles || [];
  const cars: any[] = parsed.cars || [];
  const allVehicles: any[] = [...bikes, ...cars];

  // ---- Helmets / triple riding (motorcycles) ----
  const helmetDets = traffic.filter(
    (d) => (d.cls === "helmet" || d.cls === "no-helmet") && d.conf >= MIN_ATTRIBUTE_CONF
  );
  const usedHelmetDets = new Set<NormDet>();

  for (const bike of bikes) {
    for (const rider of bike.riders || []) {
      if (!Array.isArray(rider.box) || rider.box.length !== 4) continue;
      const candidates = helmetDets.filter((d) => !usedHelmetDets.has(d) && contains(rider.box, center(d.box)));
      if (candidates.length === 0) continue;
      const best = candidates.sort((a, b) => b.conf - a.conf)[0];
      usedHelmetDets.add(best);
      const hasHelmet = best.cls === "helmet";
      if (rider.hasHelmet !== hasHelmet) summary.helmetOverrides++;
      rider.hasHelmet = hasHelmet;
      rider.confidence = Math.max(rider.confidence ?? 0, best.conf);
    }
  }

  // YOLO heads that Gemini did not account for as a rider: add them to the bike
  // they belong to. This is what recovers missed pillion riders.
  for (const d of helmetDets) {
    if (usedHelmetDets.has(d)) continue;
    const idx = owner(bikes, d, 0.15, 0.6);
    if (idx < 0) continue;
    const bike = bikes[idx];
    const alreadyCovered = (bike.riders || []).some(
      (r: any) => Array.isArray(r.box) && r.box.length === 4 && contains(r.box, center(d.box))
    );
    if (alreadyCovered) continue;
    bike.riders = bike.riders || [];
    bike.riders.push({ box: d.box, hasHelmet: d.cls === "helmet", confidence: d.conf });
    summary.ridersAdded++;
  }

  // YOLO "triple-riding" box: if it covers a bike that still has < 3 riders,
  // pad the rider list so the existing "> 2 riders" violation rule triggers.
  for (const d of traffic.filter((t) => t.cls === "triple-riding" && t.conf >= 0.5)) {
    const idx = owner(bikes, d, 0.1, 0.3);
    if (idx < 0) continue;
    const bike = bikes[idx];
    bike.riders = bike.riders || [];
    while (bike.riders.length < 3) {
      bike.riders.push({ box: d.box, hasHelmet: true, confidence: d.conf });
    }
    summary.triplesRidingFlagged++;
  }

  // ---- Seatbelts (cars) ----
  const beltDets = traffic.filter(
    (d) => (d.cls === "seatbelt" || d.cls === "no-seatbelt") && d.conf >= MIN_ATTRIBUTE_CONF
  );
  const usedBeltDets = new Set<NormDet>();
  for (const car of cars) {
    for (const occ of car.occupants || []) {
      if (!Array.isArray(occ.box) || occ.box.length !== 4) continue;
      const region = expand(occ.box as BoundingBox, 0.1);
      const candidates = beltDets.filter((d) => !usedBeltDets.has(d) && contains(region, center(d.box)));
      if (candidates.length === 0) continue;
      const best = candidates.sort((a, b) => b.conf - a.conf)[0];
      usedBeltDets.add(best);
      const wearing = best.cls === "seatbelt";
      if (occ.wearingSeatbelt !== wearing) summary.seatbeltOverrides++;
      occ.wearingSeatbelt = wearing;
      occ.confidence = Math.max(occ.confidence ?? 0, best.conf);
    }
  }

  // ---- License plates: YOLO's tight box beats Gemini's for OCR ----
  const plateDets = traffic.filter((d) => d.cls === "license-plate" && d.conf >= MIN_PLATE_CONF);
  const bestPlateFor = new Map<number, NormDet>();
  for (const d of plateDets) {
    const idx = owner(allVehicles, d, 0.05);
    if (idx < 0) continue;
    const current = bestPlateFor.get(idx);
    if (!current || d.conf > current.conf) bestPlateFor.set(idx, d);
  }
  bestPlateFor.forEach((d, idx) => {
    allVehicles[idx].plateBox = d.box;
    summary.platesReplaced++;
  });

  // ---- Mirrors ----
  // Each confident mirror detection is assigned to ONE bike (the one whose box actually contains it;
  // a slightly padded box is only used as a fallback, so a neighbouring bike's mirror is not borrowed).
  //  - bike has >= 1 mirror      -> hasRearviewMirror = true
  //  - bike has none, and the mirror model DID see mirrors elsewhere in the image
  //                              -> hasRearviewMirror = false (the model works on this scene, so
  //                                 "no detection on this bike" is real evidence)
  //  - mirror model saw nothing at all in the image -> keep Gemini's answer (cannot judge)
  // Set MIRROR_STRICT=false in .env to disable the "none found -> missing" rule.
  const strictMirrors = process.env.MIRROR_STRICT !== "false";
  const confidentMirrors = mirrors.filter((m) => m.conf >= MIN_MIRROR_CONF);
  const mirrorCount = new Map<number, number>();
  for (const d of confidentMirrors) {
    let idx = owner(bikes, d, 0); // exact containment first
    if (idx < 0) idx = owner(bikes, d, 0.08, 0.1); // small tolerance fallback
    if (idx < 0) continue;
    mirrorCount.set(idx, (mirrorCount.get(idx) || 0) + 1);
  }
  bikes.forEach((bike, i) => {
    const count = mirrorCount.get(i) || 0;
    if (count > 0) {
      if (bike.hasRearviewMirror !== true) summary.mirrorsConfirmed++;
      bike.hasRearviewMirror = true;
    } else if (strictMirrors && confidentMirrors.length > 0) {
      if (bike.hasRearviewMirror !== false) summary.mirrorsMissingFlagged++;
      bike.hasRearviewMirror = false;
    }
  });

  return summary;
}
