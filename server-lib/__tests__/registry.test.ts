// Tests for the simulated vehicle registry: plate matching, CSV loading, phone masking
// and the database layer (including upgrading an old database).
// Run from the project root:  npx tsx server-lib/__tests__/registry.test.ts
import fs from "fs";
import os from "os";
import path from "path";
import {
  normalizePlate, plateDistance, matchPlate, maskPhone, parseVehiclesCsv, attachRegistry, MAX_MATCH_DISTANCE,
} from "../registry";
import type { RegisteredVehicle } from "../../src/types";

let passed = 0;
let failed = 0;
function check(id: string, description: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`PASS ${id} ${description}`);
  } else {
    failed++;
    console.log(`FAIL ${id} ${description}${detail ? `\n     ${detail}` : ""}`);
  }
}

const csvPath = path.join(process.cwd(), "data", "vehicles.csv");
const parsed = parseVehiclesCsv(fs.readFileSync(csvPath, "utf8"));
const V = parsed.vehicles;
const byPlate = (p: string) => V.find((v) => v.plate === p)!;

async function main() {
  // ---- CSV ----
  check("RG-01", "data/vehicles.csv loads without skipped rows", V.length > 0 && parsed.skipped.length === 0,
    `loaded ${V.length}, skipped ${JSON.stringify(parsed.skipped)}`);
  check("RG-02", "plates in the CSV are unique", new Set(V.map((v) => v.plate)).size === V.length);
  check("RG-03", "normalizePlate strips spaces, dashes and case", normalizePlate(" ka05-mx 9581 ") === "KA05MX9581");
  {
    const t = parseVehiclesCsv(
      '\uFEFFplate,owner,vehicle,category,phone\n' +
      'KA01AB1234,"Doe, John",Swift,car,9876543210\n' +
      ',No Plate,Dio,Scooter,9876543210\n' +
      'XX,Bad Plate,Dio,Scooter,9876543210\n' +
      'KA01AB1234,Duplicate,Dio,Scooter,9876543210\n' +
      'KA02CD5678,Odd Type,Truck,lorry,9876543210\n'
    );
    check("RG-04", "CSV parser: BOM, quotes, class mapping; bad rows are skipped with a reason",
      t.vehicles.length === 1 && t.vehicles[0].ownerName === "Doe, John" && t.vehicles[0].vehicleClass === "car" &&
        t.skipped.length === 4 && t.skipped.every((s) => s.reason.length > 0),
      JSON.stringify(t));
  }

  // ---- matching ----
  const creta = byPlate("KA05MX9581");
  let m = matchPlate(["KA05MX9581"], V, "car");
  check("RG-05", "exact plate matches with distance 0", !!m && m.vehicle.plate === creta.plate && m.matchType === "exact" && m.distance === 0);
  m = matchPlate(["KAO5MX958I"], V, "car");
  check("RG-06", "letters O/I read in place of 0/1 still match the right owner",
    !!m && m.vehicle.plate === creta.plate && m.matchType === "corrected" && m.distance === 1, JSON.stringify(m && { p: m.vehicle.plate, d: m.distance }));
  m = matchPlate(["KA05MX958"], V, "car");
  check("RG-07", "one dropped character still matches", !!m && m.vehicle.plate === creta.plate && m.matchType === "corrected");
  m = matchPlate(["IKA05MX9581"], V, "car");
  check("RG-08", "one extra character still matches", !!m && m.vehicle.plate === creta.plate);
  check("RG-09", "an 8-character reading (JASH7972) is not matched", matchPlate(["JASH7972"], V) === null);
  check("RG-10", "two ordinary wrong characters are rejected (distance above the limit)", matchPlate(["KA05MX7571"], V, "car") === null);
  check("RG-11", "a well-formed but unregistered plate is not matched", matchPlate(["KA99ZZ0000"], V) === null);
  check("RG-12", "readings shorter than 6 characters are ignored", matchPlate(["KA05"], V) === null);
  check("RG-13", "class guard: a car's plate is never attached to a motorcycle",
    matchPlate(["KA05MX9581"], V, "motorcycle") === null && matchPlate(["KA05MX9581"], V, "car") !== null);
  check("RG-14", "no readings -> no match", matchPlate([undefined, "", null], V) === null);
  {
    const twin: RegisteredVehicle[] = [
      { ...creta, plate: "KA05AB1234", ownerName: "A" },
      { ...creta, plate: "KA05AB1239", ownerName: "B" },
    ];
    check("RG-15", "ambiguity guard: a reading equally close to two plates is rejected",
      matchPlate(["KA05AB1236"], twin, "car") === null);
    check("RG-16", "ambiguity guard does not block an exact match", matchPlate(["KA05AB1239"], twin, "car")?.vehicle.ownerName === "B");
  }
  {
    // second reading (vision model) rescues a bad OCR reading
    const rescued = matchPlate(["K4O5M}958l", "KA05MX9581"], V, "car");
    check("RG-17", "the better of the OCR and vision-model readings is used", rescued?.matchType === "exact" && rescued.vehicle.plate === creta.plate);
  }
  check("RG-18", "distance: confusable swap costs 0.5, ordinary swap costs 1",
    plateDistance("KA05", "KAO5") === 0.5 && plateDistance("KA05", "KA75") === 1);

  // ---- safety property over the whole registry ----
  {
    let wrong = 0;
    let recovered = 0;
    let rejected = 0;
    let total = 0;
    const ALPHABET = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
    for (const v of V) {
      for (let i = 0; i < v.plate.length; i++) {
        for (const ch of ALPHABET) {
          if (ch === v.plate[i]) continue;
          const corrupted = v.plate.slice(0, i) + ch + v.plate.slice(i + 1);
          const r = matchPlate([corrupted], V, v.vehicleClass);
          total++;
          if (!r) rejected++;
          else if (r.vehicle.plate === v.plate) recovered++;
          else wrong++;
        }
      }
    }
    check("RG-19", `no single-character OCR error ever attaches a challan to the WRONG owner (${total} cases)`, wrong === 0,
      `wrong matches: ${wrong}`);
    console.log(`     info: ${recovered} recovered, ${rejected} safely rejected (limit ${MAX_MATCH_DISTANCE})`);
    check("RG-20", "every registered plate matches itself exactly", V.every((v) => matchPlate([v.plate], V, v.vehicleClass)?.matchType === "exact"));
  }

  // ---- attachRegistry / masking ----
  {
    const veh: any = { id: "bike_1", plateText: "KAO5HK7548", plateTextGuess: "KA05HK7548" };
    const r = attachRegistry(veh, "motorcycle", V);
    check("RG-21", "attachRegistry replaces the plate, keeps the raw reading and adds owner details",
      !!r && veh.plateText === "KA05HK7548" && veh.plateTextRaw === "KAO5HK7548" && veh.registry?.ownerName === "Himesh" &&
        veh.registry.phoneMasked === "86******33", JSON.stringify(veh));
    const none: any = { id: "bike_2", plateText: "JASH7972" };
    check("RG-22", "attachRegistry leaves an unmatched vehicle untouched",
      attachRegistry(none, "motorcycle", V) === null && none.plateText === "JASH7972" && none.registry === undefined);
  }
  delete process.env.SHOW_FULL_PHONE;
  check("RG-23", "phone numbers are masked by default", maskPhone("8660218933") === "86******33" && maskPhone("") === "" && maskPhone("123") === "***");
  process.env.SHOW_FULL_PHONE = "true";
  check("RG-24", "SHOW_FULL_PHONE=true shows the full number", maskPhone("8660218933") === "8660218933");
  delete process.env.SHOW_FULL_PHONE;

  // ---- database layer (isolated temp folder) ----
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "registry-db-"));
  const originalCwd = process.cwd();
  process.chdir(tmp);
  try {
    // an OLD database (no owner columns, no vehicles table) that already contains a challan
    fs.mkdirSync(path.join(tmp, "data"));
    const { DatabaseSync } = await import("node:sqlite");
    const old = new DatabaseSync(path.join(tmp, "data", "challans.db"));
    old.exec(`CREATE TABLE challans (
      challan_id TEXT PRIMARY KEY, vehicle_id TEXT NOT NULL, vehicle_type TEXT NOT NULL, plate_number TEXT NOT NULL DEFAULT '',
      violations TEXT NOT NULL, line_items TEXT NOT NULL, total_fine INTEGER NOT NULL, status TEXT NOT NULL,
      evidence_image TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    old.prepare(`INSERT INTO challans VALUES ('CH-OLD-0001','bike_1','motorcycle','KA05OLD0001','["No Helmet"]','[]',1000,'issued',NULL,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z')`).run();
    old.close();

    const db = await import("../db");
    const oldRec = db.getChallanById("CH-OLD-0001");
    check("RG-25", "an old database is upgraded in place and the existing challan survives",
      !!oldRec && oldRec.plateNumber === "KA05OLD0001" && oldRec.ownerName === undefined);

    db.replaceVehicles(V);
    check("RG-26", "registry table round-trips every vehicle", db.listVehicles().length === V.length &&
      db.listVehicles().find((v) => v.plate === "KA05MX9581")?.ownerName === "Himesh S");
    db.replaceVehicles(V.slice(0, 3));
    check("RG-27", "replaceVehicles replaces (does not append)", db.listVehicles().length === 3);

    const now = new Date().toISOString();
    db.insertChallan({
      challanId: "CH-TEST-0001", vehicleId: "car_1", vehicleType: "car", plateNumber: "KA05MX9581", violations: ["No Seat Belt"],
      totalFine: 1000, lineItems: [{ violation: "No Seat Belt", fineAmount: 1000, section: "194B(1)" } as any], status: "issued",
      timestamp: now, updatedAt: now, ownerName: "Himesh S", ownerPhone: "8660218933", vehicleModel: "Hyundai Creta", vehicleLabel: "Car", registryMatch: "exact",
    });
    const stored = db.getChallanById("CH-TEST-0001");
    check("RG-28", "a challan stores and returns its owner details",
      stored?.ownerName === "Himesh S" && stored.ownerPhone === "8660218933" && stored.vehicleModel === "Hyundai Creta" && stored.registryMatch === "exact");

    const keep = db.updateChallan("CH-TEST-0001", { status: "paid" });
    check("RG-29", "updating status keeps the owner details", keep?.status === "paid" && keep.ownerName === "Himesh S");
    const swapped = db.updateChallan("CH-TEST-0001", {
      plateNumber: "KA05MA9111",
      owner: { ownerName: "Sanjay", ownerPhone: "8660218933", vehicleModel: "Hyundai Santro", vehicleLabel: "Car", registryMatch: "exact" },
    });
    check("RG-30", "a corrected plate replaces the owner details", swapped?.plateNumber === "KA05MA9111" && swapped.ownerName === "Sanjay");
    const cleared = db.updateChallan("CH-TEST-0001", { plateNumber: "UNKNOWN123", owner: null });
    check("RG-31", "an unregistered plate clears the owner details",
      cleared?.ownerName === undefined && cleared?.ownerPhone === undefined && db.getChallanById("CH-TEST-0001")?.registryMatch === undefined);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(`\n${passed}/${passed + failed} passed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("TEST RUN CRASHED:", e);
  process.exit(1);
});
