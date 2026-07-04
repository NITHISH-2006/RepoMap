import React from "react";
import { Shield, Radio } from "lucide-react";

const AUDIENCE_LABELS = {
  student: "School Student",
  junior: "Junior Developer",
  senior: "Senior Architect",
  pm: "Product Manager",
};

const AUDIENCE_ICONS = {
  student: "🎓",
  junior: "💻",
  senior: "🏗️",
  pm: "📊",
};

export default function Header({ audience, setAudience, audiences, isOnline }) {
  return (
    <header className="h-14 flex-shrink-0 bg-panel border-b border-border flex items-center justify-between px-4 z-50">
      {/* ── Logo ── */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
          <Shield className="w-4 h-4 text-accent" />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold tracking-wide text-white">
            REPOMAP <span className="text-accent text-glow">SENTINEL</span>
          </h1>
          <span className="text-[10px] font-mono text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">
            v1.0
          </span>
        </div>
      </div>

      {/* ── Audience Switcher ── */}
      <div className="flex items-center gap-1 bg-canvas rounded-lg p-1 border border-border">
        {audiences.map((aud) => (
          <button
            key={aud}
            onClick={() => setAudience(aud)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
              ${
                audience === aud
                  ? "bg-accent/15 text-accent border border-accent/30 shadow-[0_0_10px_rgba(0,255,0,0.15)]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"
              }
            `}
          >
            <span className="text-sm">{AUDIENCE_ICONS[aud]}</span>
            <span className="hidden lg:inline">{AUDIENCE_LABELS[aud]}</span>
          </button>
        ))}
      </div>

      {/* ── Status Indicator ── */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <Radio
            className={`w-3 h-3 ${isOnline ? "text-accent animate-pulse" : "text-red-500"}`}
          />
          <span className={isOnline ? "text-accent/80" : "text-red-400"}>
            {isOnline ? "ENGINE ONLINE" : "OFFLINE"}
          </span>
        </div>
      </div>
    </header>
  );
}
