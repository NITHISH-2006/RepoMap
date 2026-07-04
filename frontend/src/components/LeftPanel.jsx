import React, { useState, useEffect, useRef } from "react";
import { Play, Terminal, FolderTree, Zap } from "lucide-react";
import { PRESETS } from "../data/presets";
import { TERMINAL_LINES } from "../data/terminalLines";

export default function LeftPanel({ onExecute, isLoading }) {
  const [fileTree, setFileTree] = useState("");
  const [terminalOutput, setTerminalOutput] = useState([]);
  const terminalRef = useRef(null);
  const timeoutsRef = useRef([]);

  // ── Simulated Terminal Animation ──
  useEffect(() => {
    // Clear previous timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (isLoading) {
      setTerminalOutput([]);
      TERMINAL_LINES.forEach(({ text, delay }) => {
        const timeout = setTimeout(() => {
          setTerminalOutput((prev) => [...prev, text]);
        }, delay);
        timeoutsRef.current.push(timeout);
      });
    } else {
      // Keep the terminal output visible after loading completes
    }

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [isLoading]);

  // ── Auto-scroll terminal ──
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const handlePresetClick = (preset) => {
    setFileTree(preset.tree);
    setTerminalOutput([]);
  };

  const handleExecute = () => {
    if (!fileTree.trim() || isLoading) return;
    onExecute(fileTree.trim());
  };

  return (
    <aside className="w-80 flex-shrink-0 bg-panel border-r border-border flex flex-col overflow-hidden">
      {/* ── Section Header ── */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <FolderTree className="w-4 h-4 text-accent" />
        <h2 className="text-xs font-semibold tracking-widest text-zinc-300 uppercase">
          Ingestion Engine
        </h2>
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
              disabled={isLoading}
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
          placeholder="Paste your tree /F output here..."
          disabled={isLoading}
          className="flex-1 min-h-[120px] w-full bg-canvas border border-border rounded-lg p-3
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
          disabled={!fileTree.trim() || isLoading}
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
            {isLoading && (
              <span className="inline-block w-2 h-3.5 bg-accent animate-terminal-blink ml-1" />
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
