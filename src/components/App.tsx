import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
  DragCancelEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { usePanelStore } from '../store/panelStore';
import { PanelConfig } from './PanelConfig';
import { ModuleLibrary } from './ModuleLibrary';
import { PanelView } from './PanelView';
import { Toolbar } from './Toolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { DragOverlayContent } from './DragOverlayContent';
import { SchematicView } from './SchematicView';
import { SimulationOverlay } from './SimulationView';
import { getModuleById } from '../data/modules';
import type { ComponentState, PanelState } from '../types';
import { snapToCm, pxToCm, cmToPx, canPlace, clampToNeighbors } from '../utils/geometry';
import { resolveLayout } from '../utils/panelLayout';
import { closestEdge } from '../utils/panelIO';
import type { ResolvedRail, GhostPreview } from '../types';

type ViewMode = 'panel' | 'schematic';

export const App: React.FC = () => {
  const screen = usePanelStore((s) => s.screen);
  const store = usePanelStore();
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeDragInfo, setActiveDragInfo] = useState<{ type: string; label: string; color: string } | null>(null);
  const [activePlaced, setActivePlaced] = useState<{
    instanceId: string;
    moduleId: string;
    rowId: string;
  } | null>(null);
  const [ghostPreview, setGhostPreview] = useState<GhostPreview | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [hoverTarget, setHoverTarget] = useState<{ instanceId: string; portId: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('panel');
  const [simActive, setSimActive] = useState(false);
  const [simData, setSimData] = useState<{ energizedWires: Set<string>; states: ComponentState[] }>({ energizedWires: new Set(), states: [] });
  const [simModeHandler, setSimModeHandler] = useState<((instanceId: string, newMode: string) => void) | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const historyPastRef = useRef<PanelState[]>([]);
  const historyFutureRef = useRef<PanelState[]>([]);
  const lastSnapshotRef = useRef<string | null>(null);
  const lastStateRef = useRef<PanelState | null>(null);
  const isRestoringHistoryRef = useRef(false);
  const shiftHeldRef = useRef(false);
  const wiringDragRef = useRef(false);
  const wiringDragSourceRef = useRef<{ instanceId: string; portId: string } | null>(null);
  const hoverPortRef = useRef<{ instanceId: string; portId: string } | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftHeldRef.current = true; };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftHeldRef.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const handleSimDataChange = useCallback((energizedWires: Set<string>, states: ComponentState[]) => {
    setSimData({ energizedWires, states });
  }, []);

  const handleSimModeRegister = useCallback((handler: (instanceId: string, newMode: string) => void) => {
    setSimModeHandler(() => handler);
  }, []);

  const handlePortClick = useCallback(
    (instanceId: string, portId: string) => {
      if (wiringDragRef.current) return;
      const wf = store.wiringFrom;
      if (!wf) {
        store.startWiring(instanceId, portId);
      } else {
        if (wf.instanceId === instanceId && wf.portId === portId) {
          store.cancelWiring();
        } else {
          store.addWire(wf.instanceId, wf.portId, instanceId, portId);
          setHoverTarget(null);
        }
      }
    },
    [store],
  );

  const handlePortMouseDown = useCallback(
    (instanceId: string, portId: string) => {
      const wf = store.wiringFrom;

      if (wf && !(wf.instanceId === instanceId && wf.portId === portId)) {
        store.addWire(wf.instanceId, wf.portId, instanceId, portId);
        setHoverTarget(null);
        hoverPortRef.current = null;
        wiringDragRef.current = false;
        wiringDragSourceRef.current = null;
        return;
      }

      if (wf && wf.instanceId === instanceId && wf.portId === portId) {
        store.cancelWiring();
        wiringDragRef.current = false;
        wiringDragSourceRef.current = null;
        return;
      }

      wiringDragRef.current = true;
      wiringDragSourceRef.current = { instanceId, portId };
      store.startWiring(instanceId, portId);

      const resolvePortUnderCursor = (ev: PointerEvent): { instanceId: string; portId: string } | null => {
        const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
        const portEl = el?.closest('[data-wire-instance-id][data-wire-port-id]') as HTMLElement | null;
        if (!portEl) return null;
        const tid = portEl.getAttribute('data-wire-instance-id');
        const tpid = portEl.getAttribute('data-wire-port-id');
        if (!tid || !tpid) return null;
        return { instanceId: tid, portId: tpid };
      };

      const onWindowPointerUp = (ev: PointerEvent) => {
        const source = wiringDragSourceRef.current;
        const target = resolvePortUnderCursor(ev) ?? hoverPortRef.current;

        if (source && target && !(source.instanceId === target.instanceId && source.portId === target.portId)) {
          store.addWire(source.instanceId, source.portId, target.instanceId, target.portId);
          setHoverTarget(null);
          hoverPortRef.current = null;
        }
        wiringDragSourceRef.current = null;
        requestAnimationFrame(() => {
          wiringDragRef.current = false;
        });
      };
      window.addEventListener('pointerup', onWindowPointerUp, { once: true });
    },
    [store],
  );

  const handlePortMouseUp = useCallback(
    (instanceId: string, portId: string) => {
      if (!wiringDragRef.current) return;
      const wf = store.wiringFrom;
      if (wf && !(wf.instanceId === instanceId && wf.portId === portId)) {
        store.addWire(wf.instanceId, wf.portId, instanceId, portId);
        setHoverTarget(null);
        hoverPortRef.current = null;
      }
      wiringDragSourceRef.current = null;
      requestAnimationFrame(() => {
        wiringDragRef.current = false;
      });
    },
    [store],
  );

  const handlePortHover = useCallback(
    (instanceId: string, portId: string) => {
      const target = { instanceId, portId };
      hoverPortRef.current = target;
      setHoverTarget(target);
    },
    [],
  );

  const handlePortLeave = useCallback(() => {
    hoverPortRef.current = null;
    setHoverTarget(null);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const layout = useMemo(
    () =>
      resolveLayout({
        name: store.name,
        enclosureId: store.enclosureId,
        widthUnits: store.widthUnits,
        rowCount: store.rowCount,
        rows: store.rows,
      }),
    [store.enclosureId, store.widthUnits, store.rowCount, store.rows, store.name],
  );

  const panelStateSnapshot = useMemo<PanelState>(
    () => ({
      name: store.name,
      enclosureId: store.enclosureId,
      widthUnits: store.widthUnits,
      rowCount: store.rowCount,
      rows: store.rows,
      wires: store.wires,
      panelIOs: store.panelIOs,
      externalDevices: store.externalDevices,
    }),
    [
      store.name,
      store.enclosureId,
      store.widthUnits,
      store.rowCount,
      store.rows,
      store.wires,
      store.panelIOs,
      store.externalDevices,
    ],
  );

  const snapshotKey = useMemo(() => JSON.stringify(panelStateSnapshot), [panelStateSnapshot]);

  const updateHistoryFlags = useCallback(() => {
    setCanUndo(historyPastRef.current.length > 0);
    setCanRedo(historyFutureRef.current.length > 0);
  }, []);

  useEffect(() => {
    if (screen !== 'editor') {
      historyPastRef.current = [];
      historyFutureRef.current = [];
      lastSnapshotRef.current = null;
      lastStateRef.current = null;
      updateHistoryFlags();
      return;
    }
    if (isRestoringHistoryRef.current) {
      isRestoringHistoryRef.current = false;
      updateHistoryFlags();
      return;
    }
    if (lastSnapshotRef.current === null) {
      lastSnapshotRef.current = snapshotKey;
      lastStateRef.current = clonePanelState(panelStateSnapshot);
      updateHistoryFlags();
      return;
    }
    if (snapshotKey === lastSnapshotRef.current) return;

    if (lastStateRef.current) {
      historyPastRef.current.push(lastStateRef.current);
      if (historyPastRef.current.length > 100) historyPastRef.current.shift();
    }
    historyFutureRef.current = [];
    lastSnapshotRef.current = snapshotKey;
    lastStateRef.current = clonePanelState(panelStateSnapshot);
    updateHistoryFlags();
  }, [screen, snapshotKey, panelStateSnapshot, updateHistoryFlags]);

  const handleUndo = useCallback(() => {
    if (screen !== 'editor') return;
    const previous = historyPastRef.current.pop();
    if (!previous) return;
    historyFutureRef.current.push(clonePanelState(panelStateSnapshot));
    isRestoringHistoryRef.current = true;
    lastStateRef.current = clonePanelState(previous);
    lastSnapshotRef.current = JSON.stringify(previous);
    store.loadState(previous);
    updateHistoryFlags();
  }, [screen, panelStateSnapshot, store, updateHistoryFlags]);

  const handleRedo = useCallback(() => {
    if (screen !== 'editor') return;
    const next = historyFutureRef.current.pop();
    if (!next) return;
    historyPastRef.current.push(clonePanelState(panelStateSnapshot));
    isRestoringHistoryRef.current = true;
    lastStateRef.current = clonePanelState(next);
    lastSnapshotRef.current = JSON.stringify(next);
    store.loadState(next);
    updateHistoryFlags();
  }, [screen, panelStateSnapshot, store, updateHistoryFlags]);

  const computeSnapPosition = useCallback(
    (
      event: { activatorEvent: Event; delta: { x: number; y: number } },
      rail: ResolvedRail,
      moduleWidthCm: number,
    ): number => {
      const svgEl = document.querySelector('.panel-view-container svg');
      if (!svgEl) return 0;

      const svgRect = svgEl.getBoundingClientRect();
      const svgViewBox = svgEl.getAttribute('viewBox')?.split(' ').map(Number);
      if (!svgViewBox) return 0;

      const scaleX = svgViewBox[2] / svgRect.width;
      const dropX =
        (event.activatorEvent as PointerEvent).clientX +
        event.delta.x -
        svgRect.left;

      const svgX = dropX * scaleX + svgViewBox[0];
      const intX = layout.interiorOffsetXCm * 10;
      const usableStartPx = intX + (rail.xCm + rail.fixingMarginCm) * 10;

      let pos = snapToCm(pxToCm(svgX - usableStartPx));
      pos = Math.max(0, Math.min(pos, rail.usableWidthCm - moduleWidthCm));
      return snapToCm(pos);
    },
    [layout],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'new-module' || data?.type === 'new-external-device') {
      setActiveModuleId(data.moduleId as string);
    } else if (data?.type === 'placed-module') {
      setActivePlaced({
        instanceId: data.instanceId as string,
        moduleId: data.moduleId as string,
        rowId: data.rowId as string,
      });
      setActiveModuleId(data.moduleId as string);
    } else if (data?.type === 'new-panel-io') {
      setActiveDragInfo({ type: 'panel-io', label: data.direction === 'input' ? 'Entrada' : 'Saída', color: '#546e7a' });
    } else if (data?.type === 'new-busbar') {
      setActiveDragInfo({ type: 'busbar', label: data.label as string, color: data.color as string });
    } else if (data?.type === 'new-text-annotation') {
      setActiveDragInfo({ type: 'annotation', label: 'Texto', color: '#546e7a' });
    }
  }, []);

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const data = event.active.data.current;
      if (!data) return;

      const isNew = data.type === 'new-module';
      const isPlaced = data.type === 'placed-module';
      if (!isNew && !isPlaced) return;

      const { over } = event;
      if (!over) {
        setGhostPreview(null);
        return;
      }

      const overData = over.data.current as
        | { rowId: string; rail: ResolvedRail }
        | undefined;
      if (!overData?.rowId) {
        setGhostPreview(null);
        return;
      }

      const moduleId = data.moduleId as string;
      const def = getModuleById(moduleId);
      if (!def) return;

      const rail = overData.rail;
      const row = store.rows.find((r) => r.id === overData.rowId);
      if (!row) return;

      let positionCm = computeSnapPosition(event, rail, def.widthCm);
      const excludeId = isPlaced ? (data.instanceId as string) : undefined;
      const freeMove = shiftHeldRef.current;

      if (!freeMove && !canPlace(row.modules, positionCm, def.widthCm, rail.usableWidthCm, excludeId)) {
        positionCm = clampToNeighbors(row.modules, positionCm, def.widthCm, rail.usableWidthCm, excludeId);
      }

      const valid = freeMove || canPlace(row.modules, positionCm, def.widthCm, rail.usableWidthCm, excludeId);

      setGhostPreview({
        rowId: overData.rowId,
        positionCm,
        widthCm: def.widthCm,
        color: def.color,
        valid,
        instanceId: isPlaced ? (data.instanceId as string) : undefined,
      });
    },
    [store.rows, computeSnapPosition],
  );

  const clearDragState = useCallback(() => {
    setActiveModuleId(null);
    setActivePlaced(null);
    setGhostPreview(null);
    setActiveDragInfo(null);
  }, []);

  const handleDragCancel = useCallback(
    (_event: DragCancelEvent) => clearDragState(),
    [clearDragState],
  );

  const computeExternalDevicePosition = useCallback(
    (event: DragEndEvent): { x: number; y: number } | null => {
      const svgEl = document.querySelector('.panel-view-container svg');
      if (!svgEl) return null;
      const svgRect = svgEl.getBoundingClientRect();
      const svgViewBox = svgEl.getAttribute('viewBox')?.split(' ').map(Number);
      if (!svgViewBox) return null;

      const scaleX = svgViewBox[2] / svgRect.width;
      const scaleY = svgViewBox[3] / svgRect.height;
      const dropX = (event.activatorEvent as PointerEvent).clientX + event.delta.x - svgRect.left;
      const dropY = (event.activatorEvent as PointerEvent).clientY + event.delta.y - svgRect.top;
      const svgX = dropX * scaleX + svgViewBox[0];
      const svgY = dropY * scaleY + svgViewBox[1];

      return { x: svgX, y: svgY };
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const placedInfo = activePlaced;
      clearDragState();

      const { active, over } = event;
      const data = active.data.current;
      if (!data) return;

      if (data.type === 'new-external-device') {
        const pos = computeExternalDevicePosition(event);
        if (pos) {
          store.addExternalDevice(data.moduleId as string, pos.x, pos.y);
        }
        return;
      }

      if (data.type === 'new-panel-io') {
        const pos = computeExternalDevicePosition(event);
        if (pos) {
          const layout = resolveLayout(store);
          const panelW = cmToPx(layout.exteriorWidthCm);
          const panelH = cmToPx(layout.exteriorHeightCm);
          const { edge, positionPercent } = closestEdge(pos.x, pos.y, panelW, panelH);
          store.addPanelIO(data.direction, data.ioType, edge, positionPercent);
        }
        return;
      }

      if (data.type === 'new-busbar') {
        const pos = computeExternalDevicePosition(event);
        if (pos) {
          store.addBusbar(data.busbarType as any, pos.x, pos.y);
        }
        return;
      }

      if (data.type === 'new-text-annotation') {
        const pos = computeExternalDevicePosition(event);
        if (pos) {
          store.addTextAnnotation(pos.x, pos.y);
        }
        return;
      }

      if (!over) return;

      const overData = over.data.current as
        | { rowId: string; rail: ResolvedRail }
        | undefined;
      if (!overData?.rowId) return;

      const moduleId = data.moduleId as string;
      const def = getModuleById(moduleId);
      if (!def) return;

      const rail = overData.rail;
      const row = store.rows.find((r) => r.id === overData.rowId);
      if (!row) return;

      const freeMove = shiftHeldRef.current;

      if (data.type === 'placed-module' && placedInfo) {
        let positionCm = computeSnapPosition(event, rail, def.widthCm);
        positionCm = Math.max(0, Math.min(positionCm, rail.usableWidthCm - def.widthCm));
        positionCm = snapToCm(positionCm);

        if (!freeMove && !canPlace(row.modules, positionCm, def.widthCm, rail.usableWidthCm, placedInfo.instanceId)) {
          positionCm = clampToNeighbors(row.modules, positionCm, def.widthCm, rail.usableWidthCm, placedInfo.instanceId);
        }

        if (freeMove || canPlace(row.modules, positionCm, def.widthCm, rail.usableWidthCm, placedInfo.instanceId)) {
          store.moveModule(
            placedInfo.rowId,
            placedInfo.instanceId,
            positionCm,
            overData.rowId !== placedInfo.rowId ? overData.rowId : undefined,
          );
        }
        return;
      }

      if (data.type !== 'new-module') return;

      let positionCm: number;
      if (event.delta) {
        positionCm = computeSnapPosition(event, rail, def.widthCm);
      } else {
        positionCm = findFirstFit(
          row.modules.map((m) => {
            const md = getModuleById(m.moduleId);
            return { start: m.positionCm, end: m.positionCm + (md?.widthCm ?? 0) };
          }),
          def.widthCm,
          rail.usableWidthCm,
        );
      }

      positionCm = Math.max(0, Math.min(positionCm, rail.usableWidthCm - def.widthCm));
      positionCm = snapToCm(positionCm);

      if (!freeMove && !canPlace(row.modules, positionCm, def.widthCm, rail.usableWidthCm)) {
        positionCm = clampToNeighbors(row.modules, positionCm, def.widthCm, rail.usableWidthCm);
      }

      if (freeMove || canPlace(row.modules, positionCm, def.widthCm, rail.usableWidthCm)) {
        store.addModule(overData.rowId, moduleId, positionCm);
      } else {
        const fallback = findFirstFit(
          row.modules.map((m) => {
            const md = getModuleById(m.moduleId);
            return { start: m.positionCm, end: m.positionCm + (md?.widthCm ?? 0) };
          }),
          def.widthCm,
          rail.usableWidthCm,
        );
        if (fallback >= 0 && canPlace(row.modules, fallback, def.widthCm, rail.usableWidthCm)) {
          store.addModule(overData.rowId, moduleId, fallback);
        }
      }
    },
    [store, computeSnapPosition, computeExternalDevicePosition, clearDragState, activePlaced],
  );

  const handleSelectModule = useCallback((id: string | null, additive?: boolean) => {
    store.selectBusbar(null);
    store.selectAnnotation(null);
    if (id === null) {
      setSelectedModules([]);
      return;
    }
    if (additive) {
      setSelectedModules((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    } else {
      setSelectedModules([id]);
    }
  }, [store]);

  const handleSelectBusbar = useCallback((id: string) => {
    setSelectedModules([]);
    store.selectWire(null);
    store.selectIO(null);
    store.selectBusbar(id);
    store.selectAnnotation(null);
  }, [store]);

  const handleSelectAnnotation = useCallback((id: string) => {
    setSelectedModules([]);
    store.selectWire(null);
    store.selectIO(null);
    store.selectBusbar(null);
    store.selectAnnotation(id);
  }, [store]);

  const handleSetSelection = useCallback((ids: string[]) => {
    setSelectedModules(ids);
  }, []);

  useEffect(() => {
    if (screen !== 'editor') return;
    const handler = (e: BeforeUnloadEvent) => {
      if (store.getIsDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [screen, store]);

  if (screen === 'setup') {
    return <PanelConfig />;
  }

  const singleSelected = selectedModules.length === 1 ? selectedModules[0] : null;
  const showProperties = singleSelected || store.selectedWireId || store.selectedIOId || store.selectedBusbarId || store.selectedAnnotationId;
  const showMultiInfo = selectedModules.length > 1;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="editor-layout">
        <Toolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          simActive={simActive}
          onSimToggle={() => setSimActive((v) => !v)}
        />
        <div className="editor-body">
          {viewMode === 'panel' && <ModuleLibrary />}
          {viewMode === 'panel' && (
            <PanelView
              ghostPreview={ghostPreview}
              selectedModules={selectedModules}
              onSelectModule={handleSelectModule}
              onSetSelection={handleSetSelection}
              onPortClick={handlePortClick}
              onPortMouseDown={handlePortMouseDown}
              onPortMouseUp={handlePortMouseUp}
              onPortHover={handlePortHover}
              onPortLeave={handlePortLeave}
              hoverTarget={hoverTarget}
              simActive={simActive}
              energizedWires={simData.energizedWires}
              simStates={simData.states}
              onSimModeChange={simModeHandler ?? undefined}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              onSelectBusbar={handleSelectBusbar}
              selectedBusbarId={store.selectedBusbarId}
              onSelectAnnotation={handleSelectAnnotation}
              selectedAnnotationId={store.selectedAnnotationId}
            />
          )}
          {viewMode === 'schematic' && <SchematicView />}
          {viewMode === 'panel' && showProperties && (
            <PropertiesPanel selectedModuleId={singleSelected} />
          )}
          {viewMode === 'panel' && showMultiInfo && (
            <div className="properties-panel">
              <h3>{selectedModules.length} itens selecionados</h3>
              <p style={{ color: '#888', fontSize: 12, margin: '8px 0' }}>
                Arraste para mover em grupo
              </p>
            </div>
          )}
          {viewMode === 'panel' && simActive && (
            <SimulationOverlay onEnergizedWiresChange={handleSimDataChange} onSimModeChange={handleSimModeRegister} />
          )}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeModuleId ? (
          <DragOverlayContent moduleId={activeModuleId} />
        ) : activeDragInfo ? (
          <div style={{
            background: activeDragInfo.color,
            color: '#fff',
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            opacity: 0.85,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            {activeDragInfo.label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

function clonePanelState(state: PanelState): PanelState {
  return JSON.parse(JSON.stringify(state)) as PanelState;
}

function findFirstFit(
  occupied: { start: number; end: number }[],
  widthCm: number,
  railWidthCm: number,
): number {
  const sorted = [...occupied].sort((a, b) => a.start - b.start);
  let pos = 0;
  for (const seg of sorted) {
    if (pos + widthCm <= seg.start) return snapToCm(pos);
    pos = Math.max(pos, seg.end);
  }
  if (pos + widthCm <= railWidthCm) return snapToCm(pos);
  return -1;
}
