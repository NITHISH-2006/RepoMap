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

      {/* ── District Status Summary ── */}
      <div className="bg-canvas rounded-xl border border-border p-4">
        <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">
          District Health Overview
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {["COMPLIANT", "WARNING", "CRITICAL"].map((status) => {
            const count =
              auditData.districts?.filter((d) => d.status === status).length || 0;
            const colors = {
              COMPLIANT: "text-status-compliant bg-status-compliant/10 border-status-compliant/20",
              WARNING: "text-status-warning bg-status-warning/10 border-status-warning/20",
              CRITICAL: "text-status-critical bg-status-critical/10 border-status-critical/20",
            };
            return (
              <div
                key={status}
                className={`text-center py-2 rounded-lg border ${colors[status]}`}
              >
                <div className="text-lg font-bold">{count}</div>
                <div className="text-[9px] font-mono tracking-wider">{status}</div>
              </div>
            );
          })}
        </div>
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
