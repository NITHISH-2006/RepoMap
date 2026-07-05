import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Layers,
  Globe,
  Server,
  Database,
  Settings,
  TestTube,
  Share2,
  Box,
  MessageSquare,
} from "lucide-react";

const LAYER_CONFIG = {
  presentation: { color: "#00BFFF", label: "PRESENTATION", icon: Globe },
  application: { color: "#7C3AED", label: "APPLICATION", icon: Server },
  domain: { color: "#F59E0B", label: "DOMAIN", icon: Database },
  infrastructure: { color: "#EF4444", label: "INFRA", icon: Settings },
  config: { color: "#6B7280", label: "CONFIG", icon: Settings },
  testing: { color: "#10B981", label: "TESTING", icon: TestTube },
  shared: { color: "#8B5CF6", label: "SHARED", icon: Share2 },
};

const STATUS_CONFIG = {
  CRITICAL: {
    borderClass: "border-status-critical/50 animate-violation-pulse shadow-[0_0_15px_rgba(255,59,59,0.2)]",
    dotClass: "bg-status-critical animate-pulse",
    label: "CRITICAL",
    labelClass: "text-status-critical bg-status-critical/10 border-status-critical/30",
  },
  WARNING: {
    borderClass: "border-status-warning/40 animate-warning-pulse shadow-[0_0_10px_rgba(255,140,0,0.15)]",
    dotClass: "bg-status-warning",
    label: "WARNING",
    labelClass: "text-status-warning bg-status-warning/10 border-status-warning/30",
  },
  COMPLIANT: {
    borderClass: "border-status-compliant/20 hover:border-status-compliant/40 hover:shadow-[0_0_10px_rgba(0,255,0,0.1)]",
    dotClass: "bg-status-compliant",
    label: "COMPLIANT",
    labelClass: "text-status-compliant bg-status-compliant/10 border-status-compliant/30",
  },
};

function DistrictNode({ data, selected }) {
  const layer = data.layer?.toLowerCase() || "shared";
  const config = LAYER_CONFIG[layer] || LAYER_CONFIG.shared;
  const IconComponent = config.icon || Box;
  const status = data.status || "COMPLIANT";
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.COMPLIANT;
  const isTraced = data.isTraced;
  const isTraceDimmed = data.isTraceDimmed;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-zinc-600 !border-zinc-500"
      />

      <div
        className={`
          group relative px-4 py-3 rounded-xl min-w-[180px] max-w-[220px]
          bg-panel border-2 transition-all duration-300 cursor-pointer
          ${
            isTraceDimmed
              ? "opacity-20 grayscale border-border"
              : selected
              ? "border-accent shadow-[0_0_20px_rgba(0,255,0,0.25)] scale-105"
              : isTraced
              ? "border-sky-400 shadow-[0_0_20px_rgba(0,191,255,0.35)] scale-105 animate-trace-glow"
              : statusConfig.borderClass
          }
        `}
      >
        {/* ── Status indicator dot ── */}
        <div className="absolute -top-1.5 -right-1.5 flex items-center gap-1">
          {status === "CRITICAL" && (
            <div className="w-3.5 h-3.5 rounded-full bg-status-critical border-2 border-panel flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">!</span>
            </div>
          )}
          {status === "WARNING" && (
            <div className="w-3.5 h-3.5 rounded-full bg-status-warning border-2 border-panel flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">⚠</span>
            </div>
          )}
        </div>

        {/* ── Trace indicator ── */}
        {isTraced && !isTraceDimmed && (
          <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-sky-400 border-2 border-panel flex items-center justify-center animate-pulse">
            <span className="text-[7px] font-bold text-black">▶</span>
          </div>
        )}

        {/* ── Layer Badge ── */}
        <div className="flex items-center gap-1.5 mb-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <IconComponent
              className="w-3 h-3"
              style={{ color: config.color }}
            />
          </div>
          <span
            className="text-[9px] font-mono font-semibold tracking-widest uppercase"
            style={{ color: config.color }}
          >
            {config.label}
          </span>
        </div>

        {/* ── District Name ── */}
        <p className="text-sm font-semibold text-white leading-tight truncate">
          {data.name}
        </p>

        {/* ── Status Badge ── */}
        <div className="mt-2 flex items-center justify-between">
          <span
            className={`text-[9px] font-mono font-semibold tracking-wider px-1.5 py-0.5 rounded border ${statusConfig.labelClass}`}
          >
            {statusConfig.label}
          </span>

          {/* Connection count */}
          {data.connectionCount > 0 && (
            <div className="flex items-center gap-1 text-zinc-500">
              <Share2 className="w-3 h-3" />
              <span className="text-[10px] font-mono">
                {data.connectionCount}
              </span>
            </div>
          )}
        </div>

        {/* ── Selected node chat hint ── */}
        {selected && (
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1
                          bg-accent/20 border border-accent/40 rounded-full px-2 py-0.5">
            <MessageSquare className="w-2.5 h-2.5 text-accent" />
            <span className="text-[8px] font-mono text-accent">CHAT</span>
          </div>
        )}

        {/* ── Subtle glow line at bottom ── */}
        <div
          className="absolute bottom-0 left-3 right-3 h-[1px] opacity-30"
          style={{
            background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
          }}
        />
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-zinc-600 !border-zinc-500"
      />
    </>
  );
}

export default memo(DistrictNode);
