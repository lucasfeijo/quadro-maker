import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { usePanelStore } from '../store/panelStore';
import { resolveLayout } from '../utils/panelLayout';
import { cmToPx, canPlace, snapToCm } from '../utils/geometry';
import { getModuleById } from '../data/modules';
import type { PasteData } from '../store/panelStore';
import { DinRail } from './DinRail';
import { WireLayer } from './WireLayer';
import { PanelIOLayer } from './PanelIOLayer';
import { ExternalDeviceLayer, getExternalDeviceBounds } from './ExternalDeviceLayer';
import { getIOPosition } from '../utils/panelIO';
import type { GhostPreview, ComponentState } from '../types';

const MARGIN = 15;
const MODULE_HEIGHT_CM = 7;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 20;

interface MarqueeRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function marqueeToRect(m: MarqueeRect) {
  const x = Math.min(m.startX, m.currentX);
  const y = Math.min(m.startY, m.currentY);
  const w = Math.abs(m.currentX - m.startX);
  const h = Math.abs(m.currentY - m.startY);
  return { x, y, w, h };
}

interface ClipboardData {
  modules: Array<{ oldId: string; moduleId: string; positionCm: number; rowId: string; label?: string; properties?: Record<string, number | string> }>;
  externalDevices: Array<{ oldId: string; moduleId: string; x: number; y: number; label?: string; properties?: Record<string, number | string> }>;
  wires: Array<{ sourceOldId: string; sourcePortId: string; targetOldId: string; targetPortId: string }>;
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

interface PanelViewProps {
  ghostPreview: GhostPreview | null;
  selectedModules: string[];
  onSelectModule: (id: string | null, additive?: boolean) => void;
  onSetSelection: (ids: string[]) => void;
  onPortClick?: (instanceId: string, portId: string) => void;
  onPortHover?: (instanceId: string, portId: string) => void;
  onPortLeave?: () => void;
  hoverTarget?: { instanceId: string; portId: string } | null;
  simActive?: boolean;
  energizedWires?: Set<string>;
  simStates?: ComponentState[];
  onSimModeChange?: (instanceId: string, newMode: string) => void;
}

export const PanelView: React.FC<PanelViewProps> = ({
  ghostPreview,
  selectedModules,
  onSelectModule,
  onSetSelection,
  onPortClick,
  onPortHover,
  onPortLeave,
  hoverTarget,
  simActive,
  energizedWires,
  simStates,
  onSimModeChange,
}) => {
  const state = usePanelStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const clipboardRef = useRef<{ data: ClipboardData; pasteCount: number } | null>(null);
  const clampZoom = useCallback((value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)), []);

  const layout = useMemo(
    () =>
      resolveLayout({
        name: state.name,
        enclosureId: state.enclosureId,
        widthUnits: state.widthUnits,
        rowCount: state.rowCount,
        rows: state.rows,
      }),
    [state.enclosureId, state.widthUnits, state.rowCount, state.rows, state.name],
  );

  const svgWidth = cmToPx(layout.exteriorWidthCm);
  const svgHeight = cmToPx(layout.exteriorHeightCm);
  const intX = cmToPx(layout.interiorOffsetXCm);
  const intY = cmToPx(layout.interiorOffsetYCm);
  const intW = cmToPx(layout.interiorWidthCm);
  const intH = cmToPx(layout.interiorHeightCm);

  const contentBounds = useMemo(() => {
    let minX = 0;
    let minY = 0;
    let maxX = svgWidth;
    let maxY = svgHeight;

    for (const dev of state.externalDevices) {
      const bounds = getExternalDeviceBounds(dev);
      if (bounds) {
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
      }
    }

    return {
      x: minX - MARGIN,
      y: minY - MARGIN,
      w: maxX - minX + MARGIN * 2,
      h: maxY - minY + MARGIN * 2,
    };
  }, [svgWidth, svgHeight, state.externalDevices]);

  const contentBoundsRef = useRef(contentBounds);
  contentBoundsRef.current = contentBounds;

  const fitToContainer = useCallback(() => {
    const container = containerRef.current;
    const cb = contentBoundsRef.current;
    if (!container || cb.w <= 0 || cb.h <= 0) return;
    const cssPad = 20;
    const availW = container.clientWidth - cssPad * 2;
    const availH = container.clientHeight - cssPad * 2;
    if (availW <= 0 || availH <= 0) return;
    const fitZoom = Math.min(availW / cb.w, availH / cb.h);
    setZoom(clampZoom(fitZoom));
  }, [clampZoom]);

  useEffect(() => {
    requestAnimationFrame(fitToContainer);
    const onResize = () => fitToContainer();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fitToContainer]);

  const handleClearSelection = useCallback(() => {
    if (didMarqueeRef.current) {
      didMarqueeRef.current = false;
      return;
    }
    onSelectModule(null);
    state.selectWire(null);
    state.selectIO(null);
    if (state.wiringFrom) state.cancelWiring();
  }, [onSelectModule, state]);

  // --- SVG coordinate helper ---
  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM()?.inverse();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm);
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  // --- Marquee selection ---
  const marqueeRef = useRef<MarqueeRect | null>(null);

  const handleMarqueeEnd = useCallback(() => {
    const m = marqueeRef.current;
    setMarquee(null);
    marqueeRef.current = null;
    if (!m) return;

    const sel = marqueeToRect(m);
    if (sel.w < 2 && sel.h < 2) return;

    const ids: string[] = [];

    for (const row of state.rows) {
      const railIdx = state.rows.indexOf(row);
      const rail = layout.rails[railIdx];
      if (!rail) continue;
      const railLeftPx = intX + cmToPx(rail.xCm);
      const fixingPx = cmToPx(rail.fixingMarginCm);
      const usableOffsetXPx = railLeftPx + fixingPx;
      const railTopPx = intY + cmToPx(rail.yCm);
      const railHeightPx = cmToPx(1);
      const railCenterY = railTopPx + railHeightPx / 2;

      for (const mod of row.modules) {
        const def = getModuleById(mod.moduleId);
        if (!def) continue;
        const mx = usableOffsetXPx + cmToPx(mod.positionCm);
        const my = railCenterY - cmToPx(MODULE_HEIGHT_CM / 2);
        const mw = cmToPx(def.widthCm);
        const mh = cmToPx(MODULE_HEIGHT_CM);
        if (rectsOverlap(sel.x, sel.y, sel.w, sel.h, mx, my, mw, mh)) {
          ids.push(mod.instanceId);
        }
      }
    }

    for (const dev of state.externalDevices) {
      const bounds = getExternalDeviceBounds(dev);
      if (!bounds) continue;
      if (rectsOverlap(sel.x, sel.y, sel.w, sel.h, bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)) {
        ids.push(dev.instanceId);
      }
    }

    if (ids.length > 0) {
      onSetSelection(ids);
    }
  }, [state, layout, intX, intY, onSetSelection]);

  const didMarqueeRef = useRef(false);

  const handleSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const tag = (e.target as SVGElement).tagName;
    if (tag !== 'svg' && tag !== 'rect') return;
    const cls = (e.target as SVGElement).getAttribute('class');
    const parentCls = (e.target as SVGElement).parentElement?.getAttribute('class');
    if (cls === 'module-block' || parentCls === 'module-block') return;

    const pt = screenToSvg(e.clientX, e.clientY);
    const rect = { startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y };
    marqueeRef.current = rect;
    didMarqueeRef.current = false;
    setMarquee(rect);
  }, [screenToSvg]);

  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!marqueeRef.current) return;
    const pt = screenToSvg(e.clientX, e.clientY);
    const updated = { ...marqueeRef.current, currentX: pt.x, currentY: pt.y };
    marqueeRef.current = updated;
    setMarquee(updated);
    const r = marqueeToRect(updated);
    if (r.w > 2 || r.h > 2) didMarqueeRef.current = true;
  }, [screenToSvg]);

  const handleSvgMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    if (!marqueeRef.current) return;
    handleMarqueeEnd();
  }, [handleMarqueeEnd]);

  // --- Keyboard: delete + zoom ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (state.wiringFrom) { state.cancelWiring(); return; }
        if (state.selectedWireId) { state.selectWire(null); return; }
        if (state.selectedIOId) { state.selectIO(null); return; }
        if (selectedModules.length > 0) { onSelectModule(null); return; }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        if (state.selectedWireId) {
          if (confirm('Remover fio?')) state.removeWire(state.selectedWireId);
          return;
        }
        if (state.selectedIOId) {
          if (confirm('Remover entrada/saída?')) state.removePanelIO(state.selectedIOId);
          return;
        }
        if (selectedModules.length > 1) {
          if (confirm(`Remover ${selectedModules.length} itens?`)) {
            const moduleItems: Array<{ rowId: string; instanceId: string }> = [];
            const extDevIds: string[] = [];
            for (const id of selectedModules) {
              const extDev = state.externalDevices.find((d) => d.instanceId === id);
              if (extDev) {
                extDevIds.push(id);
                continue;
              }
              for (const row of state.rows) {
                if (row.modules.find((m) => m.instanceId === id)) {
                  moduleItems.push({ rowId: row.id, instanceId: id });
                  break;
                }
              }
            }
            state.removeMultiple(moduleItems, extDevIds);
            onSelectModule(null);
          }
          return;
        }
        if (selectedModules.length === 1) {
          const id = selectedModules[0];
          const extDev = state.externalDevices.find((d) => d.instanceId === id);
          if (extDev) {
            const def = getModuleById(extDev.moduleId);
            if (confirm(`Remover ${extDev.label || def?.name || 'dispositivo'}?`)) {
              state.removeExternalDevice(id);
              onSelectModule(null);
            }
            return;
          }
          for (const row of state.rows) {
            const mod = row.modules.find((m) => m.instanceId === id);
            if (mod) {
              const def = getModuleById(mod.moduleId);
              if (confirm(`Remover ${mod.label || def?.name || 'módulo'}?`)) {
                state.removeModule(row.id, mod.instanceId);
                onSelectModule(null);
              }
              break;
            }
          }
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom((z) => clampZoom(z + 0.2));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setZoom((z) => clampZoom(z - 0.2));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        fitToContainer();
      }

      const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x') && !isInput) {
        if (selectedModules.length === 0) return;
        e.preventDefault();
        const selectedSet = new Set(selectedModules);
        const cbData: ClipboardData = { modules: [], externalDevices: [], wires: [] };

        for (const id of selectedModules) {
          const extDev = state.externalDevices.find((d) => d.instanceId === id);
          if (extDev) {
            cbData.externalDevices.push({
              oldId: id, moduleId: extDev.moduleId, x: extDev.x, y: extDev.y, label: extDev.label,
              properties: extDev.properties ? { ...extDev.properties } : undefined,
            });
            continue;
          }
          for (const row of state.rows) {
            const mod = row.modules.find((m) => m.instanceId === id);
            if (mod) {
              cbData.modules.push({
                oldId: id, moduleId: mod.moduleId, positionCm: mod.positionCm, rowId: row.id, label: mod.label,
                properties: mod.properties ? { ...mod.properties } : undefined,
              });
              break;
            }
          }
        }

        for (const wire of state.wires) {
          if (selectedSet.has(wire.sourceInstanceId) && selectedSet.has(wire.targetInstanceId)) {
            cbData.wires.push({
              sourceOldId: wire.sourceInstanceId, sourcePortId: wire.sourcePortId,
              targetOldId: wire.targetInstanceId, targetPortId: wire.targetPortId,
            });
          }
        }

        clipboardRef.current = { data: cbData, pasteCount: 0 };

        if (e.key === 'x') {
          const moduleItems: Array<{ rowId: string; instanceId: string }> = [];
          const extDevIds: string[] = [];
          for (const id of selectedModules) {
            if (state.externalDevices.find((d) => d.instanceId === id)) {
              extDevIds.push(id);
            } else {
              for (const row of state.rows) {
                if (row.modules.find((m) => m.instanceId === id)) {
                  moduleItems.push({ rowId: row.id, instanceId: id });
                  break;
                }
              }
            }
          }
          state.removeMultiple(moduleItems, extDevIds);
          onSelectModule(null);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isInput) {
        if (!clipboardRef.current) return;
        e.preventDefault();
        const cb = clipboardRef.current;
        cb.pasteCount++;
        const offset = cb.pasteCount;
        const EXT_OFFSET = 15;

        const pasteData: PasteData = { modules: [], externalDevices: [], wires: cb.data.wires };

        for (const ext of cb.data.externalDevices) {
          pasteData.externalDevices.push({
            ...ext,
            x: ext.x + EXT_OFFSET * offset,
            y: ext.y + EXT_OFFSET * offset,
          });
        }

        for (const mod of cb.data.modules) {
          const def = getModuleById(mod.moduleId);
          if (!def) continue;
          const rowIdx = state.rows.findIndex((r) => r.id === mod.rowId);
          const rail = rowIdx >= 0 ? layout.rails[rowIdx] : undefined;
          if (!rail) continue;
          const row = state.rows[rowIdx];

          let targetPos = snapToCm(mod.positionCm + 2 * offset);
          if (!canPlace(row.modules, targetPos, def.widthCm, rail.usableWidthCm)) {
            const occupied = row.modules.map((m) => {
              const md = getModuleById(m.moduleId);
              return { start: m.positionCm, end: m.positionCm + (md?.widthCm ?? 0) };
            });
            targetPos = findFirstFit(occupied, def.widthCm, rail.usableWidthCm);
          }
          if (targetPos >= 0 && canPlace(row.modules, targetPos, def.widthCm, rail.usableWidthCm)) {
            pasteData.modules.push({ ...mod, positionCm: targetPos });
          }
        }

        const newIds = state.pasteElements(pasteData);
        onSetSelection(newIds);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedModules, state, layout, fitToContainer, onSelectModule, onSetSelection, clampZoom]);

  // --- Ctrl+Wheel zoom toward cursor ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();

      const svg = svgRef.current;
      if (!svg) return;

      const oldZoom = zoomRef.current;
      const newZoom = clampZoom(oldZoom - e.deltaY * 0.002);
      if (newZoom === oldZoom) return;

      const ratio = newZoom / oldZoom;
      const containerRect = container.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();

      const mouseToSvgX = e.clientX - svgRect.left;
      const mouseToSvgY = e.clientY - svgRect.top;
      const mouseInViewX = e.clientX - containerRect.left;
      const mouseInViewY = e.clientY - containerRect.top;

      setZoom(newZoom);

      requestAnimationFrame(() => {
        const newSvgRect = svg.getBoundingClientRect();
        const newContainerRect = container.getBoundingClientRect();
        const svgContentX = newSvgRect.left - newContainerRect.left + container.scrollLeft;
        const svgContentY = newSvgRect.top - newContainerRect.top + container.scrollTop;
        container.scrollLeft = svgContentX + mouseToSvgX * ratio - mouseInViewX;
        container.scrollTop = svgContentY + mouseToSvgY * ratio - mouseInViewY;
      });
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, [clampZoom]);

  const vb = contentBounds;
  const viewBox = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;

  const marqueeDisplay = marquee ? marqueeToRect(marquee) : null;

  return (
    <div
      ref={containerRef}
      className="panel-view-container"
      onClick={handleClearSelection}
    >
      <div className="zoom-controls">
        <button onClick={() => setZoom((z) => clampZoom(z + 0.2))}>+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => clampZoom(z - 0.2))}>-</button>
        <button onClick={fitToContainer} title="Ajustar ao container">⊡</button>
      </div>
      <div className="panel-view-inner">
      <svg
        ref={svgRef}
        width={vb.w * zoom}
        height={vb.h * zoom}
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', flexShrink: 0 }}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
      >
        <defs>
          <pattern
            id="hatch"
            width="3"
            height="3"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="3" stroke="#999" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid-dots" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="0.3" fill="#ccc" />
          </pattern>
        </defs>

        {/* Workspace background with dot grid */}
        <rect
          x={vb.x}
          y={vb.y}
          width={vb.w}
          height={vb.h}
          fill="url(#grid-dots)"
        />

        {/* Exterior shell */}
        <rect
          x={0}
          y={0}
          width={svgWidth}
          height={svgHeight}
          rx={2}
          fill={layout.isEnclosure ? '#e0e0e0' : '#f5f5f5'}
          stroke="#999"
          strokeWidth={0.5}
        />

        {/* Interior area */}
        <rect
          x={intX}
          y={intY}
          width={intW}
          height={intH}
          fill="#fafafa"
          stroke="#bbb"
          strokeWidth={0.3}
        />

        {/* Mounting holes */}
        {layout.mountingHoles.map((hole, i) => (
          <circle
            key={i}
            cx={intX + cmToPx(hole.xCm)}
            cy={intY + cmToPx(hole.yCm)}
            r={hole.diameterMm / 2}
            fill="none"
            stroke="#999"
            strokeWidth={0.3}
          />
        ))}

        {/* DIN Rails */}
        {layout.rails.map((rail, i) => {
          const row = state.rows[i];
          if (!row) return null;
          return (
            <DinRail
              key={rail.id}
              rail={rail}
              row={row}
              interiorOffsetXPx={intX}
              interiorOffsetYPx={intY}
              selectedModules={selectedModules}
              onSelectModule={onSelectModule}
              ghostPreview={
                ghostPreview?.rowId === row.id ? ghostPreview : null
              }
              onPortClick={onPortClick}
              onPortHover={onPortHover}
              onPortLeave={onPortLeave}
              simStates={simActive ? simStates : undefined}
              onSimModeChange={simActive ? onSimModeChange : undefined}
            />
          );
        })}

        {/* Wires */}
        <WireLayer
          rails={layout.rails}
          interiorOffsetXPx={intX}
          interiorOffsetYPx={intY}
          panelWidth={svgWidth}
          panelHeight={svgHeight}
          svgWidth={vb.w}
          svgHeight={vb.h}
          padding={-vb.x}
          selectedWireId={state.selectedWireId}
          onSelectWire={(id) => state.selectWire(id)}
          hoverTarget={hoverTarget}
          energizedWires={simActive ? energizedWires : undefined}
        />

        {/* Panel I/O */}
        <PanelIOLayer
          svgWidth={svgWidth}
          svgHeight={svgHeight}
          selectedIOId={state.selectedIOId}
          onSelectIO={(id) => state.selectIO(id)}
          onPortClick={onPortClick}
          onPortHover={onPortHover}
          onPortLeave={onPortLeave}
        />

        {/* External Devices */}
        <ExternalDeviceLayer
          selectedDeviceIds={selectedModules}
          onSelectDevice={onSelectModule}
          onPortClick={onPortClick}
          onPortHover={onPortHover}
          onPortLeave={onPortLeave}
          simStates={simActive ? simStates : undefined}
          onSimModeChange={simActive ? onSimModeChange : undefined}
        />

        {/* Marquee selection rectangle */}
        {marqueeDisplay && marqueeDisplay.w > 0 && marqueeDisplay.h > 0 && (
          <rect
            x={marqueeDisplay.x}
            y={marqueeDisplay.y}
            width={marqueeDisplay.w}
            height={marqueeDisplay.h}
            fill="rgba(33, 150, 243, 0.1)"
            stroke="#2196f3"
            strokeWidth={0.5}
            strokeDasharray="2,1"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>
      </div>
    </div>
  );
};
