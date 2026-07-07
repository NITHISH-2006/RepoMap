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
  HardDrive,
  Activity,
} from "lucide-react";

const LAYER_ICONS = {
  presentation: Globe,
  application: Server,
  domain: Database,
  infrastructure: HardDrive,
  config: Settings,
  testing: Activity,
  shared: Share2,
};

const AUDIENCE_LABELS = {
  student: "School Student",
  junior: "Junior Developer",
  senior: "Senior Architect",
  pm: "Product Manager",
};

function DistrictNode({ data, selected }) {
  const layer = data.layer?.toLowerCase() || "shared";
  const IconComponent = LAYER_ICONS[layer] || Box;
  const status = data.status || "COMPLIANT";
  const theme = data.theme || {
    accent: "#00BFFF",
    compliant: "#00FF66",
    warning: "#FF8C00",
    critical: "#FF3B3B",
    layers: {
      presentation: "#00BFFF",
      application: "#7C3AED",
      domain: "#F59E0B",
      infrastructure: "#EF4444",
      config: "#6B7280",
      testing: "#10B981",
      shared: "#8B5CF6",
    }
  };

  const layerColor = theme.layers[layer] || theme.accent;
  const isTraced = data.isTraced;
  const isTraceDimmed = data.isTraceDimmed;
  const isActiveNode = data.isActiveNode;
  const audience = data.audience || "junior";

  // Status mapping
  const statusColors = {
    COMPLIANT: theme.compliant,
    WARNING: theme.warning,
    CRITICAL: theme.critical,
  };
  const statusColor = statusColors[status] || theme.compliant;

  // Pulse/Glow class based on status
  let statusGlowClass = "";
  if (status === "CRITICAL") statusGlowClass = "animate-violation-pulse";
  else if (status === "WARNING") statusGlowClass = "animate-warning-pulse";

  // Node shape based on architectureType
  const arch = data.architectureType?.toLowerCase() || "";
  const isHexagonal = arch.includes("hex") || arch.includes("clean");

  // Custom card style details
  const borderStyle = {
    borderColor: selected 
      ? theme.accent 
      : isActiveNode 
      ? theme.accent 
      : isTraced 
      ? theme.accent 
      : statusColor,
    boxShadow: selected
      ? `0 0 25px ${theme.accent}60, inset 0 0 10px ${theme.accent}20`
      : isActiveNode
      ? `0 0 30px ${theme.accent}80, inset 0 0 15px ${theme.accent}30`
      : isTraced
      ? `0 0 18px ${theme.accent}40`
      : status === "CRITICAL"
      ? `0 0 15px ${theme.critical}25`
      : status === "WARNING"
      ? `0 0 10px ${theme.warning}15`
      : "none",
  };

  const desc = data.descriptions?.[audience] || "No description.";

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-zinc-600 !border-zinc-500"
      />

      <div
        className={`
          group relative rounded-xl min-w-[200px] max-w-[240px]
          bg-panel/90 border-2 transition-all duration-300 cursor-pointer
          ${isTraceDimmed ? "opacity-20 grayscale border-border pointer-events-none" : ""}
          ${isActiveNode ? "scale-105" : selected || isTraced ? "scale-105" : "hover:scale-[1.02]"}
          ${statusGlowClass}
        `}
        style={borderStyle}
      >
        {/* Tooltip Overlay */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-50 w-64 p-3 rounded-xl bg-zinc-950/95 border border-zinc-800/80 text-xs shadow-2xl backdrop-blur-md pointer-events-none text-left">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: layerColor }} />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              {layer} layer ({AUDIENCE_LABELS[audience]})
            </span>
          </div>
          <p className="text-zinc-300 font-sans leading-relaxed text-[11px]">
            {desc}
          </p>
        </div>

        {/* Inner shape overlay for hexagonal architectures */}
        {isHexagonal && (
          <div className="absolute inset-0 bg-accent/5 opacity-30 pointer-events-none shape-octagonal" style={{ backgroundColor: `${layerColor}0c` }} />
        )}

        <div className="px-4 py-3 relative z-10">
          {/* ── Status indicators ── */}
          <div className="absolute -top-1.5 -right-1.5 flex items-center gap-1">
            {status === "CRITICAL" && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-panel flex items-center justify-center animate-pulse" style={{ backgroundColor: theme.critical }}>
                <span className="text-[8px] font-bold text-white">!</span>
              </div>
            )}
            {status === "WARNING" && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-panel flex items-center justify-center" style={{ backgroundColor: theme.warning }}>
                <span className="text-[8px] font-bold text-white">⚠</span>
              </div>
            )}
          </div>

          {/* ── Trace indicator ── */}
          {isTraced && !isTraceDimmed && (
            <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full border-2 border-panel flex items-center justify-center animate-pulse" style={{ backgroundColor: theme.accent }}>
              <span className="text-[7px] font-bold text-black">▶</span>
            </div>
          )}

          {/* ── Layer Badge ── */}
          <div className="flex items-center gap-1.5 mb-2">
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ backgroundColor: `${layerColor}20` }}
            >
              <IconComponent
                className="w-3.5 h-3.5"
                style={{ color: layerColor }}
              />
            </div>
            <span
              className="text-[9px] font-mono font-semibold tracking-widest uppercase"
              style={{ color: layerColor }}
            >
              {layer}
            </span>
          </div>

          {/* ── District Name ── */}
          <p className="text-sm font-semibold text-white leading-tight truncate">
            {data.name}
          </p>

          {/* ── Status Badge ── */}
          <div className="mt-2.5 flex items-center justify-between">
            <span
              className="text-[8px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded border"
              style={{ 
                color: statusColor, 
                borderColor: `${statusColor}30`, 
                backgroundColor: `${statusColor}10` 
              }}
            >
              {status}
            </span>

            {/* Connection count */}
            {data.connectionCount > 0 && (
              <div className="flex items-center gap-1 text-zinc-500">
                <Share2 className="w-3 h-3" />
                <span className="text-[9px] font-mono">
                  {data.connectionCount}
                </span>
              </div>
            )}
          </div>

          {/* ── Selected node chat hint ── */}
          {selected && (
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1
                            border rounded-full px-2 py-0.5 animate-pulse"
                 style={{ backgroundColor: `${theme.accent}15`, borderColor: `${theme.accent}40` }}>
              <MessageSquare className="w-2 h-2" style={{ color: theme.accent }} />
              <span className="text-[7px] font-mono" style={{ color: theme.accent }}>CHAT</span>
            </div>
          )}

          {/* ── Subtle glow line at bottom ── */}
          <div
            className="absolute bottom-0 left-3 right-3 h-[1px] opacity-40"
            style={{
              background: `linear-gradient(90deg, transparent, ${layerColor}, transparent)`,
            }}
          />
        </div>
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
