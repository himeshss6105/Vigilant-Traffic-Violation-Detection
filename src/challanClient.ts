export interface IssueChallanParams {
  vehicleId: string;
  vehicleType: "motorcycle" | "car";
  plateText?: string;
  violations: string[];
  evidenceImageBase64?: string;
}

export interface IssueChallanResult {
  success: boolean;
  challanId?: string;
  error?: string;
}

/**
 * Saves a challan to the server-side database. Deliberately does NOT
 * download anything - issuing just records it. Use the Challan Records page
 * (or GET /api/challans/:id/pdf) to view or download it afterwards.
 */
export async function issueChallan(params: IssueChallanParams): Promise<IssueChallanResult> {
  try {
    const response = await fetch("/api/challans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId: params.vehicleId,
        vehicleType: params.vehicleType,
        plateText: params.plateText || "",
        violations: params.violations,
        evidenceImageBase64: params.evidenceImageBase64,
      }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok || !body.success) {
      return { success: false, error: body.error || "Failed to issue the challan." };
    }

    return { success: true, challanId: body.challan?.challanId };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error while issuing the challan." };
  }
}
