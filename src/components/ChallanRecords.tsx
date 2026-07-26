import React, { useState, useEffect, useCallback } from "react";
import { ChallanRecord, ChallanStatus } from "../types";
import { FINE_SCHEDULE } from "../fines";
import {
  Receipt,
  Search,
  Trash2,
  Pencil,
  Download,
  X,
  Save,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Inbox,
  AlertTriangle,
} from "lucide-react";

const ALL_VIOLATIONS = Object.keys(FINE_SCHEDULE);

const STATUS_STYLES: Record<ChallanStatus, string> = {
  issued: "bg-amber-950 text-amber-400 border-amber-900/40",
  paid: "bg-emerald-950 text-emerald-400 border-emerald-900/40",
  void: "bg-slate-800 text-slate-500 border-slate-700/40",
};

interface EditDraft {
  plateNumber: string;
  violations: string[];
  status: ChallanStatus;
}

export default function ChallanRecords() {
  const [records, setRecords] = useState<ChallanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ChallanStatus>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/challans");
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || "Failed to load challan records.");
      setRecords(body.challans as ChallanRecord[]);
    } catch (err: any) {
      setError(err.message || "Failed to load challan records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const startEdit = (r: ChallanRecord) => {
    setEditingId(r.challanId);
    setEditDraft({ plateNumber: r.plateNumber, violations: [...r.violations], status: r.status });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const toggleDraftViolation = (v: string) => {
    if (!editDraft) return;
    setEditDraft({
      ...editDraft,
      violations: editDraft.violations.includes(v)
        ? editDraft.violations.filter((x) => x !== v)
        : [...editDraft.violations, v],
    });
  };

  const saveEdit = async (id: string) => {
    if (!editDraft) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/challans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || "Failed to update challan.");
      setRecords((prev) => prev.map((r) => (r.challanId === id ? (body.challan as ChallanRecord) : r)));
      cancelEdit();
    } catch (err: any) {
      setError(err.message || "Failed to update challan.");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!window.confirm("Delete this challan record? This cannot be undone.")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/challans/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || "Failed to delete challan.");
      setRecords((prev) => prev.filter((r) => r.challanId !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete challan.");
    } finally {
      setBusyId(null);
    }
  };

  const downloadPdf = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/challans/${id}/pdf`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate the PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to download the PDF.");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = records.filter((r) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = q === "" || r.plateNumber.toLowerCase().includes(q) || r.challanId.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalOutstanding = records.filter((r) => r.status === "issued").reduce((sum, r) => sum + r.totalFine, 0);

  return (
    <div className="space-y-5">
      {/* Header + stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-200">Challan Records</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Every challan issued from the AI Playroom is saved here — search, edit, void, or re-download the PDF anytime.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] font-mono">
            <span className="text-slate-500">RECORDS:</span> <span className="text-indigo-400 font-bold">{records.length}</span>
          </div>
          <div className="bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] font-mono">
            <span className="text-slate-500">OUTSTANDING:</span> <span className="text-amber-400 font-bold">Rs. {totalOutstanding}</span>
          </div>
          <button
            onClick={fetchRecords}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search + status filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by plate number or challan ID..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
          />
        </div>
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
          {(["all", "issued", "paid", "void"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                statusFilter === s ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-800/50 p-3 rounded-xl text-red-400 text-[11px] leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading challan records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
          <Inbox className="w-8 h-8 text-slate-700" />
          <p className="text-xs">
            {records.length === 0 ? "No challans issued yet. Issue one from the AI Playroom tab." : "No records match your search/filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const isEditing = editingId === r.challanId;
            const isBusy = busyId === r.challanId;

            return (
              <div key={r.challanId} className="bg-slate-900/40 border border-slate-800/70 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-slate-300">{r.challanId}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(r.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isEditing && (
                      <>
                        <button
                          onClick={() => downloadPdf(r.challanId)}
                          disabled={isBusy}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-all disabled:opacity-50"
                          title="Download PDF"
                        >
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => startEdit(r)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-all"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteRecord(r.challanId)}
                          disabled={isBusy}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-all disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing && editDraft ? (
                  <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                    <div>
                      <label className="text-[9px] font-mono uppercase text-slate-500 block mb-1">Plate Number</label>
                      <input
                        type="text"
                        value={editDraft.plateNumber}
                        onChange={(e) => setEditDraft({ ...editDraft, plateNumber: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-mono uppercase text-slate-500 block mb-1.5">Violations</label>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_VIOLATIONS.map((v) => (
                          <button
                            key={v}
                            onClick={() => toggleDraftViolation(v)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                              editDraft.violations.includes(v)
                                ? "bg-red-950 border-red-800/60 text-red-400"
                                : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                            }`}
                          >
                            {v} (Rs. {FINE_SCHEDULE[v].fineAmount})
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-mono uppercase text-slate-500 block mb-1">Status</label>
                      <div className="flex gap-1.5">
                        {(["issued", "paid", "void"] as ChallanStatus[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => setEditDraft({ ...editDraft, status: s })}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                              editDraft.status === s ? STATUS_STYLES[s] : "bg-slate-900 border-slate-800 text-slate-500"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => saveEdit(r.challanId)}
                        disabled={savingEdit || editDraft.violations.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-all"
                      >
                        {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save Changes
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 transition-all"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                      {editDraft.violations.length === 0 && (
                        <span className="text-[10px] text-amber-500">Select at least one violation.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-xs font-mono">
                        <span className="text-slate-500">Plate:</span>{" "}
                        <span className={r.plateNumber ? "text-slate-200 font-bold" : "text-amber-500"}>
                          {r.plateNumber || "NOT DETECTED"}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-500 uppercase">{r.vehicleType}</div>
                      <div className="flex flex-wrap gap-1">
                        {r.violations.map((v, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-red-950/60 text-red-400 border border-red-900/30">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-200 font-mono flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" /> Rs. {r.totalFine}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
