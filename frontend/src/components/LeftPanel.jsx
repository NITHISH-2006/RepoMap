import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Terminal,
  FolderTree,
  Zap,
  Github,
  Clock,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { PRESETS } from "../data/presets";
import { TERMINAL_LINES, GITHUB_TERMINAL_LINES } from "../data/terminalLines";

const GRADE_COLORS = {
  A: "text-grade-a bg-grade-a/10 border-grade-a/40",
  B: "text-grade-b bg-grade-b/10 border-grade-b/40",
  C: "text-grade-c bg-grade-c/10 border-grade-c/40",
  D: "text-grade-d bg-grade-d/10 border-grade-d/40",
  F: "text-grade-f bg-grade-f/10 border-grade-f/40",
};

export default function LeftPanel({
  onExecute,
  onGitHubFetch,
  onLoadScan,
  onDeleteScan,
  scanHistory,
  isLoading,
  isFetchingGithub,
  activeScanId,
}) {
  const [fileTree, setFileTree] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [deepScan, setDeepScan] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [activeSection, setActiveSection] = useState("input"); // "input" or "history"
  const terminalRef = useRef(null);
  const timeoutsRef = useRef([]);

  // ── Simulated Terminal Animation ──
  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (isLoading || isFetchingGithub) {
      setTerminalOutput([]);
      const lines = isFetchingGithub ? GITHUB_TERMINAL_LINES : TERMINAL_LINES;
      lines.forEach(({ text, delay }) => {
        const timeout = setTimeout(() => {
          setTerminalOutput((prev) => [...prev, text]);
        }, delay);
        timeoutsRef.current.push(timeout);
      });
    }

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [isLoading, isFetchingGithub]);

  // ── Auto-scroll terminal ──
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const handlePresetClick = (preset) => {
    setFileTree(preset.tree);
    setTerminalOutput([]);
    setActiveSection("input");
  };

  const handleExecute = () => {
    if (!fileTree.trim() || isLoading) return;
    onExecute(fileTree.trim());
  };

  const handleGitHubSubmit = () => {
    if (!githubUrl.trim() || isLoading || isFetchingGithub) return;
    onGitHubFetch(githubUrl.trim(), deepScan);
  };

  const isProcessing = isLoading || isFetchingGithub;

  return (
    <aside className="w-80 flex-shrink-0 bg-panel border-r border-border flex flex-col overflow-hidden">
      {/* ── Section Header ── */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <FolderTree className="w-4 h-4 text-accent" />
        <h2 className="text-xs font-semibold tracking-widest text-zinc-300 uppercase">
          Ingestion Engine
        </h2>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveSection("input")}
          className={`flex-1 px-3 py-2 text-[10px] font-semibold tracking-widest uppercase transition-all border-b-2 ${
            activeSection === "input"
              ? "text-accent border-accent bg-accent/5"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          New Scan
        </button>
        <button
          onClick={() => setActiveSection("history")}
          className={`flex-1 px-3 py-2 text-[10px] font-semibold tracking-widest uppercase transition-all border-b-2 flex items-center justify-center gap-1.5 ${
            activeSection === "history"
              ? "text-accent border-accent bg-accent/5"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          <Clock className="w-3 h-3" />
          History
          {scanHistory.length > 0 && (
            <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
              {scanHistory.length}
            </span>
          )}
        </button>
      </div>

      {activeSection === "input" ? (
        <>
          {/* ── GitHub URL Input ── */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Github className="w-3 h-3" />
              GitHub Repository
            </p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                disabled={isProcessing}
                onKeyDown={(e) => e.key === "Enter" && handleGitHubSubmit()}
                className="flex-1 bg-canvas border border-border rounded-lg px-3 py-2
                           text-xs font-mono text-zinc-300 placeholder:text-zinc-600
                           focus:outline-none focus:border-accent/50 focus:shadow-[0_0_10px_rgba(0,255,0,0.1)]
                           transition-all duration-200
                           disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleGitHubSubmit}
                disabled={!githubUrl.trim() || isProcessing}
                className="px-3 py-2 rounded-lg bg-accent/10 border border-accent/30 text-accent
                           text-xs font-semibold hover:bg-accent/20 hover:border-accent/60
                           transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed
                           flex items-center gap-1"
              >
                {isFetchingGithub ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ExternalLink className="w-3 h-3" />
                )}
              </button>
            </div>
            {/* Deep Scan Toggle */}
            <div className="mt-2.5 flex items-center justify-between">
              <label className="text-[10px] font-mono text-zinc-400 cursor-pointer flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={deepScan}
                  onChange={(e) => setDeepScan(e.target.checked)}
                  disabled={isProcessing}
                  className="rounded border-zinc-700 bg-canvas text-accent focus:ring-accent/40 h-3 w-3 accent-accent cursor-pointer"
                  style={{ accentColor: "var(--color-accent, #00FF00)" }}
                />
                Deep Scan (Analyze Code Configs)
              </label>
            </div>
          </div>

          {/* ── Quick-Scan Presets ── */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">
              Quick-Scan Presets
            </p>
            <div className="flex flex-col gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetClick(preset)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium
                             bg-canvas border border-border text-zinc-300
                             hover:border-accent/40 hover:text-accent hover:bg-accent/5
                             transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
                             text-left"
                >
                  <span className="text-base">{preset.icon}</span>
                  <span>{preset.name}</span>
                  <Zap className="w-3 h-3 ml-auto text-zinc-600" />
                </button>
              ))}
            </div>
          </div>

          {/* ── File Tree Input ── */}
          <div className="flex-1 flex flex-col px-4 py-3 min-h-0">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">
              Directory Tree Input
            </p>
            <textarea
              value={fileTree}
              onChange={(e) => setFileTree(e.target.value)}
              placeholder="Paste your tree /F output or a file tree here..."
              disabled={isProcessing}
              className="flex-1 min-h-[100px] w-full bg-canvas border border-border rounded-lg p-3
                         text-xs font-mono text-zinc-300 placeholder:text-zinc-600
                         focus:outline-none focus:border-accent/50 focus:shadow-[0_0_10px_rgba(0,255,0,0.1)]
                         resize-none transition-all duration-200
                         disabled:opacity-40 disabled:cursor-not-allowed"
              spellCheck={false}
            />
          </div>

          {/* ── Execute Button ── */}
          <div className="px-4 py-3 border-t border-border">
            <button
              onClick={handleExecute}
              disabled={!fileTree.trim() || isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                         font-semibold text-sm tracking-wide transition-all duration-300
                         disabled:opacity-30 disabled:cursor-not-allowed
                         bg-accent/10 border border-accent/40 text-accent
                         hover:bg-accent/20 hover:border-accent hover:shadow-[0_0_25px_rgba(0,255,0,0.3)]
                         active:scale-[0.98]
                         animate-pulse-glow"
            >
              <Play className="w-4 h-4" />
              {isLoading ? "ANALYZING..." : "EXECUTE ANALYSIS"}
            </button>
          </div>
        </>
      ) : (
        /* ── Scan History ── */
        <div className="flex-1 overflow-y-auto">
          {scanHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <Clock className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No scan history yet.</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Run your first scan to build history.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {scanHistory.map((scan) => {
                const gradeClass =
                  GRADE_COLORS[scan.debt_grade] || GRADE_COLORS.C;
                const isActive = scan.id === activeScanId;

                return (
                  <button
                    key={scan.id}
                    onClick={() => onLoadScan(scan.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${
                      isActive
                        ? "bg-accent/5 border-accent/30"
                        : "bg-canvas border-border hover:border-zinc-500 hover:bg-zinc-800/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-semibold truncate max-w-[160px] ${
                          isActive ? "text-accent" : "text-zinc-200"
                        }`}
                      >
                        {scan.project_name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${gradeClass}`}
                        >
                          {scan.debt_grade}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteScan(scan.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20
                                     text-zinc-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
                      <span>{scan.architecture_type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-600 mt-1">
                      <span>{scan.district_count || 0} districts</span>
                      <span>•</span>
                      <span>{scan.violation_count || 0} violations</span>
                    </div>
                    <div className="text-[9px] font-mono text-zinc-700 mt-1">
                      {new Date(scan.created_at + "Z").toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Terminal Output ── */}
      {terminalOutput.length > 0 && (
        <div className="border-t border-border">
          <div className="px-4 py-2 flex items-center gap-2 border-b border-border/50">
            <Terminal className="w-3 h-3 text-accent" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              System Log
            </span>
          </div>
          <div
            ref={terminalRef}
            className="h-36 overflow-y-auto px-4 py-2 bg-canvas/50"
          >
            {terminalOutput.map((line, i) => (
              <div
                key={i}
                className={`text-[11px] font-mono leading-relaxed animate-fade-in ${
                  line.includes("✓")
                    ? "text-accent text-glow"
                    : "text-zinc-400"
                }`}
              >
                {line}
              </div>
            ))}
            {isProcessing && (
              <span className="inline-block w-2 h-3.5 bg-accent animate-terminal-blink ml-1" />
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
