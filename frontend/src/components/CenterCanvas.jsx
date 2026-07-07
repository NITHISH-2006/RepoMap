import React, { useMemo, useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import { Radar, Loader2, Route, ChevronDown, X, Play, Pause, Eye, EyeOff } from "lucide-react";
import DistrictNode from "./DistrictNode";
import { getRepoTheme } from "../data/themes";

const nodeTypes = { district: DistrictNode };

// ── Layout: arrange nodes using dagre ──
function computeLayout(districts, architectureType, theme, audience) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Dynamic layout tweaks based on node density
  const nodeCount = districts.length;
  const ranksep = nodeCount > 7 ? 160 : 200;
  const nodesep = nodeCount > 7 ? 80 : 120;
  
  dagreGraph.setGraph({ 
    rankdir: 'TB', 
    ranker: 'longest-path', 
    nodesep: nodesep, 
    ranksep: ranksep 
  });

  const nodes = [];
  const edges = [];

  // 1. Prepare nodes
  districts.forEach((d) => {
    nodes.push({
      id: d.id,
      type: "district",
      position: { x: 0, y: 0 },
      data: {
        name: d.name,
        layer: d.layer,
        status: d.status || "COMPLIANT",
        connectionCount: d.connectsTo?.length || 0,
        isTraced: false,
        isTraceDimmed: false,
        isActiveNode: false,
        theme: theme,
        architectureType: architectureType,
        audience: audience,
        descriptions: d.descriptions,
      },
    });
    dagreGraph.setNode(d.id, { width: 300, height: 150 });
  });

  // 2. Prepare edges
  const nodeIdSet = new Set(districts.map((d) => d.id));
  districts.forEach((d) => {
    if (d.connectsTo) {
      d.connectsTo.forEach((targetId) => {
        if (nodeIdSet.has(targetId)) {
          const sourceStatus = d.status || "COMPLIANT";
          const targetDistrict = districts.find((t) => t.id === targetId);
          const targetStatus = targetDistrict?.status || "COMPLIANT";
          
          let edgeColor = theme.compliant;
          if (sourceStatus === "CRITICAL" || targetStatus === "CRITICAL") {
            edgeColor = theme.critical;
          } else if (sourceStatus === "WARNING" || targetStatus === "WARNING") {
            edgeColor = theme.warning;
          }

          // Thickness based on target node in-degree (connection strength)
          const targetInDegree = districts.filter(dist => dist.connectsTo?.includes(targetId)).length;
          const strokeWidth = targetInDegree > 2 ? 3 : targetInDegree > 1 ? 2 : 1.5;

          edges.push({
            id: `${d.id}-${targetId}`,
            source: d.id,
            target: targetId,
            animated: true,
            style: {
              stroke: edgeColor,
              strokeWidth: strokeWidth,
              opacity: 0.6,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: edgeColor,
            },
          });
          dagreGraph.setEdge(d.id, targetId);
        }
      });
    }
  });

  // 3. Compute layout
  dagre.layout(dagreGraph);

  // 4. Apply calculated positions
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = 'top';
    node.sourcePosition = 'bottom';
    node.position = {
      x: nodeWithPosition.x - 150, // shift by half width to center
      y: nodeWithPosition.y - 75,  // shift by half height to center
    };
  });

  return { nodes, edges };
}

export default function CenterCanvas({
  auditData,
  selectedDistrictId,
  onNodeClick,
  isLoading,
  error,
  activeTrace,
  setActiveTrace,
  audience,
}) {
  const [traceDropdownOpen, setTraceDropdownOpen] = useState(false);
  const [showScanline, setShowScanline] = useState(true);

  // Playback States
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  // Get dynamic repo theme
  const theme = useMemo(() => {
    const projName = auditData?.projectName || auditData?.detectedArchitecture || "";
    return getRepoTheme(projName);
  }, [auditData]);

  const { layoutNodes, layoutEdges } = useMemo(() => {
    if (!auditData?.districts) return { layoutNodes: [], layoutEdges: [] };
    const { nodes, edges } = computeLayout(auditData.districts, auditData.detectedArchitecture, theme, audience);
    return { layoutNodes: nodes, layoutEdges: edges };
  }, [auditData, theme, audience]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Sync layout when auditData or theme changes
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  // Update selection state
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === selectedDistrictId,
      }))
    );
  }, [selectedDistrictId, setNodes]);

  // Reset playback index when trace changes
  useEffect(() => {
    setPlaybackIndex(0);
    setIsPlaying(false);
  }, [activeTrace]);

  // Handle trace playback ticking
  useEffect(() => {
    if (!isPlaying || !activeTrace) return;
    const interval = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= activeTrace.path.length - 1) {
          return 0; // Loop simulation
        }
        return prev + 1;
      });
    }, playbackSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, activeTrace, playbackSpeed]);

  // ── Trace Playback Highlight Logic ──
  useEffect(() => {
    if (!activeTrace) {
      // Reset layout state to default
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isTraced: false, isTraceDimmed: false, isActiveNode: false },
        }))
      );
      setEdges((eds) =>
        eds.map((e) => {
          const sourceStatus = auditData?.districts?.find(d => d.id === e.source)?.status || "COMPLIANT";
          const targetStatus = auditData?.districts?.find(d => d.id === e.target)?.status || "COMPLIANT";
          
          let edgeColor = theme.compliant;
          if (sourceStatus === "CRITICAL" || targetStatus === "CRITICAL") {
            edgeColor = theme.critical;
          } else if (sourceStatus === "WARNING" || targetStatus === "WARNING") {
            edgeColor = theme.warning;
          }

          return {
            ...e,
            className: "",
            style: { ...e.style, stroke: edgeColor, strokeWidth: e.style?.strokeWidth || 2, opacity: 0.6 },
            markerEnd: {
              ...e.markerEnd,
              color: edgeColor,
            }
          };
        })
      );
      return;
    }

    const trailNodes = new Set(activeTrace.path.slice(0, playbackIndex + 1));
    const activeNodeId = activeTrace.path[playbackIndex];

    // Build active edges up to the current index in the path
    const activeTraceEdges = new Set();
    for (let i = 0; i < playbackIndex; i++) {
      activeTraceEdges.add(`${activeTrace.path[i]}-${activeTrace.path[i + 1]}`);
      activeTraceEdges.add(`${activeTrace.path[i + 1]}-${activeTrace.path[i]}`);
    }

    // Update Nodes
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isTraced: trailNodes.has(n.id),
          isActiveNode: n.id === activeNodeId,
          isTraceDimmed: !trailNodes.has(n.id),
        },
      }))
    );

    // Update Edges (flowing particles and glow for active edges)
    setEdges((eds) =>
      eds.map((e) => {
        const isTraceEdge = activeTraceEdges.has(e.id);
        const isPendingEdge = !isTraceEdge && activeTrace.path.includes(e.source) && activeTrace.path.includes(e.target);

        return {
          ...e,
          className: isTraceEdge ? "trace-active" : isPendingEdge ? "trace-pending" : "trace-dimmed",
          animated: isTraceEdge,
          style: isTraceEdge
            ? { stroke: theme.accent, strokeWidth: 3.5, opacity: 1 }
            : { stroke: "#1c1e22", strokeWidth: 1, opacity: 0.15 },
          markerEnd: {
            ...e.markerEnd,
            color: isTraceEdge ? theme.accent : "#1c1e22",
          }
        };
      })
    );
  }, [activeTrace, playbackIndex, theme, setNodes, setEdges, auditData]);

  const handleNodeClick = useCallback(
    (_event, node) => {
      onNodeClick(node.id);
    },
    [onNodeClick]
  );

  const traces = auditData?.executionTraces || [];

  // ── Empty State ──
  if (!auditData && !isLoading && !error) {
    return (
      <div className="flex-1 bg-canvas grid-bg flex items-center justify-center" style={{ backgroundColor: theme.bg }}>
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-panel border border-border flex items-center justify-center">
            <Radar className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">
            Awaiting Input
          </h3>
          <p className="text-sm text-zinc-600 max-w-xs mx-auto">
            Paste a directory tree, a GitHub URL, or select a Quick-Scan preset,
            then execute analysis to visualize the architecture map.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="flex-1 bg-canvas grid-bg flex items-center justify-center scanline" style={{ backgroundColor: theme.bg }}>
        <div className="text-center animate-fade-in">
          <Loader2 className="w-12 h-12 text-accent mx-auto mb-4 animate-spin" style={{ color: theme.accent }} />
          <p className="text-sm font-mono text-glow" style={{ color: theme.accent, textShadow: `0 0 10px ${theme.accent}` }}>
            SCANNING ARCHITECTURE...
          </p>
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="flex-1 bg-canvas grid-bg flex items-center justify-center" style={{ backgroundColor: theme.bg }}>
        <div className="text-center animate-fade-in max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-red-400 mb-2">
            Analysis Failed
          </h3>
          <p className="text-sm text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 bg-canvas flex flex-col relative ${showScanline ? "scanline" : ""}`} style={{ backgroundColor: theme.bg }}>
      {/* ── Mock Data Warning Banner ── */}
      {auditData?.isMock && (
        <div className="absolute top-0 left-0 right-0 bg-red-500/90 text-white text-xs font-semibold py-1.5 px-4 flex items-center justify-center gap-2 z-50">
          <span>⚠️</span>
          <span>
            {auditData.apiError || "API Error"} — Displaying Failsafe Mock Data. The graph below is not unique to this repository.
          </span>
        </div>
      )}

      {/* ── Dynamic Theme Brand Banner ── */}
      {auditData && (
        <div className="absolute bottom-4 right-4 z-40 bg-panel/75 backdrop-blur-md border border-border px-3 py-1.5 rounded-lg flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.accent }} />
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Theme: <span className="text-white font-bold">{theme.name}</span>
          </span>
        </div>
      )}

      {/* ── Execution Trace Toolbar & Playback controls ── */}
      {traces.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-panel/80 backdrop-blur-sm z-10">
          <Route className="w-4 h-4 text-sky-400" style={{ color: theme.accent }} />
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            Simulate Trace
          </span>

          {/* Trace Dropdown */}
          <div className="relative">
            <button
              onClick={() => setTraceDropdownOpen(!traceDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                activeTrace
                  ? "bg-sky-500/10 border-sky-500/40 text-sky-400"
                  : "bg-canvas border-border text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
              style={activeTrace ? { color: theme.accent, borderColor: `${theme.accent}40`, backgroundColor: `${theme.accent}10` } : {}}
            >
              {activeTrace ? activeTrace.name : "Select Trace"}
              <ChevronDown
                className={`w-3 h-3 transition-transform ${
                  traceDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {traceDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-panel border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-up">
                {traces.map((trace, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveTrace(trace);
                      setTraceDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-xs border-b border-border/50 last:border-0
                               transition-all duration-200 ${
                                 activeTrace?.name === trace.name
                                   ? "bg-sky-500/10 text-sky-400"
                                   : "text-zinc-300 hover:bg-canvas/80 hover:text-white"
                               }`}
                    style={activeTrace?.name === trace.name ? { backgroundColor: `${theme.accent}10`, color: theme.accent } : {}}
                  >
                    <div className="font-semibold mb-0.5">{trace.name}</div>
                    <div className="text-[10px] text-zinc-500">
                      {trace.description}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-600 mt-1">
                      {trace.path.join(" → ")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Trace Playback Controls */}
          {activeTrace && (
            <div className="flex items-center gap-3 border-l border-zinc-700/50 pl-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-all flex items-center justify-center"
                title={isPlaying ? "Pause Simulation" : "Play Simulation"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                <span>Speed:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-1 py-0.5 text-[9px] focus:outline-none"
                >
                  <option value={2000}>0.5x</option>
                  <option value={1000}>1.0x</option>
                  <option value={500}>2.0x</option>
                </select>
              </div>

              {/* Scrubber timeline */}
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <input
                  type="range"
                  min={0}
                  max={activeTrace.path.length - 1}
                  value={playbackIndex}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setPlaybackIndex(Number(e.target.value));
                  }}
                  className="w-24 h-1 bg-zinc-800 rounded-lg cursor-pointer accent-accent"
                  style={{ accentColor: theme.accent }}
                />
                <span className="text-[9px] text-zinc-500">
                  {playbackIndex + 1}/{activeTrace.path.length}
                </span>
              </div>
            </div>
          )}

          {/* Clear trace button */}
          {activeTrace && (
            <button
              onClick={() => {
                setActiveTrace(null);
                setTraceDropdownOpen(false);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-zinc-400
                         hover:text-white hover:bg-zinc-800 transition-all border border-transparent hover:border-border"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}

          {/* Scanline & Grid Effect Controls */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowScanline(!showScanline)}
              className={`p-1.5 rounded-lg border text-zinc-400 hover:text-zinc-200 transition-all flex items-center gap-1 ${
                showScanline ? "bg-accent/10 border-accent/30 text-accent" : "bg-zinc-800 border-zinc-700"
              }`}
              style={showScanline ? { color: theme.accent, borderColor: `${theme.accent}30`, backgroundColor: `${theme.accent}10` } : {}}
              title="Toggle Matrix Scanline Animation"
            >
              {showScanline ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="text-[9px] font-mono hidden md:inline">SCANLINE</span>
            </button>
          </div>
        </div>
      )}

      {/* ── React Flow ── */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color={theme.gridColor} gap={20} size={1} />
          <Controls
            showInteractive={false}
            position="bottom-left"
          />
          <MiniMap
            nodeColor={(n) => {
              if (n.data?.isTraceDimmed) return "#131416";
              if (n.data?.isActiveNode) return theme.accent;
              if (n.data?.isTraced) return `${theme.accent}aa`;
              if (n.selected) return theme.accent;
              if (n.data?.status === "CRITICAL") return theme.critical;
              if (n.data?.status === "WARNING") return theme.warning;
              return theme.compliant;
            }}
            maskColor="rgba(8, 9, 11, 0.85)"
            position="bottom-right"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
