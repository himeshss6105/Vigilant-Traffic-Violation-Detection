import PDFDocument from "pdfkit";
import { ChallanRecord } from "../src/types";

/**
 * Renders a ChallanRecord into an A5 PDF "bill" containing the plate number,
 * each violation with its fine amount and statutory section, the total fine,
 * and an optional embedded evidence snapshot. Returns the PDF as a Buffer so
 * the caller (server.ts) can send it straight over HTTP.
 */
export function generateChallanPdf(record: ChallanRecord, evidenceImageBuffer?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A5", margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc
        .fontSize(16)
        .fillColor("#1e293b")
        .text("E-CHALLAN / TRAFFIC VIOLATION NOTICE", { align: "center" })
        .moveDown(0.3);

      doc
        .fontSize(9)
        .fillColor("#64748b")
        .text("Vigilant Traffic Violation Detection System", { align: "center" })
        .moveDown(1);

      doc
        .moveTo(40, doc.y)
        .lineTo(doc.page.width - 40, doc.y)
        .strokeColor("#cbd5e1")
        .stroke();
      doc.moveDown(1);

      doc.fontSize(11).fillColor("#0f172a");
      doc.text(`Challan ID: ${record.challanId}`);
      doc.text(`Date / Time: ${new Date(record.timestamp).toLocaleString()}`);
      doc.text(`Vehicle Type: ${record.vehicleType.toUpperCase()}`);
      doc.text(`Number Plate: ${record.plateNumber || "NOT DETECTED - MANUAL REVIEW REQUIRED"}`);
      doc.moveDown(1);

      doc.fontSize(12).fillColor("#0f172a").text("Violations Detected:", { underline: true });
      doc.moveDown(0.4);

      if (record.lineItems.length === 0) {
        doc.fontSize(10).fillColor("#64748b").text("No billable violations were recorded for this vehicle.");
      } else {
        record.lineItems.forEach((item) => {
          const rowY = doc.y;
          doc
            .fontSize(10)
            .fillColor("#0f172a")
            .text(`- ${item.violation}  (${item.section})`, 40, rowY, { width: 300 });
          doc
            .fontSize(10)
            .fillColor("#dc2626")
            .text(`Rs. ${item.fineAmount}`, 40, rowY, { width: doc.page.width - 80, align: "right" });
          doc.moveDown(0.3);
        });
      }

      doc.moveDown(0.8);
      doc
        .moveTo(40, doc.y)
        .lineTo(doc.page.width - 40, doc.y)
        .strokeColor("#cbd5e1")
        .stroke();
      doc.moveDown(0.5);

      doc
        .fontSize(13)
        .fillColor("#0f172a")
        .text(`TOTAL FINE PAYABLE: Rs. ${record.totalFine}`, { align: "right" });

      if (evidenceImageBuffer) {
        doc.moveDown(1.2);
        doc.fontSize(9).fillColor("#64748b").text("Evidence Snapshot:");
        doc.moveDown(0.3);
        try {
          doc.image(evidenceImageBuffer, { fit: [350, 220], align: "center" });
        } catch (imgErr) {
          // Never let a bad/unsupported image format break the whole PDF
          console.error("[Challan] Could not embed evidence image:", (imgErr as Error).message);
        }
      }

      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor("#94a3b8")
        .text(
          "This is a system-generated demonstration challan produced for academic project evaluation and does not constitute an actual legal or payable notice.",
          { align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/** Builds a short, unique, human-readable challan ID. */
export function generateChallanId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CH-${ts}-${rand}`;
}
