import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { PanelState, PanelRow, DisplayMode } from '../types';
import { getEnclosureById } from '../data/enclosures';

type EditorScreen = 'setup' | 'editor';

interface PanelStore extends PanelState {
  screen: EditorScreen;
  displayMode: DisplayMode;

  // Setup
  configureCustom: (widthUnits: number, rowCount: number) => void;
  configureFromEnclosure: (enclosureId: string) => void;
  goToSetup: () => void;

  // Module actions
  addModule: (rowId: string, moduleId: string, positionCm: number) => void;
  moveModule: (
    rowId: string,
    instanceId: string,
    newPositionCm: number,
    newRowId?: string,
  ) => void;
  removeModule: (rowId: string, instanceId: string) => void;
  updateLabel: (rowId: string, instanceId: string, label: string) => void;

  // Display
  setDisplayMode: (mode: DisplayMode) => void;

  // Project
  setName: (name: string) => void;
  loadState: (state: PanelState) => void;
}

function makeRows(count: number): PanelRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    modules: [],
  }));
}

export const usePanelStore = create<PanelStore>((set) => ({
  screen: 'setup',
  name: 'Novo Projeto',
  enclosureId: null,
  widthUnits: 12,
  rowCount: 1,
  rows: [],
  displayMode: 'icon' as DisplayMode,

  configureCustom: (widthUnits, rowCount) =>
    set({
      screen: 'editor',
      enclosureId: null,
      widthUnits,
      rowCount,
      rows: makeRows(rowCount),
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
    });
  },

  goToSetup: () => set({ screen: 'setup' }),

  addModule: (rowId, moduleId, positionCm) =>
    set((s) => ({
      rows: s.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              modules: [
                ...row.modules,
                { instanceId: nanoid(), moduleId, positionCm },
              ],
            }
          : row,
      ),
    })),

  moveModule: (rowId, instanceId, newPositionCm, newRowId) =>
    set((s) => {
      if (newRowId && newRowId !== rowId) {
        const mod = s.rows
          .find((r) => r.id === rowId)
          ?.modules.find((m) => m.instanceId === instanceId);
        if (!mod) return s;
        return {
          rows: s.rows.map((row) => {
            if (row.id === rowId) {
              return {
                ...row,
                modules: row.modules.filter(
                  (m) => m.instanceId !== instanceId,
                ),
              };
            }
            if (row.id === newRowId) {
              return {
                ...row,
                modules: [
                  ...row.modules,
                  { ...mod, positionCm: newPositionCm },
                ],
              };
            }
            return row;
          }),
        };
      }
      return {
        rows: s.rows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                modules: row.modules.map((m) =>
                  m.instanceId === instanceId
                    ? { ...m, positionCm: newPositionCm }
                    : m,
                ),
              }
            : row,
        ),
      };
    }),

  removeModule: (rowId, instanceId) =>
    set((s) => ({
      rows: s.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              modules: row.modules.filter((m) => m.instanceId !== instanceId),
            }
          : row,
      ),
    })),

  updateLabel: (rowId, instanceId, label) =>
    set((s) => ({
      rows: s.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              modules: row.modules.map((m) =>
                m.instanceId === instanceId ? { ...m, label } : m,
              ),
            }
          : row,
      ),
    })),

  setDisplayMode: (mode) => set({ displayMode: mode }),

  setName: (name) => set({ name }),

  loadState: (state) =>
    set({
      screen: 'editor',
      ...state,
    }),
}));
