import React, { useState, useEffect, useRef } from "react";
import { LogEntry, DetectionResult, BoundingBox } from "../types";
import { deriveBikeViolations, deriveCarViolations } from "../fines";
import { issueChallan } from "../challanClient";
import { 
  Play, 
  Pause, 
  FileCheck, 
  RotateCcw, 
  PlusCircle, 
  ShieldAlert, 
  Camera,
  Upload,
  X,
  Loader2,
  ScanLine,
  Receipt,
  CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Shape of the simulated vehicles animated across the mock CCTV canvas.
// riders/helmet apply to motorcycles, seatbelt applies to cars; both kept
// optional since a single vehicle can flip type as it loops back on-screen.
type SimVehicle = {
  id: string;
  type: "motorcycle" | "car";
  x: number;
  y: number;
  speed: number;
  confidence: number;
  width: number;
  height: number;
  tag: string;
  riders?: number;
  helmet?: boolean;
  seatbelt?: boolean;
};

export default function Dashboard() {
  // 'live' = the original simulated/preloaded CCTV animation (primary/default view).
  // 'upload' = a real photo attached by the user, run through the actual
  // Gemini + OCR analysis pipeline (same endpoint the AI Playroom tab uses).
  const [mode, setMode] = useState<"live" | "upload">("live");

  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1); // 1x or 2x
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    checked: 1420,
    clean: 1148,
    helmetViolations: 164,
    tripleRiding: 46,
    seatbeltViolations: 62,
  });

  const [activeCam, setActiveCam] = useState("Cam-04: North Crossing");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Attach Image mode state ---
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [realAnalysis, setRealAnalysis] = useState<DetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [issuedChallans, setIssuedChallans] = useState<Record<string, string>>({});
  const [issuingId, setIssuingId] = useState<string | null>(null);

  // Simulated traffic assets that move across the screen
  const [vehicles, setVehicles] = useState<SimVehicle[]>([
    { id: "motorcycle_1", type: "motorcycle", x: 100, y: 150, speed: 2, riders: 2, helmet: false, tag: "No Helmet", confidence: 0.94, width: 60, height: 80 },
    { id: "car_1", type: "car", x: 450, y: 220, speed: 1.5, seatbelt: true, tag: "No Violation", confidence: 0.98, width: 120, height: 90 },
    { id: "motorcycle_2", type: "motorcycle", x: 250, y: 50, speed: 2.5, riders: 3, helmet: true, tag: "Triple Riding", confidence: 0.91, width: 60, height: 80 },
    { id: "car_2", type: "car", x: 700, y: 180, speed: 1.2, seatbelt: false, tag: "No Seat Belt", confidence: 0.95, width: 120, height: 90 }
  ]);

  // Handle vehicle movement on canvas (live/simulated mode only)
  useEffect(() => {
    if (!isPlaying || mode !== "live") return;

    const interval = setInterval(() => {
      setVehicles((prev) =>
        prev.map((v) => {
          let newX = v.x + v.speed * simulationSpeed;
          // Loop vehicles back around once they pass the width
          if (newX > 850) {
            newX = -100;
            // Randomly flip compliance variables when re-entering to make the sim dynamic
            const randomType = Math.random() > 0.5 ? "motorcycle" : "car";
            if (randomType === "motorcycle") {
              const numRiders = Math.random() > 0.7 ? 3 : Math.random() > 0.3 ? 2 : 1;
              const hasHelmet = Math.random() > 0.4;
              let violationTag: 'No Violation' | 'No Helmet' | 'Triple Riding' | 'Triple Riding + No Helmet' = 'No Violation';
              if (numRiders > 2 && !hasHelmet) {
                violationTag = "Triple Riding + No Helmet";
              } else if (numRiders > 2) {
                violationTag = "Triple Riding";
              } else if (!hasHelmet) {
                violationTag = "No Helmet";
              }

              // Trigger Log entry for re-entering violation
              if (violationTag !== "No Violation") {
                triggerLog("motorcycle", violationTag, `Bike ${v.id.substring(0,6)} detected: ${numRiders} occupants, Helmet: ${hasHelmet ? "YES" : "NO"}`);
              }

              return {
                ...v,
                type: "motorcycle",
                x: newX,
                riders: numRiders,
                helmet: hasHelmet,
                tag: violationTag,
                confidence: Number((0.85 + Math.random() * 0.14).toFixed(2))
              };
            } else {
              const hasSeatbelt = Math.random() > 0.4;
              const tagStr = hasSeatbelt ? "No Violation" : "No Seat Belt";
              
              if (!hasSeatbelt) {
                triggerLog("car", "No Seat Belt", `Car ${v.id.substring(0,4)} windshield check: Front occupant seatbelt not secured.`);
              }

              return {
                ...v,
                type: "car",
                x: newX,
                seatbelt: hasSeatbelt,
                tag: tagStr,
                confidence: Number((0.88 + Math.random() * 0.11).toFixed(2))
              };
            }
          }
          return { ...v, x: newX };
        })
      );
    }, 30);

    return () => clearInterval(interval);
  }, [isPlaying, simulationSpeed, mode]);

  // Function to register a log in the list
  const triggerLog = (
    vehicleType: 'motorcycle' | 'car', 
    violationType: LogEntry['violationType'], 
    details: string
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      vehicleType,
      violationType,
      details,
      confidence: Number((0.85 + Math.random() * 0.14).toFixed(2))
    };

    setLogs((prev) => [newLog, ...prev.slice(0, 19)]); // keep last 20 logs

    // Update stats counters
    setStats((prev) => {
      const isHelmet = violationType === "No Helmet" || violationType === "Triple Riding + No Helmet";
      const isTriple = violationType === "Triple Riding" || violationType === "Triple Riding + No Helmet";
      const isSeatbelt = violationType === "No Seat Belt";

      return {
        checked: prev.checked + 1,
        clean: prev.clean + (violationType === "No Violation" ? 1 : 0),
        helmetViolations: prev.helmetViolations + (isHelmet ? 1 : 0),
        tripleRiding: prev.tripleRiding + (isTriple ? 1 : 0),
        seatbeltViolations: prev.seatbeltViolations + (isSeatbelt ? 1 : 0)
      };
    });
  };

  // Canvas Drawing Logic (live/simulated mode only)
  useEffect(() => {
    if (mode !== "live") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and draw roadway backdrop
    ctx.fillStyle = "#0f172a"; // dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw road markings
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 3);
    ctx.lineTo(canvas.width, canvas.height / 3);
    ctx.moveTo(0, (2 * canvas.height) / 3);
    ctx.lineTo(canvas.width, (2 * canvas.height) / 3);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw active surveillance camera overlays
    ctx.strokeStyle = "rgba(79, 70, 229, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Draw scanner overlay lines
    if (isPlaying) {
      const scanY = (Date.now() / 25) % canvas.height;
      ctx.strokeStyle = "rgba(79, 70, 229, 0.15)";
      ctx.beginPath();
      ctx.moveTo(10, scanY);
      ctx.lineTo(canvas.width - 10, scanY);
      ctx.stroke();
    }

    // Draw Vehicles with YOLO Bounding Boxes
    vehicles.forEach((vehicle) => {
      const isViolation = vehicle.tag !== "No Violation";
      const mainColor = isViolation ? "#ef4444" : "#10b981"; // Red if violating, Green if safe

      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 2.5;

      // Outer Bounding Box
      ctx.strokeRect(vehicle.x, vehicle.y, vehicle.width, vehicle.height);

      // Label background
      ctx.fillStyle = mainColor;
      ctx.fillRect(vehicle.x - 1, vehicle.y - 20, vehicle.width + 2, 20);

      // Label text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px monospace";
      ctx.fillText(
        `${vehicle.type.toUpperCase()} • ${Math.round(vehicle.confidence * 100)}%`,
        vehicle.x + 4,
        vehicle.y - 7
      );

      // Inner details / sub-crops
      if (vehicle.type === "motorcycle") {
        // Draw Stage 2: Head crops for helmets
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 1;

        // Draw circles for heads of riders
        const riderCount = vehicle.riders ?? 0;
        for (let i = 0; i < riderCount; i++) {
          const headX = vehicle.x + vehicle.width / 2 + (i - (riderCount - 1) / 2) * 12;
          const headY = vehicle.y + 12;

          ctx.beginPath();
          ctx.arc(headX, headY, 6, 0, Math.PI * 2);
          ctx.stroke();

          // Color coded dot for helmet usage
          ctx.fillStyle = vehicle.helmet ? "#10b981" : "#ef4444";
          ctx.beginPath();
          ctx.arc(headX, headY, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw sub-tag indicator
        ctx.fillStyle = isViolation ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)";
        ctx.fillRect(vehicle.x + 2, vehicle.y + vehicle.height - 18, vehicle.width - 4, 15);
        ctx.fillStyle = isViolation ? "#fee2e2" : "#ecfdf5";
        ctx.font = "8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(vehicle.tag, vehicle.x + vehicle.width / 2, vehicle.y + vehicle.height - 8);
        ctx.textAlign = "left";
      } else if (vehicle.type === "car") {
        // Draw Stage 2: Windshield ROI Box
        const winX = vehicle.x + 15;
        const winY = vehicle.y + 10;
        const winW = vehicle.width - 30;
        const winH = 30;

        ctx.strokeStyle = "#38bdf8"; // Light Blue for Windshield ROI
        ctx.lineWidth = 1;
        ctx.strokeRect(winX, winY, winW, winH);

        // Draw seatbelt diagonal indicator inside windshield
        if (vehicle.seatbelt) {
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(winX + 10, winY + 5);
          ctx.lineTo(winX + 25, winY + 25);
          ctx.stroke();
        } else {
          // Draw warning sign inside windshield
          ctx.fillStyle = "#ef4444";
          ctx.font = "8px sans-serif";
          ctx.fillText("⚠️ NO BELT", winX + 8, winY + 18);
        }

        // Sub-tag compliance banner
        ctx.fillStyle = isViolation ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)";
        ctx.fillRect(vehicle.x + 2, vehicle.y + vehicle.height - 18, vehicle.width - 4, 15);
        ctx.fillStyle = isViolation ? "#fee2e2" : "#ecfdf5";
        ctx.font = "8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(vehicle.tag, vehicle.x + vehicle.width / 2, vehicle.y + vehicle.height - 8);
        ctx.textAlign = "left";
      }
    });

    // Draw CCTV Text Overlay details
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "10px monospace";
    ctx.fillText(`CCTV FEED: ${activeCam}`, 25, 35);
    ctx.fillText(`FRAME TIMESTEP: ${new Date().toLocaleTimeString()} [30 FPS]`, 25, 48);

  }, [vehicles, isPlaying, activeCam, mode]);

  // Canvas drawing logic for Attach Image mode: draws the real uploaded
  // photo (letterboxed to fit) and, once analysis returns, real bounding
  // boxes converted from the API's 0-1000 normalized coordinates.
  useEffect(() => {
    if (mode !== "upload" || !uploadedImageSrc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const offsetX = (canvas.width - drawWidth) / 2;
      const offsetY = (canvas.height - drawHeight) / 2;

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      const toPixelBox = (box: BoundingBox) => {
        const [ymin, xmin, ymax, xmax] = box;
        return {
          x: offsetX + (xmin / 1000) * drawWidth,
          y: offsetY + (ymin / 1000) * drawHeight,
          w: ((xmax - xmin) / 1000) * drawWidth,
          h: ((ymax - ymin) / 1000) * drawHeight,
        };
      };

      const drawEntity = (box: BoundingBox, label: string, isViolation: boolean) => {
        const { x, y, w, h } = toPixelBox(box);
        const color = isViolation ? "#ef4444" : "#10b981";
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        ctx.font = "bold 9px monospace";
        const labelWidth = ctx.measureText(label).width + 8;
        ctx.fillStyle = color;
        ctx.fillRect(x - 1, y - 16, Math.max(labelWidth, 10), 16);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, x + 3, y - 5);
      };

      if (realAnalysis) {
        realAnalysis.motorcycles?.forEach((bike) => {
          const violations = deriveBikeViolations(
            bike.riders?.length ?? 0,
            bike.riders?.filter((r) => !r.hasHelmet).length ?? 0,
            bike.hasRearviewMirror
          );
          const label = `BIKE${bike.plateText ? " • " + bike.plateText : ""}`;
          drawEntity(bike.box, label, violations.length > 0);
        });

        realAnalysis.cars?.forEach((car) => {
          const violations = deriveCarViolations(car.occupants?.filter((o) => !o.wearingSeatbelt).length ?? 0);
          const label = `CAR${car.plateText ? " • " + car.plateText : ""}`;
          drawEntity(car.box, label, violations.length > 0);
        });
      }

      // Overlay label
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "10px monospace";
      ctx.fillText("ATTACHED IMAGE ANALYSIS", 25, canvas.height - 15);
    };
    img.src = uploadedImageSrc;

    return () => {
      cancelled = true;
    };
  }, [mode, uploadedImageSrc, realAnalysis]);

  const toggleSimulation = () => {
    setIsPlaying(!isPlaying);
  };

  const speedUp = () => {
    setSimulationSpeed((prev) => (prev === 1 ? 2 : 1));
  };

  const manualInjectViolation = () => {
    const isBike = Math.random() > 0.5;
    if (isBike) {
      triggerLog("motorcycle", "Triple Riding + No Helmet", "Manual Audit Override: Motorcycle detected with triple riding and helmet bypass.");
    } else {
      triggerLog("car", "No Seat Belt", "Manual Audit Override: Driver identified ignoring seatbelt protection standard.");
    }
  };

  const handleAttachImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setMode("upload");
      setUploadedImageSrc(dataUrl);
      setRealAnalysis(null);
      setIssuedChallans({});
      setAnalyzeError(null);
      setIsAnalyzing(true);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: dataUrl }),
        });
        const body = await res.json();
        if (!res.ok || !body.success) throw new Error(body.error || "Analysis failed.");
        setRealAnalysis(body.data as DetectionResult);
      } catch (err: any) {
        setAnalyzeError(err.message || "Failed to analyze the attached image.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const backToLiveFeed = () => {
    setMode("live");
    setUploadedImageSrc(null);
    setRealAnalysis(null);
    setAnalyzeError(null);
  };

  const handleIssueChallan = async (
    vehicleId: string,
    vehicleType: "motorcycle" | "car",
    plateText: string | undefined,
    violations: string[]
  ) => {
    setIssuingId(vehicleId);
    try {
      const result = await issueChallan({
        vehicleId,
        vehicleType,
        plateText,
        violations,
        evidenceImageBase64: uploadedImageSrc || undefined,
      });
      if (!result.success || !result.challanId) throw new Error(result.error || "Failed to issue the challan.");
      setIssuedChallans((prev) => ({ ...prev, [vehicleId]: result.challanId! }));
    } catch (err: any) {
      setAnalyzeError(err.message || "Failed to issue the challan.");
    } finally {
      setIssuingId(null);
    }
  };

  const totalVehiclesDetected = (realAnalysis?.motorcycles?.length ?? 0) + (realAnalysis?.cars?.length ?? 0);
  const totalPlatesRead =
    (realAnalysis?.motorcycles?.filter((b) => b.plateText).length ?? 0) +
    (realAnalysis?.cars?.filter((c) => c.plateText).length ?? 0);
  const totalViolationsFound =
    (realAnalysis?.motorcycles?.filter(
      (b) => deriveBikeViolations(b.riders?.length ?? 0, b.riders?.filter((r) => !r.hasHelmet).length ?? 0, b.hasRearviewMirror).length > 0
    ).length ?? 0) +
    (realAnalysis?.cars?.filter((c) => deriveCarViolations(c.occupants?.filter((o) => !o.wearingSeatbelt).length ?? 0).length > 0).length ?? 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full" id="surveillance-dashboard">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />

      {/* Left Column + Center: Live Feed and Canvas */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Canvas Monitor Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          {/* Header */}
          <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">CCTV Live Enforcement Engine</span>
            </div>

            <div className="flex gap-2 items-center">
              {mode === "live" ? (
                <>
                  {["Cam-04: North Crossing", "Cam-12: Highway Gantry", "Cam-02: City Terminal"].map((cam) => (
                    <button
                      key={cam}
                      onClick={() => {
                        setActiveCam(cam);
                        triggerLog("motorcycle", "No Violation", `Switched Feed to ${cam}. Initializing Stage-1 segmentation...`);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                        activeCam === cam 
                          ? "bg-indigo-600 text-white border border-indigo-500" 
                          : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-300"
                      }`}
                    >
                      {cam.split(":")[0]}
                    </button>
                  ))}
                  <span className="w-px h-4 bg-slate-800 mx-1" />
                  <button
                    onClick={handleAttachImageClick}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-indigo-400 border border-indigo-900/50 hover:bg-slate-800 transition-all"
                    title="Attach a real photo to analyze instead of the simulated feed"
                  >
                    <Upload className="w-3 h-3" /> Attach Image
                  </button>
                </>
              ) : (
                <>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-400 border border-indigo-800/40">
                    Attached Image (Real Analysis)
                  </span>
                  <button
                    onClick={backToLiveFeed}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 transition-all"
                  >
                    <X className="w-3 h-3" /> Back to Live Feed
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Interactive Canvas Viewport */}
          <div className="relative bg-slate-950 flex items-center justify-center p-4">
            <canvas
              ref={canvasRef}
              width={800}
              height={340}
              className="w-full h-auto aspect-[800/340] rounded-xl border border-slate-800 overflow-hidden"
            />

            {mode === "upload" && isAnalyzing && (
              <div className="absolute inset-4 flex flex-col items-center justify-center gap-2 bg-slate-950/80 rounded-xl">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                <p className="text-xs text-slate-400 font-mono">Running Gemini Vision + OCR pipeline...</p>
              </div>
            )}
            
            {/* Corner UI Brackets */}
            <div className="absolute top-8 left-8 w-4 h-4 border-t-2 border-l-2 border-indigo-500/50 pointer-events-none" />
            <div className="absolute top-8 right-8 w-4 h-4 border-t-2 border-r-2 border-indigo-500/50 pointer-events-none" />
            <div className="absolute bottom-8 left-8 w-4 h-4 border-b-2 border-l-2 border-indigo-500/50 pointer-events-none" />
            <div className="absolute bottom-8 right-8 w-4 h-4 border-b-2 border-r-2 border-indigo-500/50 pointer-events-none" />
          </div>

          {/* Player controls */}
          {mode === "live" ? (
            <div className="bg-slate-950/80 px-5 py-3.5 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSimulation}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                    isPlaying 
                      ? "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950/30" 
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/30"
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isPlaying ? "PAUSE STREAM" : "START STREAM"}
                </button>

                <button
                  onClick={speedUp}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-mono transition-all"
                >
                  SPEED: {simulationSpeed}x
                </button>
              </div>

              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                Surveillance status: {isPlaying ? 'ACTIVE DECODING' : 'SUSPENDED'}
              </span>

              <button
                onClick={manualInjectViolation}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold font-mono transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" /> INJECT TEST infraction
              </button>
            </div>
          ) : (
            <div className="bg-slate-950/80 px-5 py-3.5 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                <ScanLine className="w-3.5 h-3.5 text-indigo-400" />
                {isAnalyzing ? "Analyzing attached image..." : realAnalysis ? "Analysis complete — real detections below" : "Waiting for analysis..."}
              </span>
              <button
                onClick={handleAttachImageClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-mono transition-all"
              >
                <Upload className="w-3.5 h-3.5" /> Attach a different image
              </button>
            </div>
          )}
        </div>

        {/* Aggregate Stats Row */}
        {mode === "live" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">VEHICLES SEGMENTED</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-white">{stats.checked}</span>
                <span className="text-[10px] font-mono text-indigo-400">Total</span>
              </div>
            </div>
            
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">HELMET violations</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-red-400">{stats.helmetViolations}</span>
                <span className="text-[10px] font-mono text-red-500">{(stats.helmetViolations / stats.checked * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">TRIPLE RIDING instances</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-red-400">{stats.tripleRiding}</span>
                <span className="text-[10px] font-mono text-red-500">{(stats.tripleRiding / stats.checked * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">SEAT BELT DEVIATIONS</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-red-400">{stats.seatbeltViolations}</span>
                <span className="text-[10px] font-mono text-red-500">{(stats.seatbeltViolations / stats.checked * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">VEHICLES DETECTED</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-white">{totalVehiclesDetected}</span>
                <span className="text-[10px] font-mono text-indigo-400">This Image</span>
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">VIOLATIONS FOUND</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-red-400">{totalViolationsFound}</span>
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">PLATES READ (OCR)</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-emerald-400">{totalPlatesRead}</span>
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">SOURCE</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-sm font-bold font-display text-slate-300">REAL IMAGE</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Violation Alert Log Terminal (live) or Real Detections (upload) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full overflow-hidden min-h-[450px] lg:min-h-0">
        {mode === "live" ? (
          <>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-slate-200">Enforcement Compliance Log</h3>
              </div>
              <button
                onClick={() => {
                  setLogs([]);
                  setStats({ checked: 0, clean: 0, helmetViolations: 0, tripleRiding: 0, seatbeltViolations: 0 });
                }}
                title="Reset simulation parameters"
                className="p-1 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable alerts list */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-3.5 scrollbar">
              <AnimatePresence initial={false}>
                {logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-10">
                    <FileCheck className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-xs font-mono">No safety violations active on lanes.</p>
                    <p className="text-[10px] text-slate-600 mt-1">Ready for real-time video stream inspection...</p>
                  </div>
                ) : (
                  logs.map((log) => {
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1.5 hover:border-slate-700/60 transition-all"
                      >
                        {/* Log Card Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wide ${
                              log.violationType === "No Violation" 
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800/30" 
                                : "bg-red-950 text-red-400 border border-red-800/30"
                            }`}>
                              {log.violationType}
                            </span>
                            
                            <span className="text-[10px] font-mono text-slate-500">
                              {log.timestamp}
                            </span>
                          </div>
                          
                          <span className="text-[9px] font-mono text-indigo-400 font-bold bg-indigo-950/40 px-1 py-0.5 rounded">
                            CV: {Math.round(log.confidence * 100)}%
                          </span>
                        </div>

                        {/* Log Card details */}
                        <p className="text-xs text-slate-300 leading-normal">
                          {log.details}
                        </p>

                        {/* Sub evidence indicators */}
                        <div className="flex gap-2 text-[9px] font-mono text-slate-500 border-t border-slate-900 pt-1.5">
                          <span>TYPE: {log.vehicleType.toUpperCase()}</span>
                          <span>•</span>
                          <span>STAGE: ROI_EXTRACT_CROP</span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            {/* Small inline Hourly Trend SVG Chart */}
            <div className="border-t border-slate-800 pt-4 mt-4 shrink-0">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-2">Hourly violation rate (CCTV stream)</span>
              <div className="bg-slate-950 border border-slate-800/60 p-2 rounded-lg flex items-end justify-between h-14">
                {[24, 38, 45, 30, 52, 64, 48, 70, 85, 60, 42, 58].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      style={{ height: `${(val / 90) * 32}px` }} 
                      className={`w-2.5 rounded-t-sm transition-all duration-500 ${
                        val > 60 ? "bg-red-500/80" : "bg-indigo-500/80"
                      }`}
                      title={`${val} violations/hr`}
                    />
                    <span className="text-[8px] font-mono text-slate-600">{idx * 2}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-200">Real Detection Results</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-3">
              {isAnalyzing ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <p className="text-xs font-mono">Running Gemini Vision + OCR pipeline...</p>
                </div>
              ) : analyzeError ? (
                <div className="bg-red-950/30 border border-red-800/50 p-3 rounded-xl text-red-400 text-[11px] leading-relaxed">
                  {analyzeError}
                </div>
              ) : !realAnalysis || totalVehiclesDetected === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-10">
                  <FileCheck className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs font-mono">No vehicles detected in this image.</p>
                </div>
              ) : (
                <>
                  {realAnalysis.motorcycles.map((bike) => {
                    const violations = deriveBikeViolations(
                      bike.riders?.length ?? 0,
                      bike.riders?.filter((r) => !r.hasHelmet).length ?? 0,
                      bike.hasRearviewMirror
                    );
                    const isViolation = violations.length > 0;
                    return (
                      <div key={bike.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-300">{bike.id.toUpperCase()} • BIKE</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${isViolation ? "bg-red-950 text-red-400 border border-red-800/30" : "bg-emerald-950 text-emerald-400 border border-emerald-800/30"}`}>
                            {isViolation ? violations.join(" + ") : "No Violation"}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          Plate: <span className={bike.plateText ? "text-slate-300 font-bold" : "text-amber-500"}>{bike.plateText || "Not Detected"}</span>
                        </div>
                        {isViolation && (
                          issuedChallans[bike.id] ? (
                            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Issued: {issuedChallans[bike.id]}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleIssueChallan(bike.id, "motorcycle", bike.plateText, violations)}
                              disabled={issuingId === bike.id}
                              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-all"
                            >
                              <Receipt className="w-3 h-3" /> {issuingId === bike.id ? "Issuing..." : "Issue E-Challan"}
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}

                  {realAnalysis.cars.map((car) => {
                    const violations = deriveCarViolations(car.occupants?.filter((o) => !o.wearingSeatbelt).length ?? 0);
                    const isViolation = violations.length > 0;
                    return (
                      <div key={car.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-300">{car.id.toUpperCase()} • CAR</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${isViolation ? "bg-red-950 text-red-400 border border-red-800/30" : "bg-emerald-950 text-emerald-400 border border-emerald-800/30"}`}>
                            {isViolation ? violations.join(" + ") : "No Violation"}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          Plate: <span className={car.plateText ? "text-slate-300 font-bold" : "text-amber-500"}>{car.plateText || "Not Detected"}</span>
                        </div>
                        {isViolation && (
                          issuedChallans[car.id] ? (
                            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Issued: {issuedChallans[car.id]}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleIssueChallan(car.id, "car", car.plateText, violations)}
                              disabled={issuingId === car.id}
                              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-all"
                            >
                              <Receipt className="w-3 h-3" /> {issuingId === car.id ? "Issuing..." : "Issue E-Challan"}
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
