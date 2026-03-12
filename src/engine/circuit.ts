import { PlacedModule, Wire, Busbar, ComponentState } from '../types';
import { getModuleById } from '../data/modules';

interface CircuitNode {
  instanceId: string;
  moduleId: string;
  category: string;
  nominalCurrentA: number;
  connectedTo: Array<{ instanceId: string; via: 'wire' | 'busbar' }>;
}

interface SimulationResult {
  states: ComponentState[];
  alerts: SimAlert[];
  energizedWires: Set<string>;
}

export interface SimAlert {
  type: 'overload' | 'short-circuit' | 'no-ground' | 'tripped';
  instanceId: string;
  message: string;
}

const DEFAULT_VOLTAGE = 220;
const DEFAULT_NOMINAL: Record<string, number> = {
  'breaker-1p': 16,
  'breaker-2p': 25,
  'breaker-3p': 32,
  'dr-2p': 25,
  'dr-4p': 32,
  'dps-1p': 40,
  'dps-2p': 40,
  contactor: 25,
  relay: 10,
  timer: 10,
  'terminal-1': 60,
  'ats-2p': 63,
};

function buildCircuitGraph(
  allModules: PlacedModule[],
  wires: Wire[],
  busbars: Busbar[],
): Map<string, CircuitNode> {
  const graph = new Map<string, CircuitNode>();

  for (const mod of allModules) {
    const def = getModuleById(mod.moduleId);
    if (!def) continue;
    graph.set(mod.instanceId, {
      instanceId: mod.instanceId,
      moduleId: mod.moduleId,
      category: def.category,
      nominalCurrentA: DEFAULT_NOMINAL[mod.moduleId] ?? 16,
      connectedTo: [],
    });
  }

  for (const wire of wires) {
    graph.get(wire.sourceInstanceId)?.connectedTo.push({ instanceId: wire.targetInstanceId, via: 'wire' });
    graph.get(wire.targetInstanceId)?.connectedTo.push({ instanceId: wire.sourceInstanceId, via: 'wire' });
  }

  for (const busbar of busbars) {
    for (let i = 0; i < busbar.connectedPorts.length; i++) {
      for (let j = i + 1; j < busbar.connectedPorts.length; j++) {
        const a = busbar.connectedPorts[i].instanceId;
        const b = busbar.connectedPorts[j].instanceId;
        graph.get(a)?.connectedTo.push({ instanceId: b, via: 'busbar' });
        graph.get(b)?.connectedTo.push({ instanceId: a, via: 'busbar' });
      }
    }
  }

  return graph;
}

function findRoots(graph: Map<string, CircuitNode>, wires: Wire[]): string[] {
  const hasIncoming = new Set<string>();
  for (const wire of wires) {
    const srcDef = getModuleById(
      graph.get(wire.sourceInstanceId)?.moduleId ?? '',
    );
    const srcPort = srcDef?.ports.find((p) => p.id === wire.sourcePortId);
    if (srcPort?.side === 'bottom') {
      hasIncoming.add(wire.targetInstanceId);
    } else {
      hasIncoming.add(wire.sourceInstanceId);
    }
  }

  const roots: string[] = [];
  for (const id of graph.keys()) {
    if (!hasIncoming.has(id)) roots.push(id);
  }
  return roots.length > 0 ? roots : Array.from(graph.keys()).slice(0, 1);
}

export function simulate(
  rows: { id: string; modules: PlacedModule[] }[],
  wires: Wire[],
  busbars: Busbar[],
  manualOverrides?: Map<string, { on: boolean }>,
): SimulationResult {
  const allModules = rows.flatMap((r) => r.modules);
  const graph = buildCircuitGraph(allModules, wires, busbars);
  const states = new Map<string, ComponentState>();
  const alerts: SimAlert[] = [];
  const energizedWires = new Set<string>();

  for (const mod of allModules) {
    const override = manualOverrides?.get(mod.instanceId);
    states.set(mod.instanceId, {
      instanceId: mod.instanceId,
      on: override?.on ?? true,
      tripped: false,
      currentA: 0,
      voltageV: 0,
    });
  }

  const roots = findRoots(graph, wires);
  const visited = new Set<string>();

  function propagate(id: string, voltage: number, currentBudget: number) {
    if (visited.has(id)) return;
    visited.add(id);

    const state = states.get(id);
    const node = graph.get(id);
    if (!state || !node) return;

    state.voltageV = voltage;

    if (!state.on) {
      state.voltageV = 0;
      return;
    }

    const childCount = node.connectedTo.filter((c) => !visited.has(c.instanceId)).length;
    const currentPerChild = childCount > 0 ? currentBudget / childCount : 0;
    state.currentA = currentBudget;

    if ((node.category === 'breaker' || node.category === 'dr') && currentBudget > node.nominalCurrentA) {
      state.tripped = true;
      state.on = false;
      alerts.push({
        type: 'tripped',
        instanceId: id,
        message: `${node.category === 'breaker' ? 'Disjuntor' : 'DR'} disparou: ${currentBudget.toFixed(1)}A > ${node.nominalCurrentA}A nominal`,
      });
      return;
    }

    for (const conn of node.connectedTo) {
      if (visited.has(conn.instanceId)) continue;

      const wire = wires.find(
        (w) =>
          (w.sourceInstanceId === id && w.targetInstanceId === conn.instanceId) ||
          (w.targetInstanceId === id && w.sourceInstanceId === conn.instanceId),
      );
      if (wire) energizedWires.add(wire.id);

      propagate(conn.instanceId, state.tripped ? 0 : voltage, currentPerChild);
    }
  }

  const totalLoad = allModules.length * 2;
  for (const rootId of roots) {
    propagate(rootId, DEFAULT_VOLTAGE, totalLoad);
  }

  const hasGround = busbars.some((b) => b.type === 'ground-bar');
  if (!hasGround && allModules.length > 0) {
    alerts.push({
      type: 'no-ground',
      instanceId: '',
      message: 'Sem barra de terra no quadro',
    });
  }

  return {
    states: Array.from(states.values()),
    alerts,
    energizedWires,
  };
}
