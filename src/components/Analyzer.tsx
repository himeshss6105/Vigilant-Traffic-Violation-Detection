import React, { useState, useRef } from "react";
import { PresetImage, DetectionResult } from "../types";
import { PRESET_IMAGES } from "../data";
import { issueChallan } from "../challanClient";
import { 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  Image as ImageIcon, 
  Sliders, 
  HelpCircle, 
  RefreshCw,
  Eye,
  Lock,
  Receipt,
  ScanLine
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Analyzer({ onNavigateToRecords }: { onNavigateToRecords?: () => void }) {
  const [selectedPreset, setSelectedPreset] = useState<PresetImage | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DetectionResult | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatingChallanFor, setGeneratingChallanFor] = useState<string | null>(null);
  const [challanError, setChallanError] = useState<string | null>(null);
  const [issuedChallans, setIssuedChallans] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Stylized vector graphics representing the two presets. These are RAW SVG markup
  // (not base64/data-URI strings) — they get rasterized to a real PNG before being
  // sent to Gemini, since Gemini's inline_data requires actual image bytes, not SVG text.
  const getPresetSvgMarkup = (id: string) => {
    if (id === "preset_motorcycles") {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
        <rect width="800" height="500" fill="#0f172a"/>
        <path d="M 0 350 L 800 350 M 0 150 L 800 150" stroke="#334155" stroke-width="8"/>
        <!-- Background cars -->
        <rect x="50" y="180" width="120" height="80" rx="10" fill="#1e3a8a" opacity="0.8"/>
        <rect x="80" y="195" width="60" height="40" rx="4" fill="#38bdf8" opacity="0.6"/>
        <text x="110" y="240" fill="#ffffff" font-size="12" font-family="monospace">CAR_201</text>
        
        <!-- Motorcycle 1 (Safe) -->
        <g transform="translate(180, 240)">
          <circle cx="30" cy="80" r="18" fill="#475569" stroke="#94a3b8" stroke-width="4"/>
          <circle cx="110" cy="80" r="18" fill="#475569" stroke="#94a3b8" stroke-width="4"/>
          <path d="M 30 80 L 70 50 L 110 80 M 50 40 L 90 40 L 70 80" stroke="#cbd5e1" stroke-width="6" stroke-linecap="round"/>
          <!-- Rider -->
          <circle cx="70" cy="15" r="10" fill="#f87171"/> <!-- Red Helmet -->
          <path d="M 70 25 L 70 55 M 70 35 L 50 48 M 70 35 L 90 48" stroke="#f87171" stroke-width="4"/>
          <text x="70" y="105" fill="#34d399" font-size="10" font-family="sans-serif" font-weight="bold" text-anchor="middle">SAFE (HELMET)</text>
        </g>

        <!-- Motorcycle 2 (Violator - Triple Riding + No Helmet) -->
        <g transform="translate(480, 220)">
          <circle cx="40" cy="110" r="22" fill="#475569" stroke="#94a3b8" stroke-width="4"/>
          <circle cx="150" cy="110" r="22" fill="#475569" stroke="#94a3b8" stroke-width="4"/>
          <path d="M 40 110 L 95 65 L 150 110 M 70 50 L 130 50 L 95 110" stroke="#e2e8f0" stroke-width="8"/>
          <!-- 3 Riders (No Helmets) -->
          <circle cx="80" cy="20" r="11" fill="#fca5a5"/> <!-- Rider 1 Head -->
          <path d="M 80 31 L 80 75" stroke="#fca5a5" stroke-width="5"/>
          
          <circle cx="110" cy="25" r="11" fill="#fca5a5"/> <!-- Rider 2 Head -->
          <path d="M 110 36 L 110 75" stroke="#fca5a5" stroke-width="5"/>

          <circle cx="138" cy="35" r="11" fill="#fca5a5"/> <!-- Rider 3 Head -->
          <path d="M 138 46 L 138 75" stroke="#fca5a5" stroke-width="5"/>

          <text x="95" y="150" fill="#ef4444" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle">VIOLATION: TRIPLE RIDING + NO HELMET</text>
        </g>

        <text x="400" y="50" fill="#64748b" font-size="18" font-family="sans-serif" font-weight="bold" text-anchor="middle">Surveillance Cam-04 Intersection View</text>
      </svg>`;
    } else {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
        <rect width="800" height="500" fill="#0f172a"/>
        
        <!-- Large Car Windshield View -->
        <g transform="translate(100, 80)">
          <!-- Car Body Frame -->
          <rect width="600" height="340" rx="30" fill="#1e293b" stroke="#475569" stroke-width="8"/>
          
          <!-- Windshield Area -->
          <rect x="50" y="30" width="500" height="180" rx="20" fill="#0f172a" stroke="#38bdf8" stroke-width="4"/>
          <path d="M 50 120 L 550 120" stroke="#38bdf8" stroke-width="1" stroke-dasharray="5 5"/>
          
          <!-- Driver (Wearing Seatbelt) -->
          <g transform="translate(120, 50)">
            <circle cx="50" cy="40" r="22" fill="#fed7aa"/>
            <rect x="25" y="62" width="50" height="80" rx="10" fill="#475569"/>
            <!-- Seatbelt Strap (Diagonal line) -->
            <line x1="22" y1="65" x2="72" y2="135" stroke="#10b981" stroke-width="8" stroke-linecap="round"/>
            <text x="50" y="160" fill="#10b981" font-size="10" font-family="sans-serif" text-anchor="middle">Driver: Secure</text>
          </g>

          <!-- Front Passenger (NO Seatbelt) -->
          <g transform="translate(380, 50)">
            <circle cx="50" cy="40" r="22" fill="#fed7aa"/>
            <rect x="25" y="62" width="50" height="80" rx="10" fill="#475569"/>
            <!-- Warning sign -->
            <circle cx="50" cy="95" r="14" fill="#ef4444" opacity="0.2"/>
            <text x="50" y="100" fill="#ef4444" font-size="16" font-weight="bold" text-anchor="middle">⚠️</text>
            <text x="50" y="160" fill="#ef4444" font-size="10" font-family="sans-serif" text-anchor="middle">No Seat Belt</text>
          </g>
        </g>
        
        <text x="400" y="40" fill="#64748b" font-size="18" font-family="sans-serif" font-weight="bold" text-anchor="middle">CCTV Gantry: Passenger Windshield Detail</text>
      </svg>`;
    }
  };

  // Rasterizes the preset SVG markup into a real PNG data URL (proper base64-encoded
  // image bytes), since Gemini's inline_data requires an actual raster image, not SVG text.
  const svgMarkupToPngDataUrl = (svgMarkup: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width || 800;
        canvas.height = img.height || 500;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas 2D context unavailable."));
          return;
        }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to rasterize preset SVG."));
      };
      img.src = url;
    });
  };

  const handlePresetSelect = async (preset: PresetImage) => {
    setSelectedPreset(preset);
    setAnalysisResult(null);
    setErrorMessage(null);
    try {
      const svgMarkup = getPresetSvgMarkup(preset.id);
      const pngDataUrl = await svgMarkupToPngDataUrl(svgMarkup);
      setImageSrc(pngDataUrl);
    } catch (err) {
      setErrorMessage("Failed to load preset image. Please try again.");
    }
  };

  const processImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setSelectedPreset(null);
      setAnalysisResult(null);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processImageUpload(files[0]);
    }
  };

  const triggerAnalysis = async () => {
    if (!imageSrc) return;

    setIsLoading(true);
    setErrorMessage(null);
    setAnalysisResult(null);

    try {
      const payload = {
        imageBase64: imageSrc,
        presetId: selectedPreset?.id || null,
      };

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setAnalysisResult(result.data);
        setIsSimulated(result.isSimulated || false);
      } else {
        throw new Error(result.error || "Failed to analyze image using the computer vision server.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred during processing.");
    } finally {
      setIsLoading(false);
    }
  };

  // Maps Normalized (0-1000) coordinates into absolute responsive percentage styles
  const getBoxStyle = (box: [number, number, number, number]) => {
    const [ymin, xmin, ymax, xmax] = box;
    return {
      top: `${ymin / 10}%`,
      left: `${xmin / 10}%`,
      height: `${(ymax - ymin) / 10}%`,
      width: `${(xmax - xmin) / 10}%`,
    };
  };

  // Helper to calculate violation summary tags for motorcycles
  const getBikeViolation = (ridersCount: number, riders: any[], hasRearviewMirror?: boolean) => {
    const isTriple = ridersCount > 2;
    const missingHelmets = riders.filter(r => !r.hasHelmet).length;
    const isNoHelmet = missingHelmets > 0;
    const isNoMirror = hasRearviewMirror === false;

    const tags: string[] = [];
    if (isTriple) tags.push("Triple Riding");
    if (isNoHelmet) tags.push("No Helmet");
    if (isNoMirror) tags.push("No Mirror");

    return tags.length > 0 ? tags.join(" + ") : "No Violation";
  };

  const handleGenerateChallan = async (
    vehicleId: string,
    vehicleType: "motorcycle" | "car",
    plateText: string | undefined,
    violationTags: string[]
  ) => {
    setChallanError(null);
    setGeneratingChallanFor(vehicleId);
    try {
      const result = await issueChallan({
        vehicleId,
        vehicleType,
        plateText,
        violations: violationTags,
        evidenceImageBase64: imageSrc || undefined,
      });

      if (!result.success || !result.challanId) {
        throw new Error(result.error || "Failed to issue the challan.");
      }

      setIssuedChallans((prev) => ({ ...prev, [vehicleId]: result.challanId! }));
    } catch (err: any) {
      setChallanError(err.message || "Failed to issue the challan.");
    } finally {
      setGeneratingChallanFor(null);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8" id="ai-vision-playroom">
      {/* Left + Center Area: Upload Controls and Visual Overlays */}
      <div className="xl:col-span-2 flex flex-col gap-6">
        {/* Preset Selector Banner */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
              Select Curated CCTV Scene Presets
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRESET_IMAGES.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                  selectedPreset?.id === preset.id
                    ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-950/20"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-bold font-display text-white">{preset.name}</span>
                  <span className="text-[10px] font-mono text-indigo-400 uppercase bg-indigo-950 px-1.5 py-0.5 rounded">
                    {preset.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Viewport Canvas container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          {/* Viewport Header */}
          <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
              Enforcement Viewport
            </span>

            {imageSrc && (
              <button
                onClick={() => {
                  setImageSrc(null);
                  setSelectedPreset(null);
                  setAnalysisResult(null);
                  setErrorMessage(null);
                }}
                className="text-[10px] font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-all"
              >
                <RefreshCw className="w-3 h-3" /> Clear Frame
              </button>
            )}
          </div>

          {/* Interactive Image Display Board */}
          <div className="bg-slate-950 p-6 flex items-center justify-center min-h-[350px]">
            {!imageSrc ? (
              /* Drag & Drop uploader placeholder */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-lg p-10 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-950/10"
                    : "border-slate-800 hover:border-slate-700 bg-slate-950"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && processImageUpload(e.target.files[0])}
                  className="hidden"
                  accept="image/*"
                />
                
                <div className="p-4 bg-slate-900 rounded-full border border-slate-800 text-slate-400">
                  <Upload className="w-8 h-8 text-indigo-400" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Upload Traffic Frame or Drag Here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports JPG, PNG formats from typical CCTV cameras
                  </p>
                </div>

                <div className="text-[10px] font-mono text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                  Tip: Uploading your own image leverages the server-side Gemini AI parser!
                </div>
              </div>
            ) : (
              /* Active image frame with relative bounding boxes superimposed */
              <div ref={containerRef} className="relative w-full max-w-2xl aspect-[8/5] bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                {/* Image backdrop */}
                <img
                  src={imageSrc}
                  alt="Traffic monitoring surveillance frame"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />

                {/* YOLO scanline effect */}
                {isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent animate-scanline pointer-events-none border-b-2 border-indigo-500/20" />
                )}

                {/* SUPERIMPOSED BOUNDING BOXES */}
                {analysisResult && (
                  <>
                    {/* Motorcycles */}
                    {analysisResult.motorcycles?.map((bike) => {
                      const violationTag = getBikeViolation(bike.riders?.length || 0, bike.riders || [], bike.hasRearviewMirror);
                      const isViolation = violationTag !== "No Violation";
                      const colorClass = isViolation ? "border-red-500 bg-red-500/10" : "border-emerald-500 bg-emerald-500/10";
                      const textClass = isViolation ? "bg-red-500" : "bg-emerald-500";

                      return (
                        <div
                          key={bike.id}
                          style={getBoxStyle(bike.box)}
                          className={`absolute border-2 rounded ${colorClass} transition-all duration-300 group`}
                        >
                          {/* Label overlay */}
                          <span className={`absolute -top-5 left-0 px-1 py-0.5 rounded-t text-[8px] font-mono font-bold text-white uppercase whitespace-nowrap ${textClass}`}>
                            {bike.id.toUpperCase()} • BIKE ({(bike.confidence ? Math.round(bike.confidence * 100) : 90)}%)
                            {bike.plateText ? ` • ${bike.plateText}` : ""}
                          </span>

                          {/* Riders head crop indicators inside motorcycle */}
                          {bike.riders?.map((rider, rIdx) => (
                            <div
                              key={rIdx}
                              style={getBoxStyle(rider.box)}
                              className={`absolute border border-dashed rounded ${
                                rider.hasHelmet ? "border-emerald-400" : "border-red-400"
                              }`}
                              title={rider.hasHelmet ? "Helmet Verified" : "Helmet Violation"}
                            >
                              <span className="absolute -bottom-4 left-0 text-[7px] font-mono bg-slate-950/80 px-1 rounded text-slate-300 whitespace-nowrap">
                                {rider.hasHelmet ? "HELMET" : "NO HELMET"}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    {/* Cars */}
                    {analysisResult.cars?.map((car) => {
                      const seatbeltViolators = car.occupants?.filter(occ => !occ.wearingSeatbelt).length || 0;
                      const isViolation = seatbeltViolators > 0;
                      const colorClass = isViolation ? "border-red-500 bg-red-500/5" : "border-emerald-500 bg-emerald-500/5";
                      const textClass = isViolation ? "bg-red-500" : "bg-emerald-500";

                      return (
                        <div
                          key={car.id}
                          style={getBoxStyle(car.box)}
                          className={`absolute border-2 rounded ${colorClass} transition-all duration-300 group`}
                        >
                          <span className={`absolute -top-5 left-0 px-1 py-0.5 rounded-t text-[8px] font-mono font-bold text-white uppercase whitespace-nowrap ${textClass}`}>
                            {car.id.toUpperCase()} • CAR ({(car.confidence ? Math.round(car.confidence * 100) : 95)}%)
                            {car.plateText ? ` • ${car.plateText}` : ""}
                          </span>

                          {/* Windshield sub-ROI */}
                          {car.windshieldBox && (
                            <div
                              style={getBoxStyle(car.windshieldBox)}
                              className="absolute border border-sky-400/80 bg-sky-400/5 rounded"
                              title="Windshield ROI Isolated"
                            >
                              <span className="absolute -top-3.5 left-1 text-[7px] font-mono bg-sky-950 text-sky-400 px-1 rounded border border-sky-800/30">
                                WINDSHIELD_ROI
                              </span>
                            </div>
                          )}

                          {/* Front seat occupants inside windshield area */}
                          {car.occupants?.map((occ, oIdx) => (
                            <div
                              key={oIdx}
                              style={getBoxStyle(occ.box)}
                              className={`absolute border border-dashed rounded ${
                                occ.wearingSeatbelt ? "border-emerald-400" : "border-red-400"
                              }`}
                              title={`${occ.role}: ${occ.wearingSeatbelt ? "Belted" : "Unbelted"}`}
                            >
                              <span className="absolute -bottom-4 left-0 text-[7px] font-mono bg-slate-950/80 px-1 rounded text-slate-300 whitespace-nowrap uppercase">
                                {occ.role}: {occ.wearingSeatbelt ? "BELT" : "NO BELT"}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Analysis Actions */}
          <div className="bg-slate-950/80 px-5 py-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              {!imageSrc 
                ? "Awaiting traffic frame upload..." 
                : analysisResult 
                  ? "Detection completed successfully." 
                  : "Frame staged. Ready for AI inspection."
              }
            </span>

            {imageSrc && (
              <button
                onClick={triggerAnalysis}
                disabled={isLoading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                  isLoading
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/40"
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> RUNNING COMPUTER VISION...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> DEPLOY YOLO STAGE ENGINES
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div className="bg-red-950/30 border border-red-800/50 p-4 rounded-xl text-red-400 text-xs leading-relaxed">
            <strong className="font-semibold block mb-1">Server Analysis Encountered an Issue:</strong>
            <p>{errorMessage}</p>
            <p className="mt-1 text-slate-400">
              Note: If your API key is missing from Secrets, please proceed using the pre-loaded presets which run in complete offline simulation mode.
            </p>
          </div>
        )}
      </div>

      {/* Right Column: In-depth Compliance Diagnosis Dashboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
          <Eye className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200">Compliance Diagnosis</h3>
        </div>

        {/* Diagnosis Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 scrollbar">
          {!analysisResult ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-12">
              <ImageIcon className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-xs font-semibold text-slate-400">Awaiting YOLO Processing</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-[200px]">
                Stage staged image and deploy the detectors to view deep learning segmentations.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Simulation Banner */}
              {isSimulated && (
                <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3 flex gap-2">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-400 leading-normal font-mono">
                    OFFLINE FALLBACK ACTIVE: Running pre-loaded local segmentation profiles. Configure a GEMINI_API_KEY inside the Secrets panel to activate full, dynamic any-image visual parsing.
                  </p>
                </div>
              )}

              {/* Motorcycle Infractions Segment */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                  Two-Wheeler Segment Analysis
                </span>

                {(!analysisResult.motorcycles || analysisResult.motorcycles.length === 0) ? (
                  <p className="text-xs text-slate-500 font-mono pl-2 italic">No motorcycles identified in scene.</p>
                ) : (
                  analysisResult.motorcycles.map((bike) => {
                    const violationTag = getBikeViolation(bike.riders?.length || 0, bike.riders || [], bike.hasRearviewMirror);
                    const isViolation = violationTag !== "No Violation";

                    return (
                      <div key={bike.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
                        {/* Header */}
                        <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                          <span className="text-xs font-mono font-bold text-slate-300">{bike.id.toUpperCase()}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            isViolation ? "bg-red-950 text-red-400 border border-red-900/30" : "bg-emerald-950 text-emerald-400 border border-emerald-900/30"
                          }`}>
                            {violationTag}
                          </span>
                        </div>

                        {/* Stats list */}
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Passenger density:</span>
                            <span className="font-semibold text-slate-200">{bike.riders?.length || 0} Riders</span>
                          </div>
                          
                          <div className="flex justify-between text-slate-400">
                            <span>Helmet Compliance:</span>
                            <span className="font-semibold text-slate-200">
                              {bike.riders?.filter(r => r.hasHelmet).length} / {bike.riders?.length} Checked
                            </span>
                          </div>

                          <div className="flex justify-between text-slate-400">
                            <span>Mirror Compliance:</span>
                            <span className={`font-semibold ${bike.hasRearviewMirror === false ? "text-red-400" : "text-slate-200"}`}>
                              {bike.hasRearviewMirror === false ? "Missing" : "Fitted"}
                            </span>
                          </div>

                          <div className="flex justify-between text-slate-400">
                            <span>Confidence Average:</span>
                            <span className="font-semibold text-slate-200">
                              {bike.confidence ? Math.round(bike.confidence * 100) : 92}%
                            </span>
                          </div>

                          <div className="flex justify-between text-slate-400">
                            <span className="flex items-center gap-1"><ScanLine className="w-3 h-3" /> Plate (OCR):</span>
                            <span className={`font-semibold font-mono ${bike.plateText ? "text-slate-200" : "text-amber-500"}`}>
                              {bike.plateText || "Not Detected"}
                            </span>
                          </div>
                        </div>

                        {/* Detailed rider status breakdown */}
                        <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-800/40 space-y-1">
                          {bike.riders?.map((rider, index) => (
                            <div key={index} className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-500">Rider #{index + 1} ({index === 0 ? "Driver" : "Pillion"}):</span>
                              <span className={rider.hasHelmet ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                {rider.hasHelmet ? "Helmet Active" : "No Helmet"}
                              </span>
                            </div>
                          ))}
                        </div>

                        {isViolation && (
                          issuedChallans[bike.id] ? (
                            <div className="w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-emerald-950 text-emerald-400 border border-emerald-900/40">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" /> Issued: {issuedChallans[bike.id]}
                              </span>
                              {onNavigateToRecords && (
                                <button onClick={onNavigateToRecords} className="underline decoration-dotted hover:text-emerald-300 normal-case font-semibold">
                                  View in Records
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleGenerateChallan(bike.id, "motorcycle", bike.plateText, violationTag.split(" + "))}
                              disabled={generatingChallanFor === bike.id}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-all"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              {generatingChallanFor === bike.id ? "Issuing Challan..." : "Issue E-Challan"}
                            </button>
                          )
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Car Compliance Segment */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                  Four-Wheeler Segment Analysis
                </span>

                {(!analysisResult.cars || analysisResult.cars.length === 0) ? (
                  <p className="text-xs text-slate-500 font-mono pl-2 italic">No passenger cars identified in scene.</p>
                ) : (
                  analysisResult.cars.map((car) => {
                    const seatbeltViolators = car.occupants?.filter(occ => !occ.wearingSeatbelt).length || 0;
                    const isViolation = seatbeltViolators > 0;
                    const violationTag = isViolation ? "No Seat Belt" : "No Violation";

                    return (
                      <div key={car.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
                        {/* Header */}
                        <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                          <span className="text-xs font-mono font-bold text-slate-300">{car.id.toUpperCase()}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            isViolation ? "bg-red-950 text-red-400 border border-red-900/30" : "bg-emerald-950 text-emerald-400 border border-emerald-900/30"
                          }`}>
                            {violationTag}
                          </span>
                        </div>

                        {/* Stats */}
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Occupants detected:</span>
                            <span className="font-semibold text-slate-200">{car.occupants?.length || 0} Occupants</span>
                          </div>

                          <div className="flex justify-between text-slate-400">
                            <span>Seat Belt Compliance:</span>
                            <span className="font-semibold text-slate-200">
                              {car.occupants?.filter(o => o.wearingSeatbelt).length} / {car.occupants?.length} Secured
                            </span>
                          </div>

                          <div className="flex justify-between text-slate-400">
                            <span>Windshield ROI status:</span>
                            <span className="font-semibold text-sky-400">Isolate + Crop</span>
                          </div>

                          <div className="flex justify-between text-slate-400">
                            <span className="flex items-center gap-1"><ScanLine className="w-3 h-3" /> Plate (OCR):</span>
                            <span className={`font-semibold font-mono ${car.plateText ? "text-slate-200" : "text-amber-500"}`}>
                              {car.plateText || "Not Detected"}
                            </span>
                          </div>
                        </div>

                        {/* Occupant breakdown */}
                        <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-800/40 space-y-1">
                          {car.occupants?.map((occ, index) => (
                            <div key={index} className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-500 uppercase">{occ.role}:</span>
                              <span className={occ.wearingSeatbelt ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                {occ.wearingSeatbelt ? "Secured" : "UNBELTED"}
                              </span>
                            </div>
                          ))}
                        </div>

                        {isViolation && (
                          issuedChallans[car.id] ? (
                            <div className="w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-emerald-950 text-emerald-400 border border-emerald-900/40">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" /> Issued: {issuedChallans[car.id]}
                              </span>
                              {onNavigateToRecords && (
                                <button onClick={onNavigateToRecords} className="underline decoration-dotted hover:text-emerald-300 normal-case font-semibold">
                                  View in Records
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleGenerateChallan(car.id, "car", car.plateText, violationTag.split(" + "))}
                              disabled={generatingChallanFor === car.id}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-all"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              {generatingChallanFor === car.id ? "Issuing Challan..." : "Issue E-Challan"}
                            </button>
                          )
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {challanError && (
                <div className="bg-red-950/30 border border-red-800/50 p-3 rounded-xl text-red-400 text-[11px] leading-relaxed">
                  <strong className="font-semibold block mb-0.5">Challan Issuance Failed:</strong>
                  {challanError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
