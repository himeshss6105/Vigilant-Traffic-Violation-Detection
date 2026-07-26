import React, { useState } from "react";
import Presentation from "./components/Presentation";
import Dashboard from "./components/Dashboard";
import Analyzer from "./components/Analyzer";
import ChallanRecords from "./components/ChallanRecords";
import { ACADEMIC_REFERENCES } from "./data";
import { 
  Eye, 
  Presentation as SlideIcon, 
  Activity, 
  Search, 
  BookOpen, 
  ShieldCheck, 
  Github, 
  ExternalLink,
  ClipboardCheck,
  Check,
  Sparkles,
  Receipt
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState<'slides' | 'dashboard' | 'analyzer' | 'records'>('slides');
  const [copiedRefId, setCopiedRefId] = useState<number | null>(null);
  const [refSearch, setRefSearch] = useState("");

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedRefId(id);
    setTimeout(() => setCopiedRefId(null), 2000);
  };

  const filteredRefs = ACADEMIC_REFERENCES.filter(ref => 
    ref.citation.toLowerCase().includes(refSearch.toLowerCase()) ||
    ref.notes.toLowerCase().includes(refSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans relative antialiased selection:bg-indigo-500/30 selection:text-white">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 grid-overlay opacity-20 pointer-events-none" />

      {/* Background radial glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-900/10 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-900/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Main Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl shadow-lg shadow-indigo-950/40 border border-indigo-400/20">
              <Eye className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold font-display tracking-tight text-white">YOLOv8 Enforcement</h1>
                <span className="bg-indigo-950 text-indigo-400 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-800/30 uppercase tracking-wider">
                  Two-Stage
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Traffic Safety & Violation Detection System</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0 self-start sm:self-center">
            <button
              onClick={() => setActiveTab('slides')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'slides'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <SlideIcon className="w-3.5 h-3.5" /> Slides
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'dashboard'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> CCTV Dashboard
            </button>
            <button
              onClick={() => setActiveTab('analyzer')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'analyzer'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Playroom
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'records'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" /> Challan Records
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-8 z-10">
        
        {/* Intro Hero Box (Aesthetic welcome banner) */}
        <div className="bg-gradient-to-r from-indigo-950/30 to-slate-900/40 border border-indigo-500/10 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-semibold">Project Prototype Verified</span>
            </div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">
              Deep Learning Traffic Surveillance Platform
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              This system implements a advanced two-stage inspection protocol. Stage 1 isolates vehicles (Cars & Motorcycles). Stage 2 processes localized crops (Windshields & Riders) to enforce safety policies like helmet wearing, occupant limits (no triple riding), and driver/passenger seatbelt securing.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <div className="bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-500">ENGINE:</span> <span className="text-indigo-400 font-bold">YOLOv8m + CLAHE</span>
            </div>
            <div className="bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-500">ACCURACY:</span> <span className="text-emerald-400 font-bold">92.4% mAP@0.5</span>
            </div>
          </div>
        </div>

        {/* Dynamic Tab Panel */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {activeTab === 'slides' && <Presentation />}
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'analyzer' && <Analyzer onNavigateToRecords={() => setActiveTab('records')} />}
              {activeTab === 'records' && <ChallanRecords />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Integrated bibliography Reference Search Section */}
        <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 mt-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-200">System Academic Bibliography</h3>
              </div>
              <p className="text-xs text-slate-500">Browse the 10 core scientific papers and software docs supporting our technical design.</p>
            </div>

            {/* Quick reference search input */}
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
                placeholder="Search citations or notes..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Grid list of references */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRefs.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono italic col-span-2 text-center py-6">
                No citations match your search keywords.
              </p>
            ) : (
              filteredRefs.map((ref) => (
                <div 
                  key={ref.id} 
                  className="bg-slate-950/60 border border-slate-800/50 p-4 rounded-xl flex flex-col gap-2.5 hover:border-slate-800 hover:bg-slate-950 transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-900/30">
                      C_0{ref.id}
                    </span>
                    <button
                      onClick={() => copyToClipboard(ref.citation, ref.id)}
                      className="text-slate-500 hover:text-indigo-400 transition-all p-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800"
                      title="Copy citation to clipboard"
                    >
                      {copiedRefId === ref.id ? <Check className="w-3 h-3 text-emerald-400" /> : <ClipboardCheck className="w-3 h-3" />}
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-normal font-sans">
                    {ref.citation}
                  </p>
                  
                  <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-900 text-[11px] text-slate-400 leading-relaxed">
                    <strong className="text-slate-500 block font-mono text-[9px] uppercase tracking-wide mb-1">Methodology Note:</strong>
                    {ref.notes}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-slate-500 font-mono">
          <span>
            © 2026 Traffic safety AI. All rights reserved.
          </span>
          <div className="flex gap-4">
            <span className="hover:text-slate-300 transition-all cursor-pointer">Security Standards</span>
            <span>•</span>
            <span className="hover:text-slate-300 transition-all cursor-pointer">E-Challan Webhooks</span>
            <span>•</span>
            <span className="hover:text-slate-300 transition-all cursor-pointer">YOLOv8 Weights</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
