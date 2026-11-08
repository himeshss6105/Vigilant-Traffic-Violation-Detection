import React, { useEffect, useMemo, useState } from "react";
import { RegisteredVehiclePublic } from "../types";
import { Users, Search, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

/** Read-only view of the simulated vehicle registry (data/vehicles.csv). */
export default function VehicleRegistry() {
  const [vehicles, setVehicles] = useState<RegisteredVehiclePublic[]>([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vehicles");
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || "Failed to load the registry.");
      setVehicles(body.vehicles as RegisteredVehiclePublic[]);
      setSource(String(body.source || ""));
    } catch (err: any) {
      setError(err.message || "Failed to load the registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.plate.toLowerCase().includes(q) ||
        v.ownerName.toLowerCase().includes(q) ||
        v.vehicleModel.toLowerCase().includes(q) ||
        v.vehicleLabel.toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" /> Vehicle Registry
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Simulated registry used to attach owner details to challans. Loaded from <span className="font-mono">data/vehicles.csv</span>; mobile numbers are masked.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
            VEHICLES: <span className="text-indigo-400 font-bold">{vehicles.length}</span>
          </div>
          <button
            onClick={load}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all"
            title="Reload"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by plate, owner or vehicle..."
          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-700"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-slate-500 py-12 text-xs font-mono">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading registry...
        </div>
      ) : error ? (
        <div className="bg-red-950/30 border border-red-800/50 p-3 rounded-xl text-red-400 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-500 text-xs font-mono py-12">
          {vehicles.length === 0 ? "The registry is empty. Add vehicles to data/vehicles.csv and restart the server." : "No vehicles match your search."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="px-4 py-2.5">Plate</th>
                <th className="px-4 py-2.5">Owner</th>
                <th className="px-4 py-2.5">Vehicle</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Mobile</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.plate} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-900/60">
                  <td className="px-4 py-2 text-slate-100 font-bold">{v.plate}</td>
                  <td className="px-4 py-2 text-slate-300">{v.ownerName}</td>
                  <td className="px-4 py-2 text-slate-300">{v.vehicleModel || "-"}</td>
                  <td className="px-4 py-2 text-slate-500">{v.vehicleLabel}</td>
                  <td className="px-4 py-2 text-slate-500">{v.phoneMasked || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {source && <p className="text-[10px] text-slate-600 font-mono">Source: {source}</p>}
    </div>
  );
}
