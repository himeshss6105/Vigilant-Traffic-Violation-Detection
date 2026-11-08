import fs from "fs";
import path from "path";
import type { RegisteredVehicle, RegistryMatch, VehicleClass } from "../src/types";

/**
 * Simulated vehicle registry used to attach owner details to a challan.
 *
 * - Loaded from data/vehicles.csv at server start (see loadRegistryCsv).
 * - Plates read by OCR / the vision model are matched against it with a
 *   confusion-aware edit distance, so "KAO5MX958I" still finds "KA05MX9581",
 *   but a reading that is too far from every plate (or equally close to two
 *   plates) is NOT matched, so a challan is never attached to a guessed owner.
 */

// Characters that OCR commonly confuses; substituting one for the other is cheap.
const CONFUSABLE_PAIRS: Array<[string, string]> = [
  ["0", "O"], ["0", "D"], ["0", "Q"], ["1", "I"], ["1", "L"],
  ["5", "S"], ["8", "B"], ["2", "Z"], ["6", "G"],
];
const CONFUSABLE = new Set<string>();
for (const [a, b] of CONFUSABLE_PAIRS) {
  CONFUSABLE.add(a + b);
  CONFUSABLE.add(b + a);
}

const SUB_COST_CONFUSABLE = 0.5;
const SUB_COST_OTHER = 1;
const INDEL_COST = 1;

/** A reading is accepted only if its weighted distance is at most this... */
export const MAX_MATCH_DISTANCE = 1.5;
/** ...and the runner-up plate is at least this much further away. */
export const MIN_MARGIN = 1;
/** Shorter readings are too ambiguous to look up. */
export const MIN_PLATE_LENGTH = 6;

export function normalizePlate(raw: string | undefined | null): string {
  return String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function categoryToClass(label: string): VehicleClass {
  return label.trim().toLowerCase() === "car" ? "car" : "motorcycle";
}

/** Weighted Levenshtein distance between two already-normalised plates. */
export function plateDistance(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  let prev = new Array<number>(m + 1);
  let curr = new Array<number>(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j * INDEL_COST;
  for (let i = 1; i <= n; i++) {
    curr[0] = i * INDEL_COST;
    for (let j = 1; j <= m; j++) {
      let sub: number;
      if (a[i - 1] === b[j - 1]) sub = 0;
      else if (CONFUSABLE.has(a[i - 1] + b[j - 1])) sub = SUB_COST_CONFUSABLE;
      else sub = SUB_COST_OTHER;
      curr[j] = Math.min(prev[j - 1] + sub, prev[j] + INDEL_COST, curr[j - 1] + INDEL_COST);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[m];
}

export interface MatchResult {
  vehicle: RegisteredVehicle;
  distance: number;
  matchType: "exact" | "corrected";
  /** The reading (OCR or vision model) that produced the match. */
  readAs: string;
}

/**
 * Finds the registered vehicle that one of the readings refers to, or null.
 * `vehicleClass` (when known) restricts the search: a plate registered to a car
 * cannot belong to a detected motorcycle, which removes a whole class of false matches.
 */
export function matchPlate(
  readings: Array<string | undefined | null>,
  vehicles: RegisteredVehicle[],
  vehicleClass?: VehicleClass
): MatchResult | null {
  const texts = Array.from(new Set(readings.map(normalizePlate).filter((t) => t.length >= MIN_PLATE_LENGTH)));
  if (texts.length === 0) return null;

  const pool = vehicleClass ? vehicles.filter((v) => v.vehicleClass === vehicleClass) : vehicles;
  if (pool.length === 0) return null;

  const scored = pool
    .map((vehicle) => {
      let best = Infinity;
      let readAs = "";
      for (const t of texts) {
        const d = plateDistance(t, normalizePlate(vehicle.plate));
        if (d < best) {
          best = d;
          readAs = t;
        }
      }
      return { vehicle, distance: best, readAs };
    })
    .sort((x, y) => x.distance - y.distance);

  const best = scored[0];
  if (best.distance === 0) {
    return { vehicle: best.vehicle, distance: 0, matchType: "exact", readAs: best.readAs };
  }
  if (best.distance > MAX_MATCH_DISTANCE) return null;
  const runnerUp = scored[1];
  if (runnerUp && runnerUp.distance - best.distance < MIN_MARGIN) return null; // ambiguous
  return { vehicle: best.vehicle, distance: best.distance, matchType: "corrected", readAs: best.readAs };
}

/** Phone numbers are masked (86******33) unless SHOW_FULL_PHONE=true is set in .env. */
export function maskPhone(phone: string | undefined | null): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (String(process.env.SHOW_FULL_PHONE).toLowerCase() === "true") return digits;
  if (digits.length <= 4) return "*".repeat(digits.length);
  return digits.slice(0, 2) + "*".repeat(digits.length - 4) + digits.slice(-2);
}

export function toPublicMatch(m: MatchResult): RegistryMatch {
  return {
    plate: m.vehicle.plate,
    ownerName: m.vehicle.ownerName,
    phoneMasked: maskPhone(m.vehicle.phone),
    vehicleModel: m.vehicle.vehicleModel,
    vehicleLabel: m.vehicle.vehicleLabel,
    vehicleClass: m.vehicle.vehicleClass,
    matchType: m.matchType,
    readAs: m.readAs,
    distance: Math.round(m.distance * 100) / 100,
  };
}

/**
 * Looks up the registry for one detected vehicle and, on a match, replaces the
 * displayed plate with the registered one (keeping the original reading in
 * plateTextRaw) and attaches the owner details. Mutates `vehicle`.
 * Returns the match (or null) so the caller can log it.
 */
export function attachRegistry(vehicle: any, vehicleClass: VehicleClass, vehicles: RegisteredVehicle[]): MatchResult | null {
  const m = matchPlate([vehicle?.plateText, vehicle?.plateTextGuess], vehicles, vehicleClass);
  if (!m) return null;
  vehicle.plateTextRaw = vehicle.plateText ?? vehicle.plateTextGuess ?? m.readAs;
  vehicle.plateText = m.vehicle.plate;
  vehicle.registry = toPublicMatch(m);
  return m;
}

// ---------------------------------------------------------------------------
// CSV loading
// ---------------------------------------------------------------------------

export interface CsvSkip {
  line: number;
  owner: string;
  reason: string;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.replace(/\s+/g, " ").trim());
}

const PLATE_FORMAT = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/;

/** Parses data/vehicles.csv (columns: plate, owner, vehicle, category, phone). */
export function parseVehiclesCsv(text: string): { vehicles: RegisteredVehicle[]; skipped: CsvSkip[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const vehicles: RegisteredVehicle[] = [];
  const skipped: CsvSkip[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const [plateRaw, owner = "", model = "", categoryRaw = "", phoneRaw = ""] = splitCsvLine(lines[i]);
    const plate = normalizePlate(plateRaw);
    const fail = (reason: string) => skipped.push({ line: i + 1, owner, reason });

    if (!plate) { fail("no number plate"); continue; }
    if (!PLATE_FORMAT.test(plate)) { fail(`plate "${plate}" is not in Indian format`); continue; }
    if (seen.has(plate)) { fail(`duplicate plate ${plate}`); continue; }
    if (!owner) { fail("no owner name"); continue; }
    const label = categoryRaw.trim();
    if (!/^(car|bike|scooter)$/i.test(label)) { fail(`unknown category "${categoryRaw}"`); continue; }

    seen.add(plate);
    vehicles.push({
      plate,
      ownerName: owner,
      phone: phoneRaw.replace(/\D/g, ""),
      vehicleModel: model,
      vehicleLabel: label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(),
      vehicleClass: categoryToClass(label),
    });
  }
  return { vehicles, skipped };
}

export function registryCsvPath(): string {
  return process.env.REGISTRY_CSV || path.join(process.cwd(), "data", "vehicles.csv");
}

/** Reads the CSV from disk. Returns null if the file does not exist. */
export function loadRegistryCsv(): { vehicles: RegisteredVehicle[]; skipped: CsvSkip[]; file: string } | null {
  const file = registryCsvPath();
  if (!fs.existsSync(file)) return null;
  const parsed = parseVehiclesCsv(fs.readFileSync(file, "utf8"));
  return { ...parsed, file };
}
