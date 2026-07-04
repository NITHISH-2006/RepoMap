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

function DistrictNode({ data, selected }) {
  const layer = data.layer?.toLowerCase() || "shared";
  const config = LAYER_CONFIG[layer] || LAYER_CONFIG.shared;
  const IconComponent = config.icon || Box;
  const hasViolation = data.hasViolation;

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
            selected
              ? "border-accent shadow-[0_0_20px_rgba(0,255,0,0.25)] scale-105"
              : hasViolation
              ? "border-severity-critical/50 animate-violation-pulse shadow-[0_0_15px_rgba(255,59,59,0.2)]"
              : "border-border hover:border-zinc-500 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          }
        `}
      >
        {/* ── Violation indicator ── */}
        {hasViolation && (
          <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-severity-critical border-2 border-panel flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">!</span>
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

        {/* ── Connection count ── */}
        {data.connectionCount > 0 && (
          <div className="mt-2 flex items-center gap-1 text-zinc-500">
            <Share2 className="w-3 h-3" />
            <span className="text-[10px] font-mono">
              {data.connectionCount} connection{data.connectionCount !== 1 ? "s" : ""}
            </span>
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
