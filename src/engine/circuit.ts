import { PlacedModule, Wire, PanelIO, ComponentState } from '../types';
import { getModuleById } from '../data/modules';

interface CircuitNode {
  instanceId: string;
  moduleId: string;
  category: string;
  nominalCurrentA: number;
  isInput: boolean;
  isOutput: boolean;
  connectedTo: Array<{ instanceId: string; wireId: string }>;
}

interface SimulationResult {
  states: ComponentState[];
  alerts: SimAlert[];
  energizedWires: Set<string>;
}

export interface SimAlert {
  type: 'overload' | 'short-circuit' | 'no-ground' | 'tripped' | 'info';
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
  panelIOs: PanelIO[],
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
      isInput: false,
      isOutput: false,
      connectedTo: [],
    });
  }

  for (const io of panelIOs) {
    const instanceId = `panel-io:${io.id}`;
    graph.set(instanceId, {
      instanceId,
      moduleId: `panel-io-${io.type}`,
      category: 'panel-io',
      nominalCurrentA: 999,
      isInput: io.direction === 'input',
      isOutput: io.direction === 'output',
      connectedTo: [],
    });
  }

  for (const wire of wires) {
    const srcNode = graph.get(wire.sourceInstanceId);
    const tgtNode = graph.get(wire.targetInstanceId);
    if (srcNode && tgtNode) {
      srcNode.connectedTo.push({ instanceId: wire.targetInstanceId, wireId: wire.id });
      tgtNode.connectedTo.push({ instanceId: wire.sourceInstanceId, wireId: wire.id });
    }
  }

  return graph;
}

export function simulate(
  rows: { id: string; modules: PlacedModule[] }[],
  wires: Wire[],
  panelIOs: PanelIO[],
  manualOverrides?: Map<string, { on: boolean }>,
): SimulationResult {
  const allModules = rows.flatMap((r) => r.modules);
  const graph = buildCircuitGraph(allModules, wires, panelIOs);
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

  for (const io of panelIOs) {
    const instanceId = `panel-io:${io.id}`;
    const override = manualOverrides?.get(instanceId);
    states.set(instanceId, {
      instanceId,
      on: override?.on ?? true,
      tripped: false,
      currentA: 0,
      voltageV: 0,
    });
  }

  const inputRoots = panelIOs
    .filter((io) => io.direction === 'input')
    .map((io) => `panel-io:${io.id}`)
    .filter((id) => {
      const node = graph.get(id);
      const state = states.get(id);
      return node && node.connectedTo.length > 0 && state?.on !== false;
    });

  let roots: string[];
  if (inputRoots.length > 0) {
    roots = inputRoots;
  } else {
    const hasIncoming = new Set<string>();
    for (const wire of wires) {
      if (!graph.has(wire.sourceInstanceId) || !graph.has(wire.targetInstanceId)) continue;
      hasIncoming.add(wire.targetInstanceId);
    }
    roots = [];
    for (const [id, node] of graph) {
      if (node.category !== 'panel-io' && !hasIncoming.has(id)) roots.push(id);
    }
    if (roots.length === 0) {
      const moduleIds = allModules.map((m) => m.instanceId);
      if (moduleIds.length > 0) roots = [moduleIds[0]];
    }
  }

  const visited = new Set<string>();

  function propagate(id: string, voltage: number, currentBudget: number) {
    if (visited.has(id)) return;
    visited.add(id);

    const state = states.get(id);
    const node = graph.get(id);
    if (!state || !node) return;

    state.voltageV = voltage;
    state.currentA = currentBudget;

    if (!state.on) {
      state.voltageV = 0;
      state.currentA = 0;
      return;
    }

    if ((node.category === 'breaker' || node.category === 'dr') && currentBudget > node.nominalCurrentA) {
      state.tripped = true;
      state.on = false;
      alerts.push({
        type: 'tripped',
        instanceId: id,
        message: `${node.category === 'breaker' ? 'Disjuntor' : 'DR'} disparou: ${currentBudget.toFixed(1)}A > ${node.nominalCurrentA}A`,
      });
      return;
    }

    const unvisitedChildren = node.connectedTo.filter((c) => !visited.has(c.instanceId));
    const childCount = unvisitedChildren.length;
    const currentPerChild = childCount > 0 ? currentBudget / childCount : 0;

    for (const conn of unvisitedChildren) {
      energizedWires.add(conn.wireId);
      propagate(conn.instanceId, voltage, currentPerChild);
    }
  }

  const totalLoad = Math.max(allModules.length * 2, 10);
  for (const rootId of roots) {
    const rootIO = panelIOs.find((io) => `panel-io:${io.id}` === rootId);
    const voltage = rootIO?.type === 'dc_pos' || rootIO?.type === 'dc_neg' ? 24 : DEFAULT_VOLTAGE;
    propagate(rootId, voltage, totalLoad);
  }

  const hasGroundIO = panelIOs.some((io) => io.type === 'ground');
  if (!hasGroundIO && allModules.length > 0) {
    alerts.push({
      type: 'info',
      instanceId: '',
      message: 'Nenhum terra definido no quadro',
    });
  }

  return {
    states: Array.from(states.values()),
    alerts,
    energizedWires,
  };
}
