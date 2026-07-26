import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { ChallanRecord, ChallanStatus, FineRule } from "../src/types";

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
  };
}

export function insertChallan(record: ChallanRecord): void {
  db.prepare(
    `INSERT INTO challans
      (challan_id, vehicle_id, vehicle_type, plate_number, violations, line_items, total_fine, status, evidence_image, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    record.updatedAt
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
  }
): ChallanRecord | null {
  const existing = getChallanById(challanId);
  if (!existing) return null;

  const merged: ChallanRecord = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  db.prepare(
    `UPDATE challans
     SET plate_number = ?, violations = ?, line_items = ?, total_fine = ?, status = ?, updated_at = ?
     WHERE challan_id = ?`
  ).run(
    merged.plateNumber,
    JSON.stringify(merged.violations),
    JSON.stringify(merged.lineItems),
    merged.totalFine,
    merged.status,
    merged.updatedAt,
    challanId
  );

  return merged;
}

export function deleteChallan(challanId: string): boolean {
  const result = db.prepare(`DELETE FROM challans WHERE challan_id = ?`).run(challanId);
  return Number(result.changes) > 0;
}
