import { PlacedModule, Wire, PanelIO, ExternalDevice, ComponentState } from '../types';
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

export interface SimMode {
  id: string;
  label: string;
  color: string;
  passesEnergy: boolean;
}

export const SIM_MODES: Record<string, SimMode[]> = {
  breaker: [
    { id: 'on', label: 'Ligado', color: '#4caf50', passesEnergy: true },
    { id: 'off', label: 'Desligado', color: '#f44336', passesEnergy: false },
    { id: 'tripped', label: 'Disparado', color: '#ff9800', passesEnergy: false },
  ],
  dr: [
    { id: 'on', label: 'Ligado', color: '#4caf50', passesEnergy: true },
    { id: 'off', label: 'Desligado', color: '#f44336', passesEnergy: false },
    { id: 'tripped', label: 'Disparado', color: '#ff9800', passesEnergy: false },
  ],
  dps: [
    { id: 'ok', label: 'Normal', color: '#4caf50', passesEnergy: true },
    { id: 'tripped', label: 'Atuado', color: '#ff9800', passesEnergy: false },
  ],
  contactor: [
    { id: 'on', label: 'Energizado', color: '#4caf50', passesEnergy: true },
    { id: 'off', label: 'Desenergizado', color: '#999', passesEnergy: false },
  ],
  relay: [
    { id: 'on', label: 'Energizado', color: '#4caf50', passesEnergy: true },
    { id: 'off', label: 'Desenergizado', color: '#999', passesEnergy: false },
  ],
  timer: [
    { id: 'idle', label: 'Aguardando', color: '#999', passesEnergy: false },
    { id: 'counting', label: 'Contando', color: '#ff9800', passesEnergy: false },
    { id: 'done', label: 'Concluído', color: '#4caf50', passesEnergy: true },
  ],
  ats: [
    { id: 'src1', label: 'Fonte 1', color: '#4caf50', passesEnergy: true },
    { id: 'src2', label: 'Fonte 2', color: '#ff9800', passesEnergy: true },
    { id: 'off', label: 'Desligado', color: '#f44336', passesEnergy: false },
  ],
  terminal: [
    { id: 'on', label: 'Conectado', color: '#4caf50', passesEnergy: true },
  ],
  switch: [
    { id: 'on', label: 'Fechado', color: '#4caf50', passesEnergy: true },
    { id: 'off', label: 'Aberto', color: '#f44336', passesEnergy: false },
  ],
  button: [
    { id: 'released', label: 'Solto', color: '#999', passesEnergy: false },
    { id: 'pressed', label: 'Pressionado', color: '#4caf50', passesEnergy: true },
  ],
};

export function getDefaultMode(category: string): string {
  const modes = SIM_MODES[category];
  if (!modes || modes.length === 0) return 'on';
  if (category === 'switch') return 'off';
  if (category === 'button') return 'released';
  if (category === 'timer') return 'idle';
  return modes[0].id;
}

export function getNextMode(category: string, currentMode: string): string {
  const modes = SIM_MODES[category];
  if (!modes || modes.length <= 1) return currentMode;
  const idx = modes.findIndex((m) => m.id === currentMode);
  return modes[(idx + 1) % modes.length].id;
}

export function getModeInfo(category: string, mode: string): SimMode | undefined {
  return SIM_MODES[category]?.find((m) => m.id === mode);
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
  externalDevices: ExternalDevice[],
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
      nominalCurrentA: io.direction === 'input' ? (io.maxCurrentA ?? 63) : 999,
      isInput: io.direction === 'input',
      isOutput: io.direction === 'output',
      connectedTo: [],
    });
  }

  for (const dev of externalDevices) {
    const def = getModuleById(dev.moduleId);
    if (!def) continue;
    graph.set(dev.instanceId, {
      instanceId: dev.instanceId,
      moduleId: dev.moduleId,
      category: def.category,
      nominalCurrentA: DEFAULT_NOMINAL[dev.moduleId] ?? 16,
      isInput: false,
      isOutput: false,
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

export interface ManualOverride {
  on?: boolean;
  mode?: string;
}

export function simulate(
  rows: { id: string; modules: PlacedModule[] }[],
  wires: Wire[],
  panelIOs: PanelIO[],
  externalDevices: ExternalDevice[],
  manualOverrides?: Map<string, ManualOverride>,
): SimulationResult {
  const allModules = rows.flatMap((r) => r.modules);
  const graph = buildCircuitGraph(allModules, wires, panelIOs, externalDevices);
  const states = new Map<string, ComponentState>();
  const alerts: SimAlert[] = [];
  const energizedWires = new Set<string>();

  for (const mod of allModules) {
    const def = getModuleById(mod.moduleId);
    const category = def?.category ?? 'breaker';
    const override = manualOverrides?.get(mod.instanceId);
    const mode = override?.mode ?? getDefaultMode(category);
    const modeInfo = getModeInfo(category, mode);
    states.set(mod.instanceId, {
      instanceId: mod.instanceId,
      on: override?.on ?? (modeInfo?.passesEnergy ?? true),
      tripped: mode === 'tripped',
      currentA: 0,
      voltageV: 0,
      mode,
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
      mode: 'on',
    });
  }

  for (const dev of externalDevices) {
    const defObj = getModuleById(dev.moduleId);
    const category = defObj?.category ?? 'switch';
    const override = manualOverrides?.get(dev.instanceId);
    const mode = override?.mode ?? getDefaultMode(category);
    const modeInfo = getModeInfo(category, mode);
    states.set(dev.instanceId, {
      instanceId: dev.instanceId,
      on: override?.on ?? (modeInfo?.passesEnergy ?? false),
      tripped: false,
      currentA: 0,
      voltageV: 0,
      mode,
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

  function propagate(id: string, voltage: number, currentBudget: number, sourcePortHint?: string) {
    if (visited.has(id)) return;
    visited.add(id);

    const state = states.get(id);
    const node = graph.get(id);
    if (!state || !node) return;

    state.voltageV = voltage;
    state.currentA = currentBudget;

    const modeInfo = getModeInfo(node.category, state.mode);

    if (!state.on || (modeInfo && !modeInfo.passesEnergy)) {
      state.voltageV = 0;
      state.currentA = 0;
      return;
    }

    if ((node.category === 'breaker' || node.category === 'dr') && currentBudget > node.nominalCurrentA) {
      state.tripped = true;
      state.on = false;
      state.mode = 'tripped';
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

  const outputLoads = panelIOs
    .filter((io) => io.direction === 'output' && (io.consumptionA ?? 0) > 0)
    .reduce((sum, io) => sum + (io.consumptionA ?? 0), 0);
  const totalLoad = outputLoads > 0 ? outputLoads : Math.max(allModules.length * 2, 10);

  for (const rootId of roots) {
    const rootIO = panelIOs.find((io) => `panel-io:${io.id}` === rootId);
    const voltage = rootIO?.voltageV ?? (rootIO?.type === 'dc_pos' || rootIO?.type === 'dc_neg' ? 24 : DEFAULT_VOLTAGE);
    const maxCurrent = rootIO?.maxCurrentA ?? totalLoad;
    const currentForRoot = Math.min(totalLoad, maxCurrent);
    propagate(rootId, voltage, currentForRoot);
  }

  for (const io of panelIOs) {
    if (io.direction === 'input' && (io.maxCurrentA ?? 0) > 0) {
      const instanceId = `panel-io:${io.id}`;
      const state = states.get(instanceId);
      if (state && state.currentA > (io.maxCurrentA ?? Infinity)) {
        alerts.push({
          type: 'overload',
          instanceId,
          message: `Entrada "${io.label}" sobrecarregada: ${state.currentA.toFixed(1)}A > ${io.maxCurrentA}A máx`,
        });
      }
    }
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
