import { PlacedModule, Wire, PanelIO, ExternalDevice, ComponentState } from '../types';
import { getComponentById, allComponents } from '../data/components';
import type { ComponentSpec, ModeSpec, InternalRoute } from '../data/components';

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

function modeSpecToSimMode(m: ModeSpec): SimMode {
  return { id: m.id, label: m.label, color: m.color, passesEnergy: m.routes.length > 0 };
}

// SIM_MODES keyed by both component ID and category for backward compat
export const SIM_MODES: Record<string, SimMode[]> = {};

const categorySeen = new Set<string>();
for (const spec of allComponents) {
  SIM_MODES[spec.id] = spec.modes.map(modeSpecToSimMode);
  if (!categorySeen.has(spec.category)) {
    categorySeen.add(spec.category);
    SIM_MODES[spec.category] = spec.modes.map(modeSpecToSimMode);
  }
}

function resolveSpec(idOrCategory: string): ComponentSpec | undefined {
  return getComponentById(idOrCategory) ?? allComponents.find((c) => c.category === idOrCategory);
}

export function getDefaultMode(idOrCategory: string): string {
  const spec = resolveSpec(idOrCategory);
  if (spec) return spec.defaultMode;
  const modes = SIM_MODES[idOrCategory];
  if (modes && modes.length > 0) return modes[0].id;
  return 'on';
}

export function getNextMode(idOrCategory: string, currentMode: string): string {
  const spec = resolveSpec(idOrCategory);
  const modes = spec ? spec.modes : undefined;
  const list = modes ?? SIM_MODES[idOrCategory];
  if (!list || list.length <= 1) return currentMode;
  const idx = list.findIndex((m) => m.id === currentMode);
  return list[(idx + 1) % list.length].id;
}

export function getModeInfo(idOrCategory: string, mode: string): SimMode | undefined {
  const spec = resolveSpec(idOrCategory);
  if (spec) {
    const m = spec.modes.find((ms) => ms.id === mode);
    if (m) return modeSpecToSimMode(m);
  }
  return SIM_MODES[idOrCategory]?.find((m) => m.id === mode);
}

export function getRoutesForMode(moduleId: string, mode: string): InternalRoute[] {
  const spec = getComponentById(moduleId);
  if (!spec) return [];
  const ms = spec.modes.find((m) => m.id === mode);
  return ms?.routes ?? [];
}

// ---------- Circuit Graph (port-level) ----------

interface PortNode {
  instanceId: string;
  portId: string;
}

function portKey(instanceId: string, portId: string): string {
  return `${instanceId}::${portId}`;
}

interface CircuitGraph {
  wiresByPort: Map<string, Array<{ wireId: string; target: PortNode }>>;
}

function buildGraph(wires: Wire[]): CircuitGraph {
  const wiresByPort = new Map<string, Array<{ wireId: string; target: PortNode }>>();

  function addEdge(src: PortNode, tgt: PortNode, wireId: string) {
    const key = portKey(src.instanceId, src.portId);
    let arr = wiresByPort.get(key);
    if (!arr) { arr = []; wiresByPort.set(key, arr); }
    arr.push({ wireId, target: tgt });
  }

  for (const w of wires) {
    addEdge(
      { instanceId: w.sourceInstanceId, portId: w.sourcePortId },
      { instanceId: w.targetInstanceId, portId: w.targetPortId },
      w.id,
    );
    addEdge(
      { instanceId: w.targetInstanceId, portId: w.targetPortId },
      { instanceId: w.sourceInstanceId, portId: w.sourcePortId },
      w.id,
    );
  }

  return { wiresByPort };
}

// ---------- Simulation ----------

export interface ManualOverride {
  on?: boolean;
  mode?: string;
}

interface SimulationResult {
  states: ComponentState[];
  alerts: SimAlert[];
  energizedWires: Set<string>;
}

const DEFAULT_VOLTAGE = 220;

export function simulate(
  rows: { id: string; modules: PlacedModule[] }[],
  wires: Wire[],
  panelIOs: PanelIO[],
  externalDevices: ExternalDevice[],
  manualOverrides?: Map<string, ManualOverride>,
): SimulationResult {
  const allModules = rows.flatMap((r) => r.modules);
  const graph = buildGraph(wires);
  const states = new Map<string, ComponentState>();
  const alerts: SimAlert[] = [];
  const energizedWires = new Set<string>();

  // Map from instanceId -> spec
  const specMap = new Map<string, ComponentSpec | undefined>();

  // Initialize states for rail modules
  for (const mod of allModules) {
    const spec = getComponentById(mod.moduleId);
    specMap.set(mod.instanceId, spec);
    const override = manualOverrides?.get(mod.instanceId);
    const mode = override?.mode ?? (spec ? spec.defaultMode : 'on');
    const routes = spec ? (spec.modes.find((m) => m.id === mode)?.routes ?? []) : [];
    states.set(mod.instanceId, {
      instanceId: mod.instanceId,
      on: override?.on ?? (routes.length > 0),
      tripped: mode === 'tripped',
      currentA: 0,
      voltageV: 0,
      mode,
    });
  }

  // Initialize states for panel I/Os
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

  // Initialize states for external devices
  for (const dev of externalDevices) {
    const spec = getComponentById(dev.moduleId);
    specMap.set(dev.instanceId, spec);
    const override = manualOverrides?.get(dev.instanceId);
    const mode = override?.mode ?? (spec ? spec.defaultMode : 'off');
    const routes = spec ? (spec.modes.find((m) => m.id === mode)?.routes ?? []) : [];
    states.set(dev.instanceId, {
      instanceId: dev.instanceId,
      on: override?.on ?? (routes.length > 0),
      tripped: false,
      currentA: 0,
      voltageV: 0,
      mode,
    });
  }

  // Find root nodes (panel inputs)
  const inputRoots = panelIOs
    .filter((io) => io.direction === 'input')
    .map((io) => `panel-io:${io.id}`)
    .filter((id) => {
      const state = states.get(id);
      return state?.on !== false;
    });

  let roots: string[];
  if (inputRoots.length > 0) {
    roots = inputRoots;
  } else {
    const hasIncoming = new Set<string>();
    for (const wire of wires) hasIncoming.add(wire.targetInstanceId);
    roots = [];
    for (const [id] of states) {
      if (!id.startsWith('panel-io:') && !hasIncoming.has(id)) roots.push(id);
    }
    if (roots.length === 0) {
      const moduleIds = allModules.map((m) => m.instanceId);
      if (moduleIds.length > 0) roots = [moduleIds[0]];
    }
  }

  // Output loads for current budget
  const outputLoads = panelIOs
    .filter((io) => io.direction === 'output' && (io.consumptionA ?? 0) > 0)
    .reduce((sum, io) => sum + (io.consumptionA ?? 0), 0);
  const totalLoad = outputLoads > 0 ? outputLoads : Math.max(allModules.length * 2, 10);

  // Route-based propagation
  const visitedPorts = new Set<string>();

  function propagateFromPort(
    instanceId: string,
    entryPortId: string,
    voltage: number,
    currentBudget: number,
  ) {
    const pKey = portKey(instanceId, entryPortId);
    if (visitedPorts.has(pKey)) return;
    visitedPorts.add(pKey);

    const state = states.get(instanceId);
    if (!state) return;

    state.voltageV = Math.max(state.voltageV, voltage);
    state.currentA = Math.max(state.currentA, currentBudget);

    // Panel I/O: propagate through all connected wires from all ports
    if (instanceId.startsWith('panel-io:')) {
      if (!state.on) return;
      const ioId = instanceId.replace('panel-io:', '');
      const io = panelIOs.find((p) => p.id === ioId);
      const portIds = io ? [`in-${io.label}`, `out-${io.label}`, io.id, 'port'] : ['port'];
      const allPortIds = [entryPortId, ...portIds];
      for (const pid of allPortIds) {
        const edges = graph.wiresByPort.get(portKey(instanceId, pid));
        if (!edges) continue;
        for (const edge of edges) {
          if (visitedPorts.has(portKey(edge.target.instanceId, edge.target.portId))) continue;
          energizedWires.add(edge.wireId);
          propagateFromPort(edge.target.instanceId, edge.target.portId, voltage, currentBudget);
        }
      }
      return;
    }

    const spec = specMap.get(instanceId);
    if (!spec) {
      if (!state.on) return;
      const edges = graph.wiresByPort.get(pKey);
      if (!edges) return;
      for (const edge of edges) {
        energizedWires.add(edge.wireId);
        propagateFromPort(edge.target.instanceId, edge.target.portId, voltage, currentBudget);
      }
      return;
    }

    const modeSpec = spec.modes.find((m) => m.id === state.mode);

    // Check overcurrent trip for breakers and DRs
    if (spec.category === 'breaker' || spec.category === 'dr') {
      const nominal = spec.nominalCurrentA ?? 16;
      if (currentBudget > nominal) {
        state.tripped = true;
        state.on = false;
        state.mode = 'tripped';
        state.voltageV = 0;
        state.currentA = 0;
        alerts.push({
          type: 'tripped',
          instanceId,
          message: `${spec.category === 'breaker' ? 'Disjuntor' : 'DR'} disparou: ${currentBudget.toFixed(1)}A > ${nominal}A`,
        });
        return;
      }
    }

    if (!state.on || !modeSpec || modeSpec.routes.length === 0) {
      state.voltageV = 0;
      state.currentA = 0;
      return;
    }

    // Find which output ports are reachable from the entry port via routes
    const reachableOutputs = modeSpec.routes
      .filter((r) => r.from === entryPortId)
      .map((r) => r.to);

    // Also handle reverse direction (output->input connection)
    const reachableReverse = modeSpec.routes
      .filter((r) => r.to === entryPortId)
      .map((r) => r.from);

    const targetPorts = [...reachableOutputs, ...reachableReverse];

    if (targetPorts.length === 0) return;

    const currentPerTarget = currentBudget / targetPorts.length;

    for (const tPort of targetPorts) {
      const tKey = portKey(instanceId, tPort);
      if (visitedPorts.has(tKey)) continue;
      visitedPorts.add(tKey);

      const edges = graph.wiresByPort.get(tKey);
      if (!edges) continue;

      const unvisited = edges.filter(
        (e) => !visitedPorts.has(portKey(e.target.instanceId, e.target.portId)),
      );
      const curPerChild = unvisited.length > 0 ? currentPerTarget / unvisited.length : 0;

      for (const edge of unvisited) {
        energizedWires.add(edge.wireId);
        propagateFromPort(edge.target.instanceId, edge.target.portId, voltage, curPerChild);
      }
    }
  }

  // Start propagation from roots
  for (const rootId of roots) {
    const rootIO = panelIOs.find((io) => `panel-io:${io.id}` === rootId);
    const voltage = rootIO?.voltageV ?? (rootIO?.type === 'dc_pos' || rootIO?.type === 'dc_neg' ? 24 : DEFAULT_VOLTAGE);
    const maxCurrent = rootIO?.maxCurrentA ?? totalLoad;
    const currentForRoot = Math.min(totalLoad, maxCurrent);

    // Panel I/O nodes don't have specific port IDs in wires -- use all connected ports
    propagateFromPort(rootId, 'port', voltage, currentForRoot);
  }

  // Alerts
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
