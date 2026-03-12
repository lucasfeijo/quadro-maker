import React, { useState, useCallback, useMemo } from 'react';
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
import { SimulationView } from './SimulationView';
import { getModuleById } from '../data/modules';
import { snapToCm, pxToCm, canPlace } from '../utils/geometry';
import { resolveLayout } from '../utils/panelLayout';
import type { ResolvedRail, GhostPreview } from '../types';

type ViewMode = 'panel' | 'schematic' | 'simulation';

export const App: React.FC = () => {
  const screen = usePanelStore((s) => s.screen);
  const store = usePanelStore();
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activePlaced, setActivePlaced] = useState<{
    instanceId: string;
    moduleId: string;
    rowId: string;
  } | null>(null);
  const [ghostPreview, setGhostPreview] = useState<GhostPreview | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<{ instanceId: string; portId: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('panel');

  const handlePortClick = useCallback(
    (instanceId: string, portId: string) => {
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

  const handlePortHover = useCallback(
    (instanceId: string, portId: string) => {
      setHoverTarget({ instanceId, portId });
    },
    [],
  );

  const handlePortLeave = useCallback(() => {
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
    if (data?.type === 'new-module') {
      setActiveModuleId(data.moduleId as string);
    } else if (data?.type === 'placed-module') {
      setActivePlaced({
        instanceId: data.instanceId as string,
        moduleId: data.moduleId as string,
        rowId: data.rowId as string,
      });
      setActiveModuleId(data.moduleId as string);
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

      const positionCm = computeSnapPosition(event, rail, def.widthCm);
      const excludeId = isPlaced ? (data.instanceId as string) : undefined;
      const valid = canPlace(row.modules, positionCm, def.widthCm, rail.usableWidthCm, excludeId);

      setGhostPreview({
        rowId: overData.rowId,
        positionCm,
        widthCm: def.widthCm,
        color: def.color,
        valid,
      });
    },
    [store.rows, computeSnapPosition],
  );

  const clearDragState = useCallback(() => {
    setActiveModuleId(null);
    setActivePlaced(null);
    setGhostPreview(null);
  }, []);

  const handleDragCancel = useCallback(
    (_event: DragCancelEvent) => clearDragState(),
    [clearDragState],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const placedInfo = activePlaced;
      clearDragState();

      const { active, over } = event;
      if (!over) return;

      const data = active.data.current;
      if (!data) return;

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

      if (data.type === 'placed-module' && placedInfo) {
        let positionCm = computeSnapPosition(event, rail, def.widthCm);
        positionCm = Math.max(0, Math.min(positionCm, rail.usableWidthCm - def.widthCm));
        positionCm = snapToCm(positionCm);

        if (canPlace(row.modules, positionCm, def.widthCm, rail.usableWidthCm, placedInfo.instanceId)) {
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

      if (canPlace(row.modules, positionCm, def.widthCm, rail.usableWidthCm)) {
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
    [store, computeSnapPosition, clearDragState, activePlaced],
  );

  if (screen === 'setup') {
    return <PanelConfig />;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="editor-layout">
        <Toolbar viewMode={viewMode} onViewModeChange={setViewMode} />
        <div className="editor-body">
          {viewMode === 'panel' && <ModuleLibrary />}
          {viewMode === 'panel' && (
            <PanelView
              ghostPreview={ghostPreview}
              selectedModule={selectedModule}
              onSelectModule={setSelectedModule}
              onPortClick={handlePortClick}
              onPortHover={handlePortHover}
              onPortLeave={handlePortLeave}
              hoverTarget={hoverTarget}
            />
          )}
          {viewMode === 'schematic' && <SchematicView />}
          {viewMode === 'simulation' && <SimulationView />}
          {viewMode === 'panel' && (selectedModule || store.selectedWireId || store.selectedIOId) && (
            <PropertiesPanel selectedModuleId={selectedModule} />
          )}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeModuleId ? (
          <DragOverlayContent moduleId={activeModuleId} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

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
