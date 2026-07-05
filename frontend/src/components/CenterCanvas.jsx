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
import { Radar, Loader2, Route, ChevronDown, X } from "lucide-react";
import DistrictNode from "./DistrictNode";

const nodeTypes = { district: DistrictNode };

// ── Layout: arrange nodes using dagre ──
function computeLayout(districts) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Set layout direction (Top to Bottom) and spacing as requested
  dagreGraph.setGraph({ rankdir: 'TB', ranker: 'longest-path', nodesep: 100, ranksep: 200 });

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
      },
    });
    // Set node dimensions in dagre (approximate size of DistrictNode)
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
          const hasViolation = sourceStatus === "CRITICAL" || targetStatus === "CRITICAL";

          edges.push({
            id: `${d.id}-${targetId}`,
            source: d.id,
            target: targetId,
            animated: true,
            style: {
              stroke: hasViolation ? "#FF3B3B" : "#00FF00",
              strokeWidth: 2,
              opacity: 0.6,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: hasViolation ? "#FF3B3B" : "#00FF00",
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
}) {
  const [traceDropdownOpen, setTraceDropdownOpen] = useState(false);

  const { layoutNodes, layoutEdges } = useMemo(() => {
    if (!auditData?.districts) return { layoutNodes: [], layoutEdges: [] };
    const { nodes, edges } = computeLayout(auditData.districts);
    return { layoutNodes: nodes, layoutEdges: edges };
  }, [auditData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Sync layout when auditData changes
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

  // ── Execution Trace Logic ──
  useEffect(() => {
    if (!activeTrace) {
      // Clear trace state
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isTraced: false, isTraceDimmed: false },
        }))
      );
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          className: "",
          style: { ...e.style, opacity: 0.6 },
        }))
      );
      return;
    }

    const tracePath = new Set(activeTrace.path);

    // Build trace edges (pairs of consecutive nodes in the path)
    const traceEdgePairs = new Set();
    for (let i = 0; i < activeTrace.path.length - 1; i++) {
      traceEdgePairs.add(`${activeTrace.path[i]}-${activeTrace.path[i + 1]}`);
      // Also check reverse since edges might go either direction
      traceEdgePairs.add(`${activeTrace.path[i + 1]}-${activeTrace.path[i]}`);
    }

    // Update nodes: traced or dimmed
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isTraced: tracePath.has(n.id),
          isTraceDimmed: !tracePath.has(n.id),
        },
      }))
    );

    // Update edges: traced or dimmed
    setEdges((eds) =>
      eds.map((e) => {
        const isTraceEdge = traceEdgePairs.has(e.id);
        return {
          ...e,
          className: isTraceEdge ? "trace-active" : "trace-dimmed",
          animated: isTraceEdge,
          style: isTraceEdge
            ? { stroke: "#00BFFF", strokeWidth: 3, opacity: 1 }
            : { stroke: "#1a1a1e", strokeWidth: 1, opacity: 0.2 },
        };
      })
    );
  }, [activeTrace, setNodes, setEdges]);

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
      <div className="flex-1 bg-canvas grid-bg flex items-center justify-center">
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
      <div className="flex-1 bg-canvas grid-bg flex items-center justify-center scanline">
        <div className="text-center animate-fade-in">
          <Loader2 className="w-12 h-12 text-accent mx-auto mb-4 animate-spin" />
          <p className="text-sm font-mono text-accent text-glow">
            SCANNING ARCHITECTURE...
          </p>
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="flex-1 bg-canvas grid-bg flex items-center justify-center">
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

  // ── React Flow Canvas ──
  return (
    <div className="flex-1 bg-canvas flex flex-col relative">
      {/* ── Mock Data Warning Banner ── */}
      {auditData?.isMock && (
        <div className="absolute top-0 left-0 right-0 bg-red-500/90 text-white text-xs font-semibold py-1.5 px-4 flex items-center justify-center gap-2 z-50">
          <span>⚠️</span>
          <span>
            {auditData.apiError || "API Error"} — Displaying Failsafe Mock Data. The graph below is not unique to this repository.
          </span>
        </div>
      )}

      {/* ── Execution Trace Toolbar ── */}
      {traces.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-panel/80 backdrop-blur-sm z-10">
          <Route className="w-4 h-4 text-sky-400" />
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            Simulate Execution Trace
          </span>

          {/* Dropdown */}
          <div className="relative">
            <button
              onClick={() => setTraceDropdownOpen(!traceDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                activeTrace
                  ? "bg-sky-500/10 border-sky-500/40 text-sky-400"
                  : "bg-canvas border-border text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
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

          {/* Trace path visualization */}
          {activeTrace && (
            <div className="ml-auto flex items-center gap-1 text-[10px] font-mono text-sky-400/60">
              {activeTrace.path.map((nodeId, i) => (
                <React.Fragment key={nodeId}>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                    {nodeId.replace("dist-", "")}
                  </span>
                  {i < activeTrace.path.length - 1 && (
                    <span className="text-sky-500">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
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
          <Background color="#27272A" gap={20} size={1} />
          <Controls
            showInteractive={false}
            position="bottom-left"
          />
          <MiniMap
            nodeColor={(n) => {
              if (n.data?.isTraceDimmed) return "#1a1a1e";
              if (n.data?.isTraced) return "#00BFFF";
              if (n.selected) return "#00FF00";
              if (n.data?.status === "CRITICAL") return "#FF3B3B";
              if (n.data?.status === "WARNING") return "#FF8C00";
              return "#27272A";
            }}
            maskColor="rgba(14, 15, 17, 0.8)"
            position="bottom-right"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
