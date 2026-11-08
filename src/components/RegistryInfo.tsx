import React from "react";
import { RegistryMatch } from "../types";
import { UserCheck, UserX } from "lucide-react";

interface RegistryInfoProps {
  registry?: RegistryMatch;
  plateText?: string;
  /** One-line version for the small cards on the CCTV dashboard. */
  compact?: boolean;
}

/**
 * Shows the registered owner of a detected plate (from the simulated vehicle
 * registry), or a short note when a plate was read but is not registered.
 */
export default function RegistryInfo({ registry, plateText, compact }: RegistryInfoProps) {
  if (registry) {
    const vehicle = [registry.vehicleModel, registry.vehicleLabel ? `(${registry.vehicleLabel})` : ""]
      .filter(Boolean)
      .join(" ");

    if (compact) {
      return (
        <div className="text-[10px] font-mono text-emerald-400 leading-snug flex flex-wrap items-center gap-x-1">
          <UserCheck className="w-3 h-3 shrink-0" />
          <span className="font-semibold">{registry.ownerName}</span>
          {vehicle && <span className="text-slate-400">• {vehicle}</span>}
          {registry.phoneMasked && <span className="text-slate-500">• {registry.phoneMasked}</span>}
        </div>
      );
    }

    return (
      <div className="mt-1 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-2.5 text-[11px] font-mono space-y-1">
        <div className="flex items-center justify-between text-emerald-400 font-semibold">
          <span className="flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" /> Registered owner
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-900/50">
            {registry.matchType === "exact" ? "EXACT MATCH" : "MATCHED AFTER CORRECTION"}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Owner:</span>
          <span className="text-slate-200 font-semibold">{registry.ownerName}</span>
        </div>
        {vehicle && (
          <div className="flex justify-between text-slate-400">
            <span>Vehicle:</span>
            <span className="text-slate-200 font-semibold">{vehicle}</span>
          </div>
        )}
        {registry.phoneMasked && (
          <div className="flex justify-between text-slate-400">
            <span>Mobile:</span>
            <span className="text-slate-200 font-semibold">{registry.phoneMasked}</span>
          </div>
        )}
        {registry.matchType === "corrected" && (
          <div className="text-[10px] text-slate-500">
            Plate was read as {registry.readAs}; matched to registered plate {registry.plate}.
          </div>
        )}
      </div>
    );
  }

  if (!plateText) return null;
  return (
    <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
      <UserX className="w-3 h-3" /> Plate not found in the vehicle registry
    </div>
  );
}
