import React, { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Radar, Loader2 } from "lucide-react";
import DistrictNode from "./DistrictNode";

const nodeTypes = { district: DistrictNode };

// ── Layout: arrange nodes in a layered grid ──
const LAYER_ORDER = [
  "config",
  "presentation",
  "application",
  "domain",
  "infrastructure",
  "shared",
  "testing",
];

function computeLayout(districts, violations) {
  const violationDistrictIds = new Set();
  if (violations) {
    // Mark districts that might have violations (by keyword matching)
    districts.forEach((d) => {
      violations.forEach((v) => {
        const issueLC = v.issue.toLowerCase();
        const nameLC = d.name.toLowerCase();
        if (issueLC.includes(nameLC) || nameLC.split(" ").some((w) => w.length > 3 && issueLC.includes(w))) {
          violationDistrictIds.add(d.id);
        }
      });
    });
    // If no keyword matches, mark first two districts with critical/high violations
    if (violationDistrictIds.size === 0 && violations.length > 0 && districts.length > 1) {
      violationDistrictIds.add(districts[0].id);
      if (districts.length > 2) violationDistrictIds.add(districts[2].id);
    }
  }

  // Group by layer
  const layerGroups = {};
  districts.forEach((d) => {
    const layer = d.layer?.toLowerCase() || "shared";
    if (!layerGroups[layer]) layerGroups[layer] = [];
    layerGroups[layer].push(d);
  });

  const nodes = [];
  let yOffset = 0;
  const nodeSpacingX = 260;
  const nodeSpacingY = 160;

  LAYER_ORDER.forEach((layer) => {
    const group = layerGroups[layer];
    if (!group) return;

    const totalWidth = group.length * nodeSpacingX;
    const startX = -totalWidth / 2 + nodeSpacingX / 2;

    group.forEach((d, i) => {
      nodes.push({
        id: d.id,
        type: "district",
        position: { x: startX + i * nodeSpacingX, y: yOffset },
        data: {
          name: d.name,
          layer: d.layer,
          hasViolation: violationDistrictIds.has(d.id),
          connectionCount: d.connectsTo?.length || 0,
        },
      });
    });

    yOffset += nodeSpacingY;
  });

  // Also place any districts that didn't match LAYER_ORDER
  const placedLayers = new Set(LAYER_ORDER);
  Object.entries(layerGroups).forEach(([layer, group]) => {
    if (placedLayers.has(layer)) return;
    const totalWidth = group.length * nodeSpacingX;
    const startX = -totalWidth / 2 + nodeSpacingX / 2;

    group.forEach((d, i) => {
      nodes.push({
        id: d.id,
        type: "district",
        position: { x: startX + i * nodeSpacingX, y: yOffset },
        data: {
          name: d.name,
          layer: d.layer,
          hasViolation: violationDistrictIds.has(d.id),
          connectionCount: d.connectsTo?.length || 0,
        },
      });
    });

    yOffset += nodeSpacingY;
  });

  // Build edges
  const nodeIdSet = new Set(districts.map((d) => d.id));
  const edges = [];
  districts.forEach((d) => {
    if (d.connectsTo) {
      d.connectsTo.forEach((targetId) => {
        if (nodeIdSet.has(targetId)) {
          const hasViolation =
            violationDistrictIds.has(d.id) || violationDistrictIds.has(targetId);
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
          });
        }
      });
    }
  });

  return { nodes, edges };
}

export default function CenterCanvas({
  auditData,
  selectedDistrictId,
  onNodeClick,
  isLoading,
  error,
}) {
  const { layoutNodes, layoutEdges } = useMemo(() => {
    if (!auditData?.districts) return { layoutNodes: [], layoutEdges: [] };
    const { nodes, edges } = computeLayout(
      auditData.districts,
      auditData.complianceViolations
    );
    return { layoutNodes: nodes, layoutEdges: edges };
  }, [auditData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Sync layout when auditData changes
  React.useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  // Update selection state
  React.useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === selectedDistrictId,
      }))
    );
  }, [selectedDistrictId, setNodes]);

  const handleNodeClick = useCallback(
    (_event, node) => {
      onNodeClick(node.id);
    },
    [onNodeClick]
  );

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
            Paste a directory tree or select a Quick-Scan preset, then execute
            analysis to visualize the architecture map.
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
    <div className="flex-1 bg-canvas">
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
            if (n.selected) return "#00FF00";
            if (n.data?.hasViolation) return "#FF3B3B";
            return "#27272A";
          }}
          maskColor="rgba(14, 15, 17, 0.8)"
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
}
