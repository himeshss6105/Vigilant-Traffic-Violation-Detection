import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { ChallanRecord, ChallanStatus, FineRule, RegisteredVehicle } from "../src/types";

/**
 * We use Node's built-in `node:sqlite` module (stable since Node 22.5,
 * flagged "experimental" but functionally solid) instead of a package like
 * better-sqlite3. That avoids a native-module compile step entirely - no
 * node-gyp, no Python/C++ build toolchain needed on any teammate's machine,
 * which matters a lot more for a 4-person team on a deadline than the
 * "experimental" label does. Only requirement: Node.js >= 22.5 for everyone
 * on the team (see the "engines" field in package.json).
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "challans.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS challans (
    challan_id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    plate_number TEXT NOT NULL DEFAULT '',
    violations TEXT NOT NULL,
    line_items TEXT NOT NULL,
    total_fine INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'issued',
    evidence_image TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Older databases were created before owner details existed: add the new
// columns if they are missing (idempotent; existing challans are untouched).
{
  const existingCols = new Set(
    (db.prepare(`PRAGMA table_info(challans)`).all() as unknown as Array<{ name: string }>).map((c) => c.name)
  );
  for (const col of ["owner_name", "owner_phone", "vehicle_model", "vehicle_label", "registry_match"]) {
    if (!existingCols.has(col)) db.exec(`ALTER TABLE challans ADD COLUMN ${col} TEXT`);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS vehicles (
    plate TEXT PRIMARY KEY,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    vehicle_model TEXT NOT NULL DEFAULT '',
    vehicle_label TEXT NOT NULL,
    vehicle_class TEXT NOT NULL
  );
`);

interface VehicleRow {
  plate: string;
  owner_name: string;
  phone: string;
  vehicle_model: string;
  vehicle_label: string;
  vehicle_class: string;
}

export function replaceVehicles(vehicles: RegisteredVehicle[]): void {
  db.exec("BEGIN");
  try {
    db.exec(`DELETE FROM vehicles`);
    const stmt = db.prepare(
      `INSERT INTO vehicles (plate, owner_name, phone, vehicle_model, vehicle_label, vehicle_class) VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const v of vehicles) {
      stmt.run(v.plate, v.ownerName, v.phone, v.vehicleModel, v.vehicleLabel, v.vehicleClass);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function listVehicles(): RegisteredVehicle[] {
  const rows = db.prepare(`SELECT * FROM vehicles ORDER BY plate`).all() as unknown as VehicleRow[];
  return rows.map((r) => ({
    plate: r.plate,
    ownerName: r.owner_name,
    phone: r.phone,
    vehicleModel: r.vehicle_model,
    vehicleLabel: r.vehicle_label,
    vehicleClass: r.vehicle_class as "motorcycle" | "car",
  }));
}

interface ChallanRow {
  challan_id: string;
  vehicle_id: string;
  vehicle_type: string;
  plate_number: string;
  violations: string;
  line_items: string;
  total_fine: number;
  status: string;
  evidence_image: string | null;
  created_at: string;
  updated_at: string;
  owner_name: string | null;
  owner_phone: string | null;
  vehicle_model: string | null;
  vehicle_label: string | null;
  registry_match: string | null;
}

function rowToRecord(row: ChallanRow): ChallanRecord {
  return {
    challanId: row.challan_id,
    vehicleId: row.vehicle_id,
    vehicleType: row.vehicle_type as "motorcycle" | "car",
    plateNumber: row.plate_number,
    violations: JSON.parse(row.violations),
    lineItems: JSON.parse(row.line_items),
    totalFine: row.total_fine,
    status: row.status as ChallanStatus,
    timestamp: row.created_at,
    updatedAt: row.updated_at,
    evidenceImageBase64: row.evidence_image ?? undefined,
    ownerName: row.owner_name ?? undefined,
    ownerPhone: row.owner_phone ?? undefined,
    vehicleModel: row.vehicle_model ?? undefined,
    vehicleLabel: row.vehicle_label ?? undefined,
    registryMatch: (row.registry_match as "exact" | "corrected" | null) ?? undefined,
  };
}

export function insertChallan(record: ChallanRecord): void {
  db.prepare(
    `INSERT INTO challans
      (challan_id, vehicle_id, vehicle_type, plate_number, violations, line_items, total_fine, status, evidence_image, created_at, updated_at,
       owner_name, owner_phone, vehicle_model, vehicle_label, registry_match)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    record.challanId,
    record.vehicleId,
    record.vehicleType,
    record.plateNumber,
    JSON.stringify(record.violations),
    JSON.stringify(record.lineItems),
    record.totalFine,
    record.status,
    record.evidenceImageBase64 ?? null,
    record.timestamp,
    record.updatedAt,
    record.ownerName ?? null,
    record.ownerPhone ?? null,
    record.vehicleModel ?? null,
    record.vehicleLabel ?? null,
    record.registryMatch ?? null
  );
}

export function listChallans(): ChallanRecord[] {
  const rows = db.prepare(`SELECT * FROM challans ORDER BY created_at DESC`).all() as unknown as ChallanRow[];
  return rows.map(rowToRecord);
}

export function getChallanById(challanId: string): ChallanRecord | null {
  const row = db.prepare(`SELECT * FROM challans WHERE challan_id = ?`).get(challanId) as unknown as
    | ChallanRow
    | undefined;
  return row ? rowToRecord(row) : null;
}

/** Applies a partial update and returns the merged record, or null if the id doesn't exist. */
export function updateChallan(
  challanId: string,
  updates: {
    plateNumber?: string;
    violations?: string[];
    lineItems?: FineRule[];
    totalFine?: number;
    status?: ChallanStatus;
    /** undefined = keep the current owner details; null = clear them; object = replace them. */
    owner?: {
      ownerName: string;
      ownerPhone: string;
      vehicleModel: string;
      vehicleLabel: string;
      registryMatch: "exact" | "corrected";
    } | null;
  }
): ChallanRecord | null {
  const existing = getChallanById(challanId);
  if (!existing) return null;

  const { owner, ...fields } = updates;
  const merged: ChallanRecord = {
    ...existing,
    ...fields,
    updatedAt: new Date().toISOString(),
  };
  if (owner === null) {
    merged.ownerName = undefined;
    merged.ownerPhone = undefined;
    merged.vehicleModel = undefined;
    merged.vehicleLabel = undefined;
    merged.registryMatch = undefined;
  } else if (owner) {
    merged.ownerName = owner.ownerName;
    merged.ownerPhone = owner.ownerPhone;
    merged.vehicleModel = owner.vehicleModel;
    merged.vehicleLabel = owner.vehicleLabel;
    merged.registryMatch = owner.registryMatch;
  }

  db.prepare(
    `UPDATE challans
     SET plate_number = ?, violations = ?, line_items = ?, total_fine = ?, status = ?, updated_at = ?,
         owner_name = ?, owner_phone = ?, vehicle_model = ?, vehicle_label = ?, registry_match = ?
     WHERE challan_id = ?`
  ).run(
    merged.plateNumber,
    JSON.stringify(merged.violations),
    JSON.stringify(merged.lineItems),
    merged.totalFine,
    merged.status,
    merged.updatedAt,
    merged.ownerName ?? null,
    merged.ownerPhone ?? null,
    merged.vehicleModel ?? null,
    merged.vehicleLabel ?? null,
    merged.registryMatch ?? null,
    challanId
  );

  return merged;
}

export function deleteChallan(challanId: string): boolean {
  const result = db.prepare(`DELETE FROM challans WHERE challan_id = ?`).run(challanId);
  return Number(result.changes) > 0;
}
