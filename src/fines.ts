import { FineRule } from "./types";

/**
 * Reference fine schedule loosely based on the amounts commonly cited under
 * India's Motor Vehicles (Amendment) Act, 2019.
 *
 * IMPORTANT FOR YOUR REPORT/VIVA: actual fine amounts are notified separately
 * by each state government and change over time, so treat these as
 * representative demo values. Verify current figures with your project guide
 * or your state's official RTO circular before quoting them as fact, and
 * adjust FINE_SCHEDULE below if your team wants different figures.
 */
export const FINE_SCHEDULE: Record<string, FineRule> = {
  "No Helmet": {
    violation: "No Helmet",
    fineAmount: 1000,
    section: "Motor Vehicles Act, Sec. 194D",
  },
  "Triple Riding": {
    violation: "Triple Riding",
    fineAmount: 1000,
    section: "Motor Vehicles Act, Sec. 194C",
  },
  "No Seat Belt": {
    violation: "No Seat Belt",
    fineAmount: 1000,
    section: "Motor Vehicles Act, Sec. 194B(1)",
  },
  "No Rearview Mirror": {
    violation: "No Rearview Mirror",
    fineAmount: 500,
    section: "Motor Vehicles Act, Sec. 190(2)",
  },
};

/**
 * Turns a list of violation-tag strings (e.g. from getBikeViolation()) into
 * de-duplicated fine line items plus a grand total, ignoring any unknown tag
 * such as "No Violation".
 */
export function computeFine(violations: string[]): { total: number; lineItems: FineRule[] } {
  const seen = new Set<string>();
  const lineItems: FineRule[] = [];
  let total = 0;

  for (const raw of violations) {
    // Allow combined tags like "Triple Riding + No Helmet" to be split and priced individually
    const parts = raw.split("+").map((p) => p.trim());
    for (const v of parts) {
      if (seen.has(v)) continue;
      const rule = FINE_SCHEDULE[v];
      if (!rule) continue;
      seen.add(v);
      lineItems.push(rule);
      total += rule.fineAmount;
    }
  }

  return { total, lineItems };
}

/** Derives the same violation tags Analyzer.tsx already computes for motorcycles. */
export function deriveBikeViolations(
  ridersCount: number,
  missingHelmetCount: number,
  hasRearviewMirror?: boolean
): string[] {
  const tags: string[] = [];
  if (ridersCount > 2) tags.push("Triple Riding");
  if (missingHelmetCount > 0) tags.push("No Helmet");
  if (hasRearviewMirror === false) tags.push("No Rearview Mirror");
  return tags;
}

/** Derives violation tags for cars (seat belt only, for now). */
export function deriveCarViolations(unbeltedCount: number): string[] {
  return unbeltedCount > 0 ? ["No Seat Belt"] : [];
}
