import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { detectPlateText } from "./server-lib/ocr";
import { generateChallanPdf, generateChallanId } from "./server-lib/challan";
import { insertChallan, listChallans, getChallanById, updateChallan, deleteChallan } from "./server-lib/db";
import { computeFine } from "./src/fines";
import { ChallanRequest, ChallanRecord, ChallanUpdateRequest } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parser with a generous limit for base64 images
app.use(express.json({ limit: "10mb" }));

// Helper to initialize Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add your Gemini API Key in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Fallback/Simulated computer vision data for presets in case Gemini is unavailable or key is missing
const PRESET_SIMULATIONS: Record<string, any> = {
  preset_motorcycles: {
    motorcycles: [
      {
        id: "bike_101",
        box: [350, 120, 850, 420], // [ymin, xmin, ymax, xmax]
        confidence: 0.94,
        hasRearviewMirror: true,
        plateText: "KA01AB1234",
        plateConfidence: 0.9,
        riders: [
          {
            box: [280, 200, 520, 310],
            hasHelmet: true,
            confidence: 0.91
          },
          {
            box: [310, 260, 500, 360],
            hasHelmet: false,
            confidence: 0.88
          }
        ]
      },
      {
        id: "bike_102",
        box: [400, 500, 920, 950],
        confidence: 0.96,
        hasRearviewMirror: false,
        plateText: "MH12CD5678",
        plateConfidence: 0.87,
        riders: [
          {
            box: [320, 560, 560, 680],
            hasHelmet: false,
            confidence: 0.93
          },
          {
            box: [360, 690, 580, 790],
            hasHelmet: false,
            confidence: 0.89
          },
          {
            box: [410, 780, 620, 880],
            hasHelmet: false,
            confidence: 0.85
          }
        ]
      }
    ],
    cars: [
      {
        id: "car_201",
        box: [200, 20, 450, 190],
        confidence: 0.88,
        windshieldBox: [240, 50, 320, 160],
        plateText: "DL08EF9012",
        plateConfidence: 0.92,
        occupants: [
          {
            box: [250, 60, 315, 110],
            wearingSeatbelt: true,
            role: "driver",
            confidence: 0.92
          }
        ]
      }
    ],
    unassociatedPersons: []
  },
  preset_cars: {
    motorcycles: [],
    cars: [
      {
        id: "car_301",
        box: [150, 100, 750, 900],
        confidence: 0.98,
        windshieldBox: [220, 220, 480, 780],
        plateText: "TN22GH3456",
        plateConfidence: 0.85,
        occupants: [
          {
            box: [280, 260, 470, 460],
            wearingSeatbelt: true,
            role: "driver",
            confidence: 0.95
          },
          {
            box: [290, 520, 460, 710],
            wearingSeatbelt: false,
            role: "passenger",
            confidence: 0.91
          }
        ]
      }
    ],
    unassociatedPersons: []
  }
};

// API Endpoint for AI Traffic Video/Image Analysis
app.post("/api/analyze", async (req: express.Request, res: express.Response) => {
  const { imageBase64, presetId } = req.body;

  // Use pre-simulated outputs for presets if API Key is not set
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyMissing = !apiKey || apiKey === "MY_GEMINI_API_KEY";

  if (isKeyMissing && presetId && PRESET_SIMULATIONS[presetId]) {
    console.log(`[CV Engine] Running mock simulation for preset: ${presetId} (API Key not configured)`);
    // Add artificial delay to simulate real computer vision latency
    await new Promise((resolve) => setTimeout(resolve, 800));
    return res.json({
      success: true,
      data: PRESET_SIMULATIONS[presetId],
      isSimulated: true,
    });
  }

  if (!imageBase64 && presetId && PRESET_SIMULATIONS[presetId]) {
    // If we have API key but no base64 was sent, we might be analyzing a preset.
    // However, since we don't have the preset's actual image data on disk, let's use the simulation data
    return res.json({
      success: true,
      data: PRESET_SIMULATIONS[presetId],
      isSimulated: true,
    });
  }

  if (!imageBase64) {
    return res.status(400).json({ success: false, error: "Missing imageBase64 parameter." });
  }

  try {
    const ai = getGeminiClient();

    // Strip out base64 prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const systemInstruction = `
      You are a state-of-the-art computer vision system representing a Two-Stage YOLO-based Traffic Safety Compliance & Violation Detection pipeline.
      Analyze the provided traffic image and identify vehicles, safety gear, occupants, and potential infractions.

      Stage 1: Vehicle and Occupant Localization
      - Locate all motorcycles and cars visible.
      - For each motorcycle, isolate its bounding box.
      - For each car, isolate its bounding box and the windshield Region of Interest (ROI).
      - For each motorcycle and car, also isolate the tight bounding box around its visible number/license plate, if any part of it is visible. This box must hug the plate as closely as possible since it will be cropped out separately for character recognition.

      Stage 2: Feature Extraction and Violation Checking
      - For each motorcycle:
        1. Locate and count ALL riders sitting on it (both driver/rider and pillion riders).
        2. For each person, detect if they are wearing a helmet or not.
        3. Inspect the handlebar area on both sides of the motorcycle and determine if at least one rearview mirror is fitted. Flag as a violation if both mirrors are missing or removed.
      - For each car:
        1. Inside the windshield area, identify the occupants (driver and front co-passenger).
        2. Detect if each occupant is wearing a seat belt (diagonal strap across chest/shoulder).

      Coordinate System:
      - Coordinate values MUST be integers ranging from 0 to 1000.
      - Format bounding boxes as [ymin, xmin, ymax, xmax] relative to the overall image dimensions (0 to 1000).
      - Be as physically accurate as possible. Double check that helmets are on top of riders, and riders are overlapping the motorcycles.
    `;

    const prompt = "Analyze this traffic monitoring CCTV frame. Detect motorcycles, cars, riders, helmets, and seat belts.";

    console.log("[CV Engine] Dispatching request to Gemini model 'gemini-3.5-flash'...");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64,
          },
        },
        { text: prompt },
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // low temperature for precise factual extraction
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            motorcycles: {
              type: Type.ARRAY,
              description: "List of detected motorcycles",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique string ID, e.g. bike_1" },
                  box: {
                    type: Type.ARRAY,
                    description: "Motorcycle bounding box [ymin, xmin, ymax, xmax]",
                    items: { type: Type.INTEGER }
                  },
                  confidence: { type: Type.NUMBER, description: "Confidence score 0 to 1" },
                  hasRearviewMirror: { type: Type.BOOLEAN, description: "True if at least one rearview mirror is visibly fitted on the handlebar, False if both are missing/removed" },
                  plateBox: {
                    type: Type.ARRAY,
                    description: "Tight license plate bounding box [ymin, xmin, ymax, xmax], omitted if no plate is visible",
                    items: { type: Type.INTEGER }
                  },
                  riders: {
                    type: Type.ARRAY,
                    description: "Persons riding this motorcycle",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        box: {
                          type: Type.ARRAY,
                          description: "Rider bounding box [ymin, xmin, ymax, xmax]",
                          items: { type: Type.INTEGER }
                        },
                        hasHelmet: { type: Type.BOOLEAN, description: "True if wearing helmet, False if no helmet" },
                        confidence: { type: Type.NUMBER, description: "Detection confidence" }
                      },
                      required: ["box", "hasHelmet"]
                    }
                  }
                },
                required: ["id", "box", "riders"]
              }
            },
            cars: {
              type: Type.ARRAY,
              description: "List of detected cars",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique string ID, e.g. car_1" },
                  box: {
                    type: Type.ARRAY,
                    description: "Car bounding box [ymin, xmin, ymax, xmax]",
                    items: { type: Type.INTEGER }
                  },
                  confidence: { type: Type.NUMBER, description: "Confidence score" },
                  windshieldBox: {
                    type: Type.ARRAY,
                    description: "Windshield ROI box [ymin, xmin, ymax, xmax]",
                    items: { type: Type.INTEGER }
                  },
                  plateBox: {
                    type: Type.ARRAY,
                    description: "Tight license plate bounding box [ymin, xmin, ymax, xmax], omitted if no plate is visible",
                    items: { type: Type.INTEGER }
                  },
                  occupants: {
                    type: Type.ARRAY,
                    description: "Occupants visible inside windshield",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        box: {
                          type: Type.ARRAY,
                          description: "Occupant bounding box [ymin, xmin, ymax, xmax]",
                          items: { type: Type.INTEGER }
                        },
                        wearingSeatbelt: { type: Type.BOOLEAN, description: "True if wearing diagonal seat belt strap" },
                        role: { type: Type.STRING, description: "Role: 'driver' or 'passenger'" },
                        confidence: { type: Type.NUMBER }
                      },
                      required: ["box", "wearingSeatbelt", "role"]
                    }
                  }
                },
                required: ["id", "box", "occupants"]
              }
            },
            unassociatedPersons: {
              type: Type.ARRAY,
              description: "Pedestrians or other persons in the scene not on bikes/cars",
              items: {
                type: Type.OBJECT,
                properties: {
                  box: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                  role: { type: Type.STRING, description: "e.g., 'pedestrian'" }
                },
                required: ["box"]
              }
            }
          },
          required: ["motorcycles", "cars"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("No output text received from Gemini API.");
    }

    const parsedData = JSON.parse(textResult.trim());
    console.log("[CV Engine] Successfully parsed AI computer vision response!");

    // Stage 3: real OCR. Gemini only localizes the plate region (Stage 1/2 above);
    // the actual character recognition is done here with sharp (crop/preprocess)
    // + tesseract.js (OCR) on the original uploaded image, not by asking the LLM
    // to "read" the text.
    const imageBuffer = Buffer.from(cleanBase64, "base64");

    const vehicles: any[] = [
      ...(parsedData.motorcycles || []),
      ...(parsedData.cars || []),
    ];

    await Promise.all(
      vehicles.map(async (vehicle) => {
        if (!Array.isArray(vehicle.plateBox) || vehicle.plateBox.length !== 4) return;
        const ocrResult = await detectPlateText(imageBuffer, vehicle.plateBox as [number, number, number, number]);
        if (ocrResult) {
          vehicle.plateText = ocrResult.text;
          vehicle.plateConfidence = ocrResult.confidence;
        }
      })
    );

    return res.json({
      success: true,
      data: parsedData,
      isSimulated: false,
    });
  } catch (error: any) {
    console.error("[CV Engine] Error analyzing image:", error.message || error);
    // Return friendly error with fallbacks
    return res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during AI computer vision processing.",
      details: "You can continue testing with presets or verify your API key in Secrets.",
    });
  }
});

// API Endpoint: computes the fine for a vehicle's violations and SAVES the
// challan to the database. Deliberately does NOT return a PDF - issuing a
// challan just records it; the PDF is generated on demand later (see the
// /pdf route below) from the Challan Records page.
app.post("/api/challans", async (req: express.Request, res: express.Response) => {
  try {
    const { vehicleId, vehicleType, plateText, violations, evidenceImageBase64 } = req.body as ChallanRequest;

    if (!vehicleId || !vehicleType || !Array.isArray(violations)) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: vehicleId, vehicleType, violations[].",
      });
    }

    const { total, lineItems } = computeFine(violations);

    if (lineItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No billable violations were found for this vehicle; nothing to challan.",
      });
    }

    const now = new Date().toISOString();
    const record: ChallanRecord = {
      challanId: generateChallanId(),
      vehicleId,
      vehicleType,
      plateNumber: (plateText || "").trim(),
      violations,
      totalFine: total,
      lineItems,
      status: "issued",
      timestamp: now,
      updatedAt: now,
      evidenceImageBase64: evidenceImageBase64 || undefined,
    };

    insertChallan(record);

    return res.status(201).json({ success: true, challan: record });
  } catch (error: any) {
    console.error("[Challan Engine] Error issuing challan:", error.message || error);
    return res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred while issuing the challan.",
    });
  }
});

// API Endpoint: list all saved challans, most recent first
app.get("/api/challans", (_req: express.Request, res: express.Response) => {
  try {
    return res.json({ success: true, challans: listChallans() });
  } catch (error: any) {
    console.error("[Challan Engine] Error listing challans:", error.message || error);
    return res.status(500).json({ success: false, error: "Failed to load challan records." });
  }
});

// API Endpoint: fetch a single challan record by id
app.get("/api/challans/:id", (req: express.Request, res: express.Response) => {
  const record = getChallanById(req.params.id);
  if (!record) return res.status(404).json({ success: false, error: "Challan not found." });
  return res.json({ success: true, challan: record });
});

// API Endpoint: edit a saved challan (correct a misread plate, adjust
// violations, or change status). If violations[] is provided, the fine is
// recomputed from the current fine schedule rather than trusted from the client.
app.put("/api/challans/:id", (req: express.Request, res: express.Response) => {
  try {
    const existing = getChallanById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: "Challan not found." });

    const body = req.body as ChallanUpdateRequest;
    const updates: Parameters<typeof updateChallan>[1] = {};

    if (typeof body.plateNumber === "string") updates.plateNumber = body.plateNumber.trim();
    if (body.status) updates.status = body.status;

    if (Array.isArray(body.violations)) {
      const { total, lineItems } = computeFine(body.violations);
      if (lineItems.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No billable violations in the updated list; a challan needs at least one.",
        });
      }
      updates.violations = body.violations;
      updates.lineItems = lineItems;
      updates.totalFine = total;
    }

    const updated = updateChallan(req.params.id, updates);
    return res.json({ success: true, challan: updated });
  } catch (error: any) {
    console.error("[Challan Engine] Error updating challan:", error.message || error);
    return res.status(500).json({ success: false, error: "Failed to update challan." });
  }
});

// API Endpoint: delete/void a saved challan
app.delete("/api/challans/:id", (req: express.Request, res: express.Response) => {
  const deleted = deleteChallan(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: "Challan not found." });
  return res.json({ success: true });
});

// API Endpoint: generate the PDF for a saved challan, on demand
app.get("/api/challans/:id/pdf", async (req: express.Request, res: express.Response) => {
  try {
    const record = getChallanById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: "Challan not found." });

    let evidenceBuffer: Buffer | undefined;
    if (record.evidenceImageBase64) {
      const clean = record.evidenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
      evidenceBuffer = Buffer.from(clean, "base64");
    }

    const pdfBuffer = await generateChallanPdf(record, evidenceBuffer);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${record.challanId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error("[Challan Engine] Error generating PDF:", error.message || error);
    return res.status(500).json({ success: false, error: "Failed to generate the challan PDF." });
  }
});

// Configure Vite or Static Files
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Mounting Vite developer middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Serving production static files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Server listening on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
