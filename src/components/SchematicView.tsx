import React, { useMemo } from 'react';
import { usePanelStore } from '../store/panelStore';
import { getModuleById } from '../data/modules';
import type { PlacedModule, Wire, ModuleDefinition } from '../types';

interface NodeLayout {
  instanceId: string;
  def: ModuleDefinition;
  placed: PlacedModule;
  x: number;
  y: number;
  depth: number;
  children: string[];
}

const NODE_W = 60;
const NODE_H = 40;
const H_GAP = 30;
const V_GAP = 80;
const SYMBOL_SIZE = 24;

const SCHEMATIC_SYMBOLS: Record<string, (cx: number, cy: number, s: number) => React.ReactNode> = {
  breaker: (cx, cy, s) => (
    <g>
      <line x1={cx} y1={cy - s / 2} x2={cx} y2={cy - s / 4} stroke="#333" strokeWidth={1.5} />
      <line x1={cx} y1={cy - s / 4} x2={cx + s / 4} y2={cy + s / 4} stroke="#333" strokeWidth={1.5} />
      <line x1={cx} y1={cy + s / 4} x2={cx} y2={cy + s / 2} stroke="#333" strokeWidth={1.5} />
      <circle cx={cx} cy={cy - s / 4} r={1.5} fill="#333" />
    </g>
  ),
  dr: (cx, cy, s) => (
    <g>
      <line x1={cx} y1={cy - s / 2} x2={cx} y2={cy - s / 4} stroke="#333" strokeWidth={1.5} />
      <line x1={cx} y1={cy - s / 4} x2={cx + s / 4} y2={cy + s / 4} stroke="#333" strokeWidth={1.5} />
      <line x1={cx} y1={cy + s / 4} x2={cx} y2={cy + s / 2} stroke="#333" strokeWidth={1.5} />
      <circle cx={cx} cy={cy - s / 4} r={1.5} fill="#333" />
      <rect x={cx - s / 3} y={cy - s / 6} width={s * 0.66} height={s / 3} fill="none" stroke="#333" strokeWidth={0.8} rx={1} />
    </g>
  ),
  dps: (cx, cy, s) => (
    <g>
      <line x1={cx} y1={cy - s / 2} x2={cx} y2={cy - s / 6} stroke="#333" strokeWidth={1.5} />
      <line x1={cx} y1={cy + s / 6} x2={cx} y2={cy + s / 2} stroke="#333" strokeWidth={1.5} />
      <polygon points={`${cx},${cy - s / 4} ${cx - s / 4},${cy + s / 6} ${cx + s / 4},${cy + s / 6}`} fill="none" stroke="#333" strokeWidth={1} />
    </g>
  ),
  contactor: (cx, cy, s) => (
    <g>
      <line x1={cx} y1={cy - s / 2} x2={cx} y2={cy - s / 6} stroke="#333" strokeWidth={1.5} />
      <line x1={cx} y1={cy + s / 6} x2={cx} y2={cy + s / 2} stroke="#333" strokeWidth={1.5} />
      <rect x={cx - s / 4} y={cy - s / 6} width={s / 2} height={s / 3} fill="none" stroke="#333" strokeWidth={1} rx={2} />
      <line x1={cx - s / 3} y1={cy} x2={cx - s / 4} y2={cy} stroke="#333" strokeWidth={0.8} />
    </g>
  ),
  relay: (cx, cy, s) => (
    <g>
      <rect x={cx - s / 3} y={cy - s / 4} width={s * 0.66} height={s / 2} fill="none" stroke="#333" strokeWidth={1} rx={2} />
      <line x1={cx} y1={cy - s / 2} x2={cx} y2={cy - s / 4} stroke="#333" strokeWidth={1.5} />
      <line x1={cx} y1={cy + s / 4} x2={cx} y2={cy + s / 2} stroke="#333" strokeWidth={1.5} />
    </g>
  ),
  timer: (cx, cy, s) => (
    <g>
      <circle cx={cx} cy={cy} r={s / 3} fill="none" stroke="#333" strokeWidth={1} />
      <line x1={cx} y1={cy} x2={cx + s / 5} y2={cy - s / 5} stroke="#333" strokeWidth={1} />
      <line x1={cx} y1={cy} x2={cx} y2={cy + s / 5} stroke="#333" strokeWidth={0.8} />
      <line x1={cx} y1={cy - s / 2} x2={cx} y2={cy - s / 3} stroke="#333" strokeWidth={1.5} />
      <line x1={cx} y1={cy + s / 3} x2={cx} y2={cy + s / 2} stroke="#333" strokeWidth={1.5} />
    </g>
  ),
  terminal: (cx, cy, s) => (
    <g>
      <circle cx={cx} cy={cy} r={s / 5} fill="#333" />
      <line x1={cx} y1={cy - s / 2} x2={cx} y2={cy - s / 5} stroke="#333" strokeWidth={1.5} />
      <line x1={cx} y1={cy + s / 5} x2={cx} y2={cy + s / 2} stroke="#333" strokeWidth={1.5} />
    </g>
  ),
  ats: (cx, cy, s) => (
    <g>
      <line x1={cx - s / 4} y1={cy - s / 2} x2={cx - s / 4} y2={cy - s / 6} stroke="#333" strokeWidth={1.5} />
      <line x1={cx + s / 4} y1={cy - s / 2} x2={cx + s / 4} y2={cy - s / 6} stroke="#333" strokeWidth={1.5} />
      <line x1={cx - s / 4} y1={cy - s / 6} x2={cx} y2={cy + s / 4} stroke="#333" strokeWidth={1.5} />
      <line x1={cx} y1={cy + s / 4} x2={cx} y2={cy + s / 2} stroke="#333" strokeWidth={1.5} />
      <circle cx={cx} cy={cy + s / 4} r={1.5} fill="#333" />
    </g>
  ),
};

function buildGraph(
  rows: { id: string; modules: PlacedModule[] }[],
  wires: Wire[],
): Map<string, NodeLayout> {
  const allModules = rows.flatMap((r) => r.modules);
  const nodes = new Map<string, NodeLayout>();
  const childrenMap = new Map<string, Set<string>>();
  const hasParent = new Set<string>();

  for (const mod of allModules) {
    const def = getModuleById(mod.moduleId);
    if (!def) continue;
    nodes.set(mod.instanceId, {
      instanceId: mod.instanceId,
      def,
      placed: mod,
      x: 0,
      y: 0,
      depth: 0,
      children: [],
    });
    childrenMap.set(mod.instanceId, new Set());
  }

  for (const wire of wires) {
    const srcPorts = getModuleById(
      allModules.find((m) => m.instanceId === wire.sourceInstanceId)?.moduleId ?? '',
    )?.ports;
    const srcPort = srcPorts?.find((p) => p.id === wire.sourcePortId);

    if (srcPort?.side === 'bottom' || !srcPort) {
      childrenMap.get(wire.sourceInstanceId)?.add(wire.targetInstanceId);
      hasParent.add(wire.targetInstanceId);
    } else {
      childrenMap.get(wire.targetInstanceId)?.add(wire.sourceInstanceId);
      hasParent.add(wire.sourceInstanceId);
    }
  }

  for (const [id, children] of childrenMap) {
    const node = nodes.get(id);
    if (node) node.children = Array.from(children);
  }

  const roots = Array.from(nodes.keys()).filter((id) => !hasParent.has(id));

  function assignDepth(id: string, depth: number, visited: Set<string>) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = nodes.get(id);
    if (node) {
      node.depth = Math.max(node.depth, depth);
      for (const childId of node.children) {
        assignDepth(childId, depth + 1, visited);
      }
    }
  }

  const visited = new Set<string>();
  for (const rootId of roots) assignDepth(rootId, 0, visited);
  for (const id of nodes.keys()) {
    if (!visited.has(id)) assignDepth(id, 0, visited);
  }

  const depthBuckets = new Map<number, string[]>();
  for (const [id, node] of nodes) {
    const list = depthBuckets.get(node.depth) ?? [];
    list.push(id);
    depthBuckets.set(node.depth, list);
  }

  for (const [depth, ids] of depthBuckets) {
    const totalWidth = ids.length * NODE_W + (ids.length - 1) * H_GAP;
    const startX = -totalWidth / 2;
    ids.forEach((id, i) => {
      const node = nodes.get(id)!;
      node.x = startX + i * (NODE_W + H_GAP) + NODE_W / 2;
      node.y = depth * (NODE_H + V_GAP) + 60;
    });
  }

  return nodes;
}

export const SchematicView: React.FC = () => {
  const rows = usePanelStore((s) => s.rows);
  const wires = usePanelStore((s) => s.wires);

  const nodes = useMemo(() => buildGraph(rows, wires), [rows, wires]);

  if (nodes.size === 0) {
    return (
      <div className="schematic-empty">
        <p>Nenhum módulo no painel. Adicione módulos e crie conexões para gerar o diagrama unifilar.</p>
      </div>
    );
  }

  const allNodes = Array.from(nodes.values());
  const minX = Math.min(...allNodes.map((n) => n.x)) - NODE_W;
  const maxX = Math.max(...allNodes.map((n) => n.x)) + NODE_W;
  const maxY = Math.max(...allNodes.map((n) => n.y)) + NODE_H + 40;

  const width = maxX - minX + 80;
  const height = maxY + 40;
  const viewBox = `${minX - 40} 0 ${width} ${height}`;

  return (
    <div className="schematic-view">
      <svg width="100%" height="100%" viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
        <rect x={minX - 40} y={0} width={width} height={height} fill="#fff" />

        {/* Connection lines */}
        {allNodes.map((node) =>
          node.children.map((childId) => {
            const child = nodes.get(childId);
            if (!child) return null;
            return (
              <path
                key={`${node.instanceId}-${childId}`}
                d={`M ${node.x} ${node.y + NODE_H / 2 + SYMBOL_SIZE / 2} L ${node.x} ${(node.y + child.y) / 2} L ${child.x} ${(node.y + child.y) / 2} L ${child.x} ${child.y - NODE_H / 2}`}
                fill="none"
                stroke="#333"
                strokeWidth={1}
              />
            );
          }),
        )}

        {/* Nodes */}
        {allNodes.map((node) => {
          const renderSymbol = SCHEMATIC_SYMBOLS[node.def.category];
          return (
            <g key={node.instanceId}>
              {renderSymbol && renderSymbol(node.x, node.y, SYMBOL_SIZE)}
              <text
                x={node.x + NODE_W / 2 - 5}
                y={node.y - 2}
                fontSize={9}
                fill="#555"
                fontWeight={500}
              >
                {node.placed.label || node.def.name}
              </text>
              {node.def.poles && (
                <text x={node.x + NODE_W / 2 - 5} y={node.y + 10} fontSize={7} fill="#888">
                  {node.def.poles}P
                </text>
              )}
            </g>
          );
        })}

        {/* Supply indicator at top */}
        <g>
          <line x1={0} y1={10} x2={0} y2={30} stroke="#333" strokeWidth={2} />
          <polygon points="-4,30 4,30 0,36" fill="#333" />
          <text x={6} y={20} fontSize={10} fill="#333" fontWeight={600}>Alimentação</text>
        </g>
      </svg>
    </div>
  );
};
