import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { PanelState, PanelRow, DisplayMode, Wire, PanelIO, PanelIODirection, PanelIOType, PanelEdge, ExternalDevice } from '../types';
import { getEnclosureById } from '../data/enclosures';

type EditorScreen = 'setup' | 'editor';

interface WiringFrom {
  instanceId: string;
  portId: string;
}

interface PanelStore extends PanelState {
  screen: EditorScreen;
  displayMode: DisplayMode;
  wiringFrom: WiringFrom | null;
  selectedWireId: string | null;
  selectedIOId: string | null;

  configureCustom: (widthUnits: number, rowCount: number) => void;
  configureFromEnclosure: (enclosureId: string) => void;
  goToSetup: () => void;

  addModule: (rowId: string, moduleId: string, positionCm: number) => void;
  moveModule: (rowId: string, instanceId: string, newPositionCm: number, newRowId?: string) => void;
  removeModule: (rowId: string, instanceId: string) => void;
  updateLabel: (rowId: string, instanceId: string, label: string) => void;

  setDisplayMode: (mode: DisplayMode) => void;

  // Wiring
  startWiring: (instanceId: string, portId: string) => void;
  cancelWiring: () => void;
  addWire: (sourceInstanceId: string, sourcePortId: string, targetInstanceId: string, targetPortId: string) => void;
  removeWire: (wireId: string) => void;
  updateWireProps: (wireId: string, props: Partial<Pick<Wire, 'wireGaugeMm2' | 'wireColor' | 'label'>>) => void;
  selectWire: (wireId: string | null) => void;
  addWireWaypoint: (wireId: string, index: number, x: number, y: number) => void;
  moveWireWaypoint: (wireId: string, waypointIndex: number, x: number, y: number) => void;
  removeWireWaypoint: (wireId: string, waypointIndex: number) => void;
  clearWireWaypoints: (wireId: string) => void;

  // Panel I/O
  addPanelIO: (direction: PanelIODirection, type: PanelIOType, edge: PanelEdge, positionPercent: number, label?: string) => void;
  removePanelIO: (ioId: string) => void;
  updatePanelIO: (ioId: string, props: Partial<Pick<PanelIO, 'label' | 'type' | 'voltageV' | 'maxCurrentA' | 'consumptionA'>>) => void;
  movePanelIO: (ioId: string, edge: PanelEdge, positionPercent: number) => void;
  selectIO: (ioId: string | null) => void;

  // External Devices
  addExternalDevice: (moduleId: string, x: number, y: number) => void;
  moveExternalDevice: (instanceId: string, x: number, y: number) => void;
  moveExternalDevices: (moves: Array<{ instanceId: string; x: number; y: number }>) => void;
  removeExternalDevice: (instanceId: string) => void;
  removeMultiple: (moduleItems: Array<{ rowId: string; instanceId: string }>, externalDeviceIds: string[]) => void;
  updateExternalDeviceLabel: (instanceId: string, label: string) => void;

  setName: (name: string) => void;
  loadState: (state: PanelState) => void;
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

export const usePanelStore = create<PanelStore>((set) => ({
  screen: 'setup',
  name: 'Novo Projeto',
  enclosureId: null,
  widthUnits: 12,
  rowCount: 1,
  rows: [],
  wires: [],
  panelIOs: [],
  externalDevices: [],
  displayMode: 'icon' as DisplayMode,
  wiringFrom: null,
  selectedWireId: null,
  selectedIOId: null,

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

  setName: (name) => set({ name }),

  loadState: (state) =>
    set({
      screen: 'editor',
      ...state,
      wires: state.wires ?? [],
      panelIOs: state.panelIOs ?? [],
      externalDevices: (state.externalDevices ?? []).map((d: any) => ({
        ...d,
        x: d.x ?? 0,
        y: d.y ?? -(d.yPercent != null ? 40 : 40),
      })),
    }),
}));
