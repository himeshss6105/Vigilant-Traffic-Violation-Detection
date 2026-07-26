import React, { useState } from "react";
import { SLIDES } from "../data";
import { Slide } from "../types";
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Cpu, 
  Settings, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  TrendingUp, 
  Award,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Presentation() {
  const [currentIdx, setCurrentIdx] = useState(0);

  const nextSlide = () => {
    if (currentIdx < SLIDES.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const prevSlide = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const currentSlide = SLIDES[currentIdx];

  const getTopicIcon = (topic: Slide["topic"]) => {
    switch (topic) {
      case "Introduction": return <BookOpen className="w-5 h-5 text-indigo-400" />;
      case "Proposed System": return <Cpu className="w-5 h-5 text-emerald-400" />;
      case "Literature Survey": return <FileText className="w-5 h-5 text-amber-400" />;
      case "Refinement of Design": return <Settings className="w-5 h-5 text-sky-400" />;
      case "Architecture": return <AlertTriangle className="w-5 h-5 text-pink-400" />;
      case "Results": return <Activity className="w-5 h-5 text-teal-400" />;
      case "Applications": return <TrendingUp className="w-5 h-5 text-purple-400" />;
      case "References": return <Award className="w-5 h-5 text-rose-400" />;
      default: return <BookOpen className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl h-[680px] flex flex-col relative" id="presentation-slide-deck">
      {/* Upper Grid Decoration */}
      <div className="absolute inset-0 grid-overlay opacity-10 pointer-events-none" />

      {/* Slide Header */}
      <div className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/50">
            {getTopicIcon(currentSlide.topic)}
          </div>
          <div>
            <span className="text-xs font-mono font-medium uppercase tracking-wider text-slate-500">
              {currentSlide.topic}
            </span>
            <h3 className="text-sm font-semibold text-slate-200">
              Slide {currentSlide.id} of {SLIDES.length}
            </h3>
          </div>
        </div>

        {/* Quick dot navigation */}
        <div className="flex items-center gap-1.5">
          {SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setCurrentIdx(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIdx ? "w-6 bg-indigo-500" : "w-2 bg-slate-800 hover:bg-slate-700"
              }`}
              title={slide.topic}
            />
          ))}
        </div>
      </div>

      {/* Slide Body */}
      <div className="flex-1 p-8 overflow-y-auto flex flex-col lg:flex-row gap-8 z-10">
        {/* Left Side: Text and Content Points */}
        <div className="flex-1 flex flex-col justify-center max-w-full lg:max-w-[55%]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-white tracking-tight leading-tight">
                  {currentSlide.title}
                </h1>
                {currentSlide.subtitle && (
                  <p className="mt-2 text-sm text-slate-400 font-medium">
                    {currentSlide.subtitle}
                  </p>
                )}
              </div>

              <ul className="space-y-4">
                {currentSlide.points.map((point, index) => (
                  <motion.li
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 + 0.1 }}
                    key={index}
                    className="flex gap-3 text-sm text-slate-300 leading-relaxed"
                  >
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                    <span>{point}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Side: Beautiful SVG Technical Diagram */}
        <div className="flex-1 min-h-[250px] lg:min-h-0 bg-slate-950/60 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">System Visualizer</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center"
            >
              {renderVisuals(currentSlide.visualType)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Slide Footer and Controls */}
      <div className="border-t border-slate-800 bg-slate-950/60 px-6 py-4 flex items-center justify-between z-10 shrink-0">
        <span className="text-xs font-mono text-slate-500">
          Smart Surveillance Series • Academic Presentation
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={prevSlide}
            disabled={currentIdx === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              currentIdx === 0
                ? "border-slate-800 text-slate-600 cursor-not-allowed"
                : "border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white bg-slate-900"
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button
            onClick={nextSlide}
            disabled={currentIdx === SLIDES.length - 1}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentIdx === SLIDES.length - 1
                ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30"
            }`}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function renderVisuals(type: Slide["visualType"]) {
  switch (type) {
    case "grid":
      // Slide 1 & 7 Grid System
      return (
        <svg className="w-full max-w-[340px] aspect-square" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Smart City CCTV Illustration */}
          <rect x="20" y="20" width="160" height="160" rx="12" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
          <circle cx="100" cy="100" r="45" fill="none" stroke="#4f46e5" strokeWidth="1" strokeDasharray="4 4" />
          
          {/* Grid lines */}
          <line x1="20" y1="100" x2="180" y2="100" stroke="#1e293b" strokeWidth="1" />
          <line x1="100" y1="20" x2="100" y2="180" stroke="#1e293b" strokeWidth="1" />

          {/* CCTV Camera Head */}
          <g transform="translate(60, 50)">
            <path d="M10 20 L40 10 L60 25 L60 45 L40 55 Z" fill="#334155" stroke="#475569" strokeWidth="1.5" />
            <circle cx="20" cy="45" r="8" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
            <circle cx="20" cy="45" r="3" fill="#ef4444" />
            {/* Camera Lens ring */}
            <path d="M40 10 L30 45" stroke="#475569" strokeWidth="1" />
          </g>

          {/* Signal waves */}
          <path d="M115 115 A 25 25 0 0 1 145 145" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <path d="M120 120 A 15 15 0 0 1 138 138" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />

          <text x="100" y="170" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">CCTV JUNCTION SURVEILLANCE</text>
        </svg>
      );

    case "logic-flow":
      // Stage Split flowchart (Slide 2 & 5)
      return (
        <svg className="w-full max-w-[340px]" viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Input Block */}
          <rect x="75" y="10" width="90" height="25" rx="4" fill="#1e1b4b" stroke="#4f46e5" strokeWidth="1.5" />
          <text x="120" y="26" fill="#e0e7ff" fontSize="9" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">1080p CCTV Ingress</text>

          {/* Arrow 1 */}
          <path d="M120 35 L120 50" stroke="#4f46e5" strokeWidth="1.5" />
          <polygon points="120,53 117,48 123,48" fill="#4f46e5" />

          {/* YOLO Stage 1 */}
          <rect x="55" y="53" width="130" height="30" rx="4" fill="#022c22" stroke="#10b981" strokeWidth="1.5" />
          <text x="120" y="67" fill="#ecfdf5" fontSize="9" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">Stage 1: YOLOv8 Detector</text>
          <text x="120" y="78" fill="#a7f3d0" fontSize="7" fontFamily="sans-serif" textAnchor="middle">Classes: [Car, Motorcycle]</text>

          {/* Split Arrows */}
          <path d="M120 83 L120 95 L50 95 L50 110" stroke="#64748b" strokeWidth="1.5" />
          <polygon points="50,113 47,108 53,108" fill="#64748b" />

          <path d="M120 83 L120 95 L190 95 L190 110" stroke="#64748b" strokeWidth="1.5" />
          <polygon points="190,113 187,108 193,108" fill="#64748b" />

          {/* Motorcycle Branch */}
          <rect x="10" y="113" width="80" height="35" rx="4" fill="#1c1917" stroke="#ea580c" strokeWidth="1.5" />
          <text x="50" y="127" fill="#ffedd5" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">Stage 2A: Bike ROI</text>
          <text x="50" y="137" fill="#fed7aa" fontSize="7" fontFamily="sans-serif" textAnchor="middle">Helmet & Riders</text>

          {/* Car Branch */}
          <rect x="150" y="113" width="80" height="35" rx="4" fill="#0c4a6e" stroke="#0284c7" strokeWidth="1.5" />
          <text x="190" y="127" fill="#f0f9ff" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">Stage 2B: Car ROI</text>
          <text x="190" y="137" fill="#b9e6fe" fontSize="7" fontFamily="sans-serif" textAnchor="middle">Windshield & Belt</text>

          {/* Bottom decision arrows */}
          <path d="M50 148 L50 162 L120 162" stroke="#64748b" strokeWidth="1.5" />
          <path d="M190 148 L190 162 L120 162" stroke="#64748b" strokeWidth="1.5" />
          <path d="M120 162 L120 172" stroke="#64748b" strokeWidth="1.5" />
          <polygon points="120,175 117,170 123,170" fill="#64748b" />

          {/* E-Challan Output */}
          <rect x="75" y="175" width="90" height="20" rx="4" fill="#450a0a" stroke="#ef4444" strokeWidth="1.5" />
          <text x="120" y="188" fill="#fee2e2" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">E-Challan Database</text>
        </svg>
      );

    case "table":
      // Slide 3 Literature Comparison
      return (
        <div className="w-full text-slate-300 font-sans text-[11px] overflow-hidden rounded-lg border border-slate-800">
          <div className="bg-slate-900/80 p-2.5 font-bold border-b border-slate-800 text-white font-display text-center text-xs uppercase tracking-wider">
            Model Pipeline Comparison
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-950 text-[10px] uppercase text-slate-400 border-b border-slate-800">
                <th className="p-2 text-left">Methodology</th>
                <th className="p-2 text-center">mAP Accuracy</th>
                <th className="p-2 text-center">FPS (Speed)</th>
                <th className="p-2 text-right">Robustness</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-900 hover:bg-slate-900/30">
                <td className="p-2 font-mono font-bold text-slate-400">Haar Cascades</td>
                <td className="p-2 text-center text-red-400">~42.0%</td>
                <td className="p-2 text-center text-emerald-400">50+ (Fast)</td>
                <td className="p-2 text-right text-red-500">Poor (Glare/Night)</td>
              </tr>
              <tr className="border-b border-slate-900 hover:bg-slate-900/30">
                <td className="p-2 font-mono font-bold text-slate-400">Faster R-CNN</td>
                <td className="p-2 text-center text-emerald-400">~93.5%</td>
                <td className="p-2 text-center text-red-400">~12 (Slow)</td>
                <td className="p-2 text-right text-emerald-400">Excellent</td>
              </tr>
              <tr className="border-b border-slate-900 hover:bg-slate-900/30">
                <td className="p-2 font-mono font-bold text-indigo-400">YOLOv8 Single</td>
                <td className="p-2 text-center text-indigo-400">~81.2%</td>
                <td className="p-2 text-center text-emerald-400">45+ (Real-time)</td>
                <td className="p-2 text-right text-amber-500">Moderate (Small Head)</td>
              </tr>
              <tr className="bg-indigo-950/20 hover:bg-indigo-950/30">
                <td className="p-2 font-mono font-bold text-emerald-400">Proposed 2-Stage</td>
                <td className="p-2 text-center text-emerald-400 font-bold">~91.8%</td>
                <td className="p-2 text-center text-emerald-400 font-bold">38+ (Optimized)</td>
                <td className="p-2 text-right text-emerald-400 font-bold">Excellent (Windshield ROI)</td>
              </tr>
            </tbody>
          </table>
        </div>
      );

    case "flowchart":
      // Method Refinements (Slide 4)
      return (
        <svg className="w-full max-w-[340px]" viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Method circles */}
          <circle cx="50" cy="50" r="28" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          <text x="50" y="48" fill="#e2e8f0" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">ByteTrack</text>
          <text x="50" y="58" fill="#38bdf8" fontSize="7" fontFamily="monospace" textAnchor="middle">Temporal</text>

          <circle cx="170" cy="50" r="28" fill="#1e293b" stroke="#a855f7" strokeWidth="1.5" />
          <text x="170" y="48" fill="#e2e8f0" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">CLAHE</text>
          <text x="170" y="58" fill="#a855f7" fontSize="7" fontFamily="monospace" textAnchor="middle">Anti-Glare</text>

          <circle cx="50" cy="140" r="28" fill="#1e293b" stroke="#f97316" strokeWidth="1.5" />
          <text x="50" y="138" fill="#e2e8f0" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">ROI Pad</text>
          <text x="50" y="148" fill="#f97316" fontSize="7" fontFamily="monospace" textAnchor="middle">+15% Vertical</text>

          <circle cx="170" cy="140" r="28" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
          <text x="170" y="138" fill="#e2e8f0" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">TensorRT</text>
          <text x="170" y="148" fill="#10b981" fontSize="7" fontFamily="monospace" textAnchor="middle">30+ FPS</text>

          {/* Connection Lines */}
          <line x1="78" y1="50" x2="142" y2="50" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="50" y1="78" x2="50" y2="112" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="170" y1="78" x2="170" y2="112" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="78" y1="140" x2="142" y2="140" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
        </svg>
      );

    case "bar-chart":
      // Slide 6 Accuracy Charts
      return (
        <div className="w-full h-full flex flex-col justify-between py-2 text-slate-300 font-sans">
          <span className="text-[10px] font-semibold text-slate-400 text-center uppercase tracking-wider mb-2">
            mAP Accuracy Benchmarks (@0.5 Confidence)
          </span>

          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {/* Bar 1 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-emerald-400 font-mono">Motorcycle Detection (YOLOv8m)</span>
                <span>92.4%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "92.4%" }}
                  transition={{ duration: 0.8 }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full"
                />
              </div>
            </div>

            {/* Bar 2 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-indigo-400 font-mono">Helmet Compliance Analysis (Crop ROI)</span>
                <span>88.2%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "88.2%" }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                />
              </div>
            </div>

            {/* Bar 3 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-sky-400 font-mono">Seat Belt Verification (Windshield Isolation)</span>
                <span>84.6%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "84.6%" }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="text-[9px] font-mono text-slate-500 text-center mt-3">
            Inference latency: ~21ms per frame (GPUMode) • Dataset size: 8,400 annotated frames
          </div>
        </div>
      );

    case "references-list":
      // References terminal (Slide 8)
      return (
        <div className="w-full h-full text-slate-400 font-mono text-[9px] text-left overflow-y-auto max-h-[190px] border border-slate-800 bg-slate-950 p-3 rounded-lg leading-relaxed space-y-3 scrollbar">
          <p className="text-emerald-400 border-b border-slate-800 pb-1 uppercase font-bold text-[10px]">
            Academic Reference Index (10 Selected Works)
          </p>
          <div className="space-y-2.5">
            <p><span className="text-indigo-400 font-bold">[1]</span> Jocher et al. (2023) - <i>Ultralytics YOLOv8</i>. Github core engine.</p>
            <p><span className="text-indigo-400 font-bold">[2]</span> Almazroi et al. (2024) - <i>ESE-YOLOv8</i>. Seat belt textures in deep nets.</p>
            <p><span className="text-indigo-400 font-bold">[3]</span> Shine & Jiji (2020) - <i>Automated helmet bound check</i>. IEEE Access.</p>
            <p><span className="text-indigo-400 font-bold">[4]</span> Vashisth & Kumar (2022) - <i>Triple Riding checks in traffic</i>. IJISAE.</p>
            <p><span className="text-indigo-400 font-bold">[5]</span> Hosseini & Fathi (2022) - <i>Windshield ROI Extraction</i>. Signal Processing.</p>
            <p><span className="text-indigo-400 font-bold">[6]</span> Udayanti & Purwanto (2024) - <i>Windshield Glare solutions</i>.RESTI J.</p>
            <p><span className="text-indigo-400 font-bold">[7]</span> Silva & Aires (2018) - <i>Helmet detection under low lighting</i>. CiSE.</p>
            <p><span className="text-indigo-400 font-bold">[8]</span> Reddy & Krishna (2023) - <i>Municipal E-Challan Architectures</i>. Springer.</p>
            <p><span className="text-indigo-400 font-bold">[9]</span> Bochkovskiy et al. (2020) - <i>YOLOv4 augmentation mechanics</i>. arXiv.</p>
            <p><span className="text-indigo-400 font-bold">[10]</span> Du et al. (2013) - <i>Automatic License Plate OCR pipelines</i>. IEEE.</p>
          </div>
        </div>
      );

    default:
      return null;
  }
}
