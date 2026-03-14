import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { PanelState, PanelRow, DisplayMode, Wire, PanelIO, PanelIODirection, PanelIOType, PanelEdge, ExternalDevice, Busbar, BusbarType } from '../types';
import { getEnclosureById } from '../data/enclosures';

type EditorScreen = 'setup' | 'editor';

interface WiringFrom {
  instanceId: string;
  portId: string;
}

export interface PasteData {
  modules: Array<{ oldId: string; moduleId: string; positionCm: number; rowId: string; label?: string; properties?: Record<string, number | string> }>;
  externalDevices: Array<{ oldId: string; moduleId: string; x: number; y: number; label?: string; properties?: Record<string, number | string> }>;
  wires: Array<{ sourceOldId: string; sourcePortId: string; targetOldId: string; targetPortId: string }>;
}

interface PanelStore extends PanelState {
  screen: EditorScreen;
  displayMode: DisplayMode;
  wireSnapAlignment: boolean;
  wiringFrom: WiringFrom | null;
  selectedWireId: string | null;
  selectedIOId: string | null;
  selectedBusbarId: string | null;

  configureCustom: (widthUnits: number, rowCount: number) => void;
  configureFromEnclosure: (enclosureId: string) => void;
  goToSetup: () => void;

  addModule: (rowId: string, moduleId: string, positionCm: number) => void;
  moveModule: (rowId: string, instanceId: string, newPositionCm: number, newRowId?: string) => void;
  removeModule: (rowId: string, instanceId: string) => void;
  updateLabel: (rowId: string, instanceId: string, label: string) => void;

  setDisplayMode: (mode: DisplayMode) => void;
  setWireSnapAlignment: (enabled: boolean) => void;

  // Wiring
  startWiring: (instanceId: string, portId: string) => void;
  cancelWiring: () => void;
  addWire: (sourceInstanceId: string, sourcePortId: string, targetInstanceId: string, targetPortId: string) => void;
  removeWire: (wireId: string) => void;
  updateWireProps: (wireId: string, props: Partial<Pick<Wire, 'wireGaugeMm2' | 'wireColor' | 'label'>>) => void;
  selectWire: (wireId: string | null) => void;
  addWireWaypoint: (wireId: string, index: number, x: number, y: number) => void;
  addWireWaypointFromPath: (wireId: string, segmentIndex: number, x: number, y: number, pathPoints: Array<{ x: number; y: number }>) => void;
  materializeWireWaypoints: (wireId: string, pathPoints: Array<{ x: number; y: number }>) => void;
  moveWireWaypoint: (wireId: string, waypointIndex: number, x: number, y: number) => void;
  moveWireSegment: (wireId: string, segmentIndex: number, deltaX: number, deltaY: number) => void;
  removeWireWaypoint: (wireId: string, waypointIndex: number) => void;
  clearWireWaypoints: (wireId: string) => void;

  // Panel I/O
  addPanelIO: (direction: PanelIODirection, type: PanelIOType, edge: PanelEdge, positionPercent: number, label?: string) => void;
  removePanelIO: (ioId: string) => void;
  updatePanelIO: (ioId: string, props: Partial<Pick<PanelIO, 'label' | 'type' | 'voltageV' | 'maxCurrentA' | 'consumptionA'>>) => void;
  movePanelIO: (ioId: string, edge: PanelEdge, positionPercent: number) => void;
  selectIO: (ioId: string | null) => void;
  selectBusbar: (id: string | null) => void;

  // External Devices
  addExternalDevice: (moduleId: string, x: number, y: number) => void;
  moveExternalDevice: (instanceId: string, x: number, y: number) => void;
  moveExternalDevices: (moves: Array<{ instanceId: string; x: number; y: number }>) => void;
  removeExternalDevice: (instanceId: string) => void;
  removeMultiple: (moduleItems: Array<{ rowId: string; instanceId: string }>, externalDeviceIds: string[]) => void;
  updateExternalDeviceLabel: (instanceId: string, label: string) => void;
  updateInstanceProperty: (instanceId: string, key: string, value: number | string) => void;
  pasteElements: (data: PasteData) => string[];

  // Busbars
  addBusbar: (type: BusbarType, x: number, y: number) => void;
  moveBusbar: (id: string, x: number, y: number) => void;
  resizeBusbar: (id: string, widthPx: number) => void;
  removeBusbar: (id: string) => void;
  updateBusbarLabel: (id: string, label: string) => void;
  updateBusbarType: (id: string, type: BusbarType) => void;
  addBusbarConnectionPoint: (busbarId: string) => void;
  removeBusbarConnectionPoint: (busbarId: string, pointId: string) => void;
  moveBusbarConnectionPoint: (busbarId: string, pointId: string, offsetPercent: number) => void;

  setName: (name: string) => void;
  loadState: (state: PanelState) => void;
  resizePanel: (widthUnits: number, rowCount: number) => void;

  markAsSaved: () => void;
  getIsDirty: () => boolean;
}

function getSavableSnapshot(s: PanelStore): string {
  const snap = {
    name: s.name,
    enclosureId: s.enclosureId,
    widthUnits: s.widthUnits,
    rowCount: s.rowCount,
    rows: s.rows,
    wires: s.wires,
    panelIOs: s.panelIOs,
    externalDevices: s.externalDevices,
    busbars: s.busbars,
  };
  return JSON.stringify(snap);
}

function makeRows(count: number): PanelRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    modules: [],
  }));
}

const IO_TYPE_LABELS: Record<string, string> = {
  phase: 'Fase',
  neutral: 'Neutro',
  ground: 'Terra',
  dc_pos: 'DC+',
  dc_neg: 'DC-',
  signal: 'Sinal',
};

let lastSavedSnapshot: string | null = null;

export const usePanelStore = create<PanelStore>((set, get) => ({
  screen: 'setup',
  name: 'Novo Projeto',
  enclosureId: null,
  widthUnits: 12,
  rowCount: 1,
  rows: [],
  wires: [],
  panelIOs: [],
  externalDevices: [],
  busbars: [],
  displayMode: 'icon' as DisplayMode,
  wireSnapAlignment: true,
  wiringFrom: null,
  selectedWireId: null,
  selectedIOId: null,
  selectedBusbarId: null,

  configureCustom: (widthUnits, rowCount) =>
    set({
      screen: 'editor',
      enclosureId: null,
      widthUnits,
      rowCount,
      rows: makeRows(rowCount),
      wires: [],
      panelIOs: [],
      externalDevices: [],
      busbars: [],
    }),

  configureFromEnclosure: (enclosureId) => {
    const enc = getEnclosureById(enclosureId);
    if (!enc) return;
    set({
      screen: 'editor',
      enclosureId,
      widthUnits: Math.round(enc.rails[0]?.usableWidthCm / 3) || 12,
      rowCount: enc.rails.length,
      rows: enc.rails.map((r) => ({ id: r.id, modules: [] })),
      wires: [],
      panelIOs: [],
      externalDevices: [],
      busbars: [],
    });
  },

  goToSetup: () => set({ screen: 'setup' }),

  addModule: (rowId, moduleId, positionCm) =>
    set((s) => ({
      rows: s.rows.map((row) =>
        row.id === rowId
          ? { ...row, modules: [...row.modules, { instanceId: nanoid(), moduleId, positionCm }] }
          : row,
      ),
    })),

  moveModule: (rowId, instanceId, newPositionCm, newRowId) =>
    set((s) => {
      if (newRowId && newRowId !== rowId) {
        const mod = s.rows.find((r) => r.id === rowId)?.modules.find((m) => m.instanceId === instanceId);
        if (!mod) return s;
        return {
          rows: s.rows.map((row) => {
            if (row.id === rowId) return { ...row, modules: row.modules.filter((m) => m.instanceId !== instanceId) };
            if (row.id === newRowId) return { ...row, modules: [...row.modules, { ...mod, positionCm: newPositionCm }] };
            return row;
          }),
        };
      }
      return {
        rows: s.rows.map((row) =>
          row.id === rowId
            ? { ...row, modules: row.modules.map((m) => (m.instanceId === instanceId ? { ...m, positionCm: newPositionCm } : m)) }
            : row,
        ),
      };
    }),

  removeModule: (rowId, instanceId) =>
    set((s) => ({
      rows: s.rows.map((row) =>
        row.id === rowId ? { ...row, modules: row.modules.filter((m) => m.instanceId !== instanceId) } : row,
      ),
      wires: s.wires.filter((w) => w.sourceInstanceId !== instanceId && w.targetInstanceId !== instanceId),
    })),

  updateLabel: (rowId, instanceId, label) =>
    set((s) => ({
      rows: s.rows.map((row) =>
        row.id === rowId
          ? { ...row, modules: row.modules.map((m) => (m.instanceId === instanceId ? { ...m, label } : m)) }
          : row,
      ),
    })),

  setDisplayMode: (mode) => set({ displayMode: mode }),
  setWireSnapAlignment: (enabled) => set({ wireSnapAlignment: enabled }),

  startWiring: (instanceId, portId) => set({ wiringFrom: { instanceId, portId } }),
  cancelWiring: () => set({ wiringFrom: null }),

  addWire: (sourceInstanceId, sourcePortId, targetInstanceId, targetPortId) =>
    set((s) => {
      const exists = s.wires.some(
        (w) =>
          (w.sourceInstanceId === sourceInstanceId && w.sourcePortId === sourcePortId &&
           w.targetInstanceId === targetInstanceId && w.targetPortId === targetPortId) ||
          (w.sourceInstanceId === targetInstanceId && w.sourcePortId === targetPortId &&
           w.targetInstanceId === sourceInstanceId && w.targetPortId === sourcePortId),
      );
      if (exists) return s;
      return {
        wires: [...s.wires, { id: nanoid(), sourceInstanceId, sourcePortId, targetInstanceId, targetPortId }],
        wiringFrom: null,
      };
    }),

  removeWire: (wireId) =>
    set((s) => ({
      wires: s.wires.filter((w) => w.id !== wireId),
      selectedWireId: s.selectedWireId === wireId ? null : s.selectedWireId,
    })),

  updateWireProps: (wireId, props) =>
    set((s) => ({
      wires: s.wires.map((w) => (w.id === wireId ? { ...w, ...props } : w)),
    })),

  selectWire: (wireId) => set({ selectedWireId: wireId }),

  addWireWaypoint: (wireId, index, x, y) =>
    set((s) => ({
      wires: s.wires.map((w) => {
        if (w.id !== wireId) return w;
        const wps = [...(w.waypoints ?? [])];
        wps.splice(index, 0, { x, y });
        return { ...w, waypoints: wps };
      }),
    })),

  addWireWaypointFromPath: (wireId, segmentIndex, x, y, pathPoints) =>
    set((s) => ({
      wires: s.wires.map((w) => {
        if (w.id !== wireId) return w;
        let wps = [...(w.waypoints ?? [])];
        if (wps.length === 0 && pathPoints.length >= 2) {
          wps = pathPoints.slice(1, -1).map((p) => ({ x: p.x, y: p.y }));
        }
        wps.splice(segmentIndex, 0, { x, y });
        return { ...w, waypoints: wps };
      }),
    })),

  materializeWireWaypoints: (wireId, pathPoints) =>
    set((s) => ({
      wires: s.wires.map((w) => {
        if (w.id !== wireId || (w.waypoints?.length ?? 0) > 0) return w;
        if (pathPoints.length < 2) return w;
        const wps = pathPoints.slice(1, -1).map((p) => ({ x: p.x, y: p.y }));
        return { ...w, waypoints: wps };
      }),
    })),

  moveWireWaypoint: (wireId, waypointIndex, x, y) =>
    set((s) => ({
      wires: s.wires.map((w) => {
        if (w.id !== wireId) return w;
        const wps = [...(w.waypoints ?? [])];
        wps[waypointIndex] = { x, y };
        return { ...w, waypoints: wps };
      }),
    })),

  removeWireWaypoint: (wireId, waypointIndex) =>
    set((s) => ({
      wires: s.wires.map((w) => {
        if (w.id !== wireId) return w;
        const wps = [...(w.waypoints ?? [])];
        wps.splice(waypointIndex, 1);
        return { ...w, waypoints: wps.length > 0 ? wps : undefined };
      }),
    })),

  moveWireSegment: (wireId, segmentIndex, deltaX, deltaY) =>
    set((s) => ({
      wires: s.wires.map((w) => {
        if (w.id !== wireId || !w.waypoints?.length) return w;
        const wps = [...w.waypoints];
        if (segmentIndex > 0) {
          wps[segmentIndex - 1] = {
            x: wps[segmentIndex - 1].x + deltaX,
            y: wps[segmentIndex - 1].y + deltaY,
          };
        }
        if (segmentIndex < wps.length) {
          wps[segmentIndex] = {
            x: wps[segmentIndex].x + deltaX,
            y: wps[segmentIndex].y + deltaY,
          };
        }
        return { ...w, waypoints: wps };
      }),
    })),

  clearWireWaypoints: (wireId) =>
    set((s) => ({
      wires: s.wires.map((w) => (w.id === wireId ? { ...w, waypoints: undefined } : w)),
    })),

  addPanelIO: (direction, type, edge, positionPercent, label) =>
    set((s) => {
      const sameDir = s.panelIOs.filter((io) => io.direction === direction);
      const nextIndex = sameDir.length;
      const autoLabel = label || `${direction === 'input' ? 'E' : 'S'}${nextIndex + 1} ${IO_TYPE_LABELS[type] ?? type}`;
      const isDC = type === 'dc_pos' || type === 'dc_neg';
      const defaultVoltage = isDC ? 24 : 220;
      const newIO: PanelIO = {
        id: nanoid(),
        label: autoLabel,
        direction,
        type,
        edge,
        positionPercent,
        ...(direction === 'input'
          ? { voltageV: defaultVoltage, maxCurrentA: 63 }
          : { consumptionA: 0 }),
      };
      return { panelIOs: [...s.panelIOs, newIO] };
    }),

  removePanelIO: (ioId) =>
    set((s) => {
      const io = s.panelIOs.find((i) => i.id === ioId);
      const ioInstanceId = io ? `panel-io:${io.id}` : '';
      return {
        panelIOs: s.panelIOs.filter((i) => i.id !== ioId),
        wires: s.wires.filter((w) => w.sourceInstanceId !== ioInstanceId && w.targetInstanceId !== ioInstanceId),
        selectedIOId: s.selectedIOId === ioId ? null : s.selectedIOId,
      };
    }),

  updatePanelIO: (ioId, props) =>
    set((s) => ({
      panelIOs: s.panelIOs.map((io) => (io.id === ioId ? { ...io, ...props } : io)),
    })),

  movePanelIO: (ioId, edge, positionPercent) =>
    set((s) => ({
      panelIOs: s.panelIOs.map((io) => (io.id === ioId ? { ...io, edge, positionPercent } : io)),
    })),

  selectIO: (ioId) => set({ selectedIOId: ioId }),
  selectBusbar: (id) => set({ selectedBusbarId: id }),

  addExternalDevice: (moduleId, x, y) =>
    set((s) => ({
      externalDevices: [...s.externalDevices, { instanceId: nanoid(), moduleId, x, y }],
    })),

  moveExternalDevice: (instanceId, x, y) =>
    set((s) => ({
      externalDevices: s.externalDevices.map((d) =>
        d.instanceId === instanceId ? { ...d, x, y } : d,
      ),
    })),

  moveExternalDevices: (moves) =>
    set((s) => ({
      externalDevices: s.externalDevices.map((d) => {
        const move = moves.find((m) => m.instanceId === d.instanceId);
        return move ? { ...d, x: move.x, y: move.y } : d;
      }),
    })),

  removeExternalDevice: (instanceId) =>
    set((s) => ({
      externalDevices: s.externalDevices.filter((d) => d.instanceId !== instanceId),
      wires: s.wires.filter((w) => w.sourceInstanceId !== instanceId && w.targetInstanceId !== instanceId),
    })),

  removeMultiple: (moduleItems, externalDeviceIds) =>
    set((s) => {
      const removeInstanceIds = new Set([
        ...moduleItems.map((m) => m.instanceId),
        ...externalDeviceIds,
      ]);
      return {
        rows: s.rows.map((row) => {
          const toRemove = moduleItems.filter((m) => m.rowId === row.id).map((m) => m.instanceId);
          if (toRemove.length === 0) return row;
          return { ...row, modules: row.modules.filter((m) => !toRemove.includes(m.instanceId)) };
        }),
        externalDevices: s.externalDevices.filter((d) => !externalDeviceIds.includes(d.instanceId)),
        wires: s.wires.filter((w) => !removeInstanceIds.has(w.sourceInstanceId) && !removeInstanceIds.has(w.targetInstanceId)),
      };
    }),

  updateExternalDeviceLabel: (instanceId, label) =>
    set((s) => ({
      externalDevices: s.externalDevices.map((d) =>
        d.instanceId === instanceId ? { ...d, label } : d,
      ),
    })),

  updateInstanceProperty: (instanceId, key, value) =>
    set((s) => {
      const inRow = s.rows.some((r) => r.modules.some((m) => m.instanceId === instanceId));
      if (inRow) {
        return {
          rows: s.rows.map((r) => ({
            ...r,
            modules: r.modules.map((m) =>
              m.instanceId === instanceId
                ? { ...m, properties: { ...m.properties, [key]: value } }
                : m,
            ),
          })),
        };
      }
      return {
        externalDevices: s.externalDevices.map((d) =>
          d.instanceId === instanceId
            ? { ...d, properties: { ...d.properties, [key]: value } }
            : d,
        ),
      };
    }),

  pasteElements: (data) => {
    const idMap = new Map<string, string>();
    for (const m of data.modules) idMap.set(m.oldId, nanoid());
    for (const d of data.externalDevices) idMap.set(d.oldId, nanoid());

    set((s) => ({
      rows: s.rows.map((row) => {
        const newMods = data.modules
          .filter((m) => m.rowId === row.id)
          .map((m) => ({
            instanceId: idMap.get(m.oldId)!,
            moduleId: m.moduleId,
            positionCm: m.positionCm,
            label: m.label,
            properties: m.properties ? { ...m.properties } : undefined,
          }));
        if (newMods.length === 0) return row;
        return { ...row, modules: [...row.modules, ...newMods] };
      }),
      externalDevices: [
        ...s.externalDevices,
        ...data.externalDevices.map((d) => ({
          instanceId: idMap.get(d.oldId)!,
          moduleId: d.moduleId,
          x: d.x,
          y: d.y,
          label: d.label,
          properties: d.properties ? { ...d.properties } : undefined,
        })),
      ],
      wires: [
        ...s.wires,
        ...data.wires
          .filter((w) => idMap.has(w.sourceOldId) && idMap.has(w.targetOldId))
          .map((w) => ({
            id: nanoid(),
            sourceInstanceId: idMap.get(w.sourceOldId)!,
            sourcePortId: w.sourcePortId,
            targetInstanceId: idMap.get(w.targetOldId)!,
            targetPortId: w.targetPortId,
          })),
      ],
    }));

    return Array.from(idMap.values());
  },

  // --- Busbars ---

  addBusbar: (type, x, y) =>
    set((s) => {
      const id = nanoid();
      const defaultPoints = [
        { id: nanoid(), offsetPercent: 10 },
        { id: nanoid(), offsetPercent: 50 },
        { id: nanoid(), offsetPercent: 90 },
      ];
      const newBar: Busbar = { id, x, y, widthPx: 120, type, label: '', connectionPoints: defaultPoints };
      return { busbars: [...s.busbars, newBar] };
    }),

  moveBusbar: (id, x, y) =>
    set((s) => ({ busbars: s.busbars.map((b) => (b.id === id ? { ...b, x, y } : b)) })),

  resizeBusbar: (id, widthPx) =>
    set((s) => ({ busbars: s.busbars.map((b) => (b.id === id ? { ...b, widthPx: Math.max(30, widthPx) } : b)) })),

  removeBusbar: (id) =>
    set((s) => {
      const prefix = `busbar:${id}`;
      return {
        busbars: s.busbars.filter((b) => b.id !== id),
        wires: s.wires.filter((w) => !w.sourceInstanceId.startsWith(prefix) && !w.targetInstanceId.startsWith(prefix)),
      };
    }),

  updateBusbarLabel: (id, label) =>
    set((s) => ({ busbars: s.busbars.map((b) => (b.id === id ? { ...b, label } : b)) })),

  updateBusbarType: (id, type) =>
    set((s) => ({ busbars: s.busbars.map((b) => (b.id === id ? { ...b, type } : b)) })),

  addBusbarConnectionPoint: (busbarId) =>
    set((s) => ({
      busbars: s.busbars.map((b) => {
        if (b.id !== busbarId) return b;
        const existing = b.connectionPoints.map((p) => p.offsetPercent).sort((a, c) => a - c);
        let best = 50;
        let maxGap = 0;
        for (let i = 0; i <= existing.length; i++) {
          const lo = i === 0 ? 0 : existing[i - 1];
          const hi = i === existing.length ? 100 : existing[i];
          if (hi - lo > maxGap) { maxGap = hi - lo; best = (lo + hi) / 2; }
        }
        return { ...b, connectionPoints: [...b.connectionPoints, { id: nanoid(), offsetPercent: Math.round(best) }] };
      }),
    })),

  removeBusbarConnectionPoint: (busbarId, pointId) =>
    set((s) => ({
      busbars: s.busbars.map((b) =>
        b.id === busbarId ? { ...b, connectionPoints: b.connectionPoints.filter((p) => p.id !== pointId) } : b,
      ),
      wires: s.wires.filter((w) => {
        const iid = `busbar:${busbarId}`;
        return !((w.sourceInstanceId === iid && w.sourcePortId === pointId) || (w.targetInstanceId === iid && w.targetPortId === pointId));
      }),
    })),

  moveBusbarConnectionPoint: (busbarId, pointId, offsetPercent) =>
    set((s) => ({
      busbars: s.busbars.map((b) =>
        b.id === busbarId
          ? { ...b, connectionPoints: b.connectionPoints.map((p) => (p.id === pointId ? { ...p, offsetPercent: Math.max(0, Math.min(100, offsetPercent)) } : p)) }
          : b,
      ),
    })),

  setName: (name) => set({ name }),

  loadState: (state) => {
    const normalizedExtDevices = (state.externalDevices ?? []).map((d: any) => ({
      ...d,
      x: d.x ?? 0,
      y: d.y ?? -40,
    }));
    const normalized = {
      ...state,
      wires: state.wires ?? [],
      panelIOs: state.panelIOs ?? [],
      busbars: state.busbars ?? [],
      externalDevices: normalizedExtDevices,
    };
    set({
      screen: 'editor',
      ...normalized,
    });
    lastSavedSnapshot = getSavableSnapshot(get());
  },

  resizePanel: (widthUnits, rowCount) =>
    set((s) => {
      const currentRows = s.rows;
      const rows: PanelRow[] = Array.from({ length: rowCount }, (_, i) => {
        if (i < currentRows.length) return currentRows[i];
        return { id: `row-${i}`, modules: [] };
      });
      return { widthUnits, rowCount, rows, enclosureId: null };
    }),

  markAsSaved: () => {
    lastSavedSnapshot = getSavableSnapshot(get());
  },

  getIsDirty: () => {
    if (!lastSavedSnapshot) return true;
    return getSavableSnapshot(get()) !== lastSavedSnapshot;
  },
}));
