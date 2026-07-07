import React, { useState } from "react";
import {
  Info,
  ShieldAlert,
  FileText,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import TicketModal from "./TicketModal";
import AgentChat from "./AgentChat";

const AUDIENCE_LABELS = {
  student: "🎓 School Student",
  junior: "💻 Junior Developer",
  senior: "🏗️ Senior Architect",
  pm: "📊 Product Manager",
};

const SEVERITY_CONFIG = {
  critical: {
    color: "text-severity-critical",
    bg: "bg-severity-critical/10",
    border: "border-severity-critical/30",
    icon: AlertCircle,
    label: "CRITICAL",
  },
  high: {
    color: "text-severity-high",
    bg: "bg-severity-high/10",
    border: "border-severity-high/30",
    icon: AlertTriangle,
    label: "HIGH",
  },
  medium: {
    color: "text-severity-medium",
    bg: "bg-severity-medium/10",
    border: "border-severity-medium/30",
    icon: AlertTriangle,
    label: "MEDIUM",
  },
  low: {
    color: "text-severity-low",
    bg: "bg-severity-low/10",
    border: "border-severity-low/30",
    icon: Info,
    label: "LOW",
  },
};

const GRADE_COLORS = {
  A: "text-grade-a border-grade-a/40 bg-grade-a/10",
  B: "text-grade-b border-grade-b/40 bg-grade-b/10",
  C: "text-grade-c border-grade-c/40 bg-grade-c/10",
  D: "text-grade-d border-grade-d/40 bg-grade-d/10",
  F: "text-grade-f border-grade-f/40 bg-grade-f/10",
};

export default function RightPanel({
  auditData,
  selectedDistrict,
  audience,
  chatMessages,
  onChatSend,
  isChatLoading,
}) {
  const [activeTab, setActiveTab] = useState("inspector");
  const [showTicketModal, setShowTicketModal] = useState(false);

  const tabs = [
    { id: "inspector", label: "Inspector", icon: Info },
    { id: "chat", label: "Agent Chat", icon: MessageSquare },
    { id: "audit", label: "Audit", icon: ShieldAlert },
  ];

  return (
    <>
      <aside className="w-96 flex-shrink-0 bg-panel border-l border-border flex flex-col overflow-hidden">
        {/* ── Tab Switcher ── */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-semibold
                  tracking-wider uppercase transition-all duration-200 border-b-2
                  ${
                    activeTab === tab.id
                      ? tab.id === "chat"
                        ? "text-sky-400 border-sky-400 bg-sky-400/5"
                        : "text-accent border-accent bg-accent/5"
                      : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/30"
                  }
                `}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "inspector" ? (
            <div className="flex-1 overflow-y-auto">
              <InspectorTab
                district={selectedDistrict}
                audience={audience}
              />
            </div>
          ) : activeTab === "chat" ? (
            <AgentChat
              selectedDistrict={selectedDistrict}
              chatMessages={chatMessages}
              onSendMessage={onChatSend}
              isChatLoading={isChatLoading}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <AuditTab auditData={auditData} />
            </div>
          )}
        </div>

        {/* ── Generate Ticket Button ── */}
        {auditData && (
          <div className="p-4 border-t border-border">
            <button
              onClick={() => setShowTicketModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                         bg-accent/10 border border-accent/30 text-accent text-sm font-semibold
                         hover:bg-accent/20 hover:border-accent/60 hover:shadow-[0_0_20px_rgba(0,255,0,0.2)]
                         transition-all duration-300 active:scale-[0.98]"
            >
              <FileText className="w-4 h-4" />
              Generate Onboarding Ticket
            </button>
          </div>
        )}
      </aside>

      {/* ── Ticket Modal ── */}
      {showTicketModal && (
        <TicketModal
          auditData={auditData}
          selectedDistrict={selectedDistrict}
          audience={audience}
          onClose={() => setShowTicketModal(false)}
        />
      )}
    </>
  );
}

// ─── Inspector Tab ───────────────────────────────────────────────────────────
function InspectorTab({ district, audience }) {
  if (!district) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-canvas border border-border flex items-center justify-center">
            <ChevronRight className="w-6 h-6 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-500">
            Select a district node on the canvas to inspect its details.
          </p>
        </div>
      </div>
    );
  }

  const description = district.descriptions?.[audience] || "No description available.";
  const status = district.status || "COMPLIANT";

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* ── District Header ── */}
      <div className="bg-canvas rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            District ID: {district.id}
          </span>
          <span
            className={`text-[9px] font-mono font-bold tracking-widest px-2 py-0.5 rounded border ${
              status === "CRITICAL"
                ? "text-status-critical border-status-critical/30 bg-status-critical/10"
                : status === "WARNING"
                ? "text-status-warning border-status-warning/30 bg-status-warning/10"
                : "text-status-compliant border-status-compliant/30 bg-status-compliant/10"
            }`}
          >
            {status}
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{district.name}</h3>
        <span
          className="inline-block text-[10px] font-mono font-semibold tracking-widest uppercase
                     px-2 py-0.5 rounded border border-zinc-600 text-zinc-400"
        >
          {district.layer}
        </span>
      </div>

      {/* ── Audience Badge ── */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] font-mono text-accent/60 uppercase tracking-widest">
          Viewing as:
        </span>
        <span className="text-xs font-semibold text-accent">
          {AUDIENCE_LABELS[audience]}
        </span>
      </div>

      {/* ── Description ── */}
      <div className="bg-canvas rounded-xl border border-border p-4">
        <p className="text-sm text-zinc-300 leading-relaxed">{description}</p>
      </div>

      {/* ── Connections ── */}
      {district.connectsTo && district.connectsTo.length > 0 && (
        <div className="bg-canvas rounded-xl border border-border p-4">
          <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
            Dependencies
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {district.connectsTo.map((id) => (
              <span
                key={id}
                className="text-xs font-mono px-2 py-1 rounded bg-accent/5 border border-accent/20 text-accent/70"
              >
                {id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Audit Tab ───────────────────────────────────────────────────────────────
function AuditTab({ auditData }) {
  if (!auditData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-zinc-500 text-center">
          Run an analysis to view the global audit report.
        </p>
      </div>
    );
  }

  const gradeClass = GRADE_COLORS[auditData.technicalDebtGrade] || GRADE_COLORS.C;

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* ── Architecture & Grade ── */}
      <div className="bg-canvas rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
              Detected Architecture
            </p>
            <p className="text-sm font-semibold text-white">
              {auditData.detectedArchitecture}
            </p>
          </div>
          <div
            className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center ${gradeClass}`}
          >
            <span className="text-2xl font-bold">
              {auditData.technicalDebtGrade}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
          <span>{auditData.districts?.length || 0} Districts</span>
          <span>•</span>
          <span>{auditData.complianceViolations?.length || 0} Violations</span>
          <span>•</span>
          <span>{auditData.executionTraces?.length || 0} Traces</span>
        </div>
      </div>

      {/* ── District Status Summary Bar Chart ── */}
      <div className="bg-canvas rounded-xl border border-border p-4">
        <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">
          District Health Distribution
        </h4>
        <HealthBarChart districts={auditData.districts || []} />
      </div>

      {/* ── Violation Severity Donut Chart ── */}
      <div className="bg-canvas rounded-xl border border-border p-4">
        <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">
          Violation Severity Ratio
        </h4>
        <ViolationDonutChart violations={auditData.complianceViolations || []} />
      </div>

      {/* ── Compliance Violations ── */}
      <div>
        <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 px-1">
          Compliance Violations
        </h4>
        <div className="space-y-2">
          {auditData.complianceViolations?.map((v, i) => {
            const sev =
              SEVERITY_CONFIG[v.severity?.toLowerCase()] || SEVERITY_CONFIG.medium;
            const SevIcon = sev.icon;
            return (
              <ViolationCard key={i} violation={v} config={sev} Icon={SevIcon} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Violation Card ──────────────────────────────────────────────────────────
function ViolationCard({ violation, config, Icon }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden transition-all duration-200`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[9px] font-mono font-bold tracking-widest ${config.color}`}
            >
              {config.label}
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {violation.issue}
          </p>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 mt-0.5 flex-shrink-0 ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-0 ml-7 animate-slide-up">
          <div className="border-t border-zinc-700/50 pt-2">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
              Remediation
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {violation.remediation}
            </p>
            {violation.affectedDistricts && violation.affectedDistricts.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
                  Affected Districts
                </p>
                <div className="flex flex-wrap gap-1">
                  {violation.affectedDistricts.map((id) => (
                    <span
                      key={id}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${config.border} ${config.color}`}
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SVG Violation Donut Chart ──────────────────────────────────────────────
function ViolationDonutChart({ violations }) {
  const counts = {
    critical: violations.filter(v => v.severity?.toLowerCase() === 'critical').length,
    high: violations.filter(v => v.severity?.toLowerCase() === 'high').length,
    medium: violations.filter(v => v.severity?.toLowerCase() === 'medium').length,
    low: violations.filter(v => v.severity?.toLowerCase() === 'low').length,
  };

  const total = counts.critical + counts.high + counts.medium + counts.low;
  if (total === 0) {
    return (
      <div className="text-center py-4 text-zinc-500 font-mono text-xs">
        No compliance violations detected ✓
      </div>
    );
  }

  const r = 24;
  const circ = 2 * Math.PI * r;
  
  const segments = [
    { name: "Critical", count: counts.critical, color: "#FF3B3B", shadow: "rgba(255, 59, 59, 0.3)" },
    { name: "High", count: counts.high, color: "#FF8C00", shadow: "rgba(255, 140, 0, 0.3)" },
    { name: "Medium", count: counts.medium, color: "#FBBF24", shadow: "rgba(251, 191, 36, 0.3)" },
    { name: "Low", count: counts.low, color: "#00BFFF", shadow: "rgba(0, 191, 255, 0.3)" },
  ].filter(s => s.count > 0);

  let currentOffset = 0;

  return (
    <div className="flex items-center gap-5 p-2.5 bg-panel rounded-xl border border-border/40">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="transparent" stroke="#141517" strokeWidth="5.5" />
          {segments.map((seg, i) => {
            const pct = (seg.count / total) * circ;
            const strokeDash = `${pct} ${circ - pct}`;
            const strokeOffset = -currentOffset;
            currentOffset += pct;
            return (
              <circle
                key={i}
                cx="32"
                cy="32"
                r={r}
                fill="transparent"
                stroke={seg.color}
                strokeWidth="5.5"
                strokeDasharray={strokeDash}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 4px ${seg.shadow})`
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-base font-bold text-white leading-none">{total}</span>
          <span className="text-[7px] font-mono text-zinc-500 tracking-wider uppercase mt-1">Alerts</span>
        </div>
      </div>

      <div className="flex-1 space-y-1.5 min-w-0">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between text-[10px] font-mono leading-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-zinc-400 truncate">{seg.name}</span>
            </div>
            <span className="text-white font-bold ml-2">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SVG District Health Bar Chart ──────────────────────────────────────────
function HealthBarChart({ districts }) {
  const counts = {
    compliant: districts.filter(d => d.status === 'COMPLIANT').length,
    warning: districts.filter(d => d.status === 'WARNING').length,
    critical: districts.filter(d => d.status === 'CRITICAL').length,
  };
  const total = districts.length;
  if (total === 0) return null;

  const maxVal = Math.max(counts.compliant, counts.warning, counts.critical, 1);

  const bars = [
    { label: "COMPLIANT", count: counts.compliant, color: "#10B981", bg: "bg-[#10B981]/15", border: "border-[#10B981]/25" },
    { label: "WARNING", count: counts.warning, color: "#F59E0B", bg: "bg-[#F59E0B]/15", border: "border-[#F59E0B]/25" },
    { label: "CRITICAL", count: counts.critical, color: "#EF4444", bg: "bg-[#EF4444]/15", border: "border-[#EF4444]/25" },
  ];

  return (
    <div className="space-y-3 p-1">
      {bars.map((bar, i) => {
        const pct = (bar.count / maxVal) * 100;
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono leading-none">
              <span className="text-zinc-500 font-bold uppercase tracking-wider">{bar.label}</span>
              <span className="text-zinc-300 font-semibold">{bar.count} module{bar.count !== 1 ? 's' : ''}</span>
            </div>
            <div className={`h-3 w-full bg-canvas rounded-md overflow-hidden border ${bar.border} p-[2px]`}>
              <div
                className="h-full rounded-sm transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: bar.color,
                  boxShadow: `0 0 8px ${bar.color}40`
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
