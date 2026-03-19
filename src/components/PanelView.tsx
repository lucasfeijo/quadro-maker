import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { usePanelStore } from '../store/panelStore';
import { resolveLayout } from '../utils/panelLayout';
import { mmToPx, canPlace, snapToMm } from '../utils/geometry';
import { getModuleById } from '../data/modules';
import type { PasteData } from '../store/panelStore';
import { DinRail } from './DinRail';
import { WireLayer } from './WireLayer';
import { PanelIOLayer } from './PanelIOLayer';
import { ExternalDeviceLayer, getExternalDeviceBounds, getExternalDevicePortPosition } from './ExternalDeviceLayer';
import { TextAnnotationLayer } from './TextAnnotationLayer';
import { FitToWidthIcon, FitToContainerIcon } from './ZoomIcons';
import { getIOPortPosition, getIOPosition } from '../utils/panelIO';
import type { GhostPreview, ComponentState, PanelEdge } from '../types';

const MARGIN = 15;
const MODULE_HEIGHT_MM = 70;
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
  modules: Array<{ oldId: string; moduleId: string; positionMm: number; rowId: string; label?: string; properties?: Record<string, number | string> }>;
  externalDevices: Array<{ oldId: string; moduleId: string; x: number; y: number; label?: string; properties?: Record<string, number | string> }>;
  wires: Array<{ sourceOldId: string; sourcePortId: string; targetOldId: string; targetPortId: string }>;
}

function findFirstFit(
  occupied: { start: number; end: number }[],
  widthMm: number,
  railWidthMm: number,
): number {
  const sorted = [...occupied].sort((a, b) => a.start - b.start);
  let pos = 0;
  for (const seg of sorted) {
    if (pos + widthMm <= seg.start) return snapToMm(pos);
    pos = Math.max(pos, seg.end);
  }
  if (pos + widthMm <= railWidthMm) return snapToMm(pos);
  return -1;
}

interface PanelViewProps {
  ghostPreview: GhostPreview | null;
  hideRailDropHighlight?: boolean;
  panelEdgePreview?: { edge: PanelEdge; positionPercent: number } | null;
  selectedModules: string[];
  onSelectModule: (id: string | null, additive?: boolean) => void;
  onSetSelection: (ids: string[]) => void;
  onPortClick?: (instanceId: string, portId: string) => void;
  onPortMouseDown?: (instanceId: string, portId: string) => void;
  onPortMouseUp?: (instanceId: string, portId: string) => void;
  onPortHover?: (instanceId: string, portId: string) => void;
  onPortLeave?: () => void;
  hoverTarget?: { instanceId: string; portId: string } | null;
  simActive?: boolean;
  energizedWires?: Set<string>;
  simStates?: ComponentState[];
  onSimModeChange?: (instanceId: string, newMode: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onSelectAnnotation?: (id: string) => void;
  selectedAnnotationId?: string | null;
  altHeld?: boolean;
  onDragChange?: (dragging: boolean) => void;
}

const EDGE_PREVIEW_IO_BOX_W = 20;
const EDGE_PREVIEW_IO_BOX_H = 14;
const WALL_PX = 35;

function getEdgePreviewPosition(
  edge: PanelEdge,
  positionPercent: number,
  svgWidth: number,
  svgHeight: number,
): { x: number; y: number; w: number; h: number } {
  const frac = positionPercent / 100;
  const w = EDGE_PREVIEW_IO_BOX_W;
  const h = EDGE_PREVIEW_IO_BOX_H;
  switch (edge) {
    case 'top': {
      const bx = frac * svgWidth - w / 2;
      const by = (WALL_PX - h) / 2 + 4;
      return { x: bx, y: by, w, h };
    }
    case 'bottom': {
      const bx = frac * svgWidth - w / 2;
      const by = svgHeight - (WALL_PX + h) / 2 - 4;
      return { x: bx, y: by, w, h };
    }
    case 'left': {
      const bx = (WALL_PX - w) / 2;
      const by = frac * svgHeight - h / 2;
      return { x: bx, y: by, w, h };
    }
    case 'right': {
      const bx = svgWidth - (WALL_PX + w) / 2;
      const by = frac * svgHeight - h / 2;
      return { x: bx, y: by, w, h };
    }
  }
}

export const PanelView: React.FC<PanelViewProps> = ({
  ghostPreview,
  hideRailDropHighlight = false,
  panelEdgePreview,
  selectedModules,
  onSelectModule,
  onSetSelection,
  onPortClick,
  onPortMouseDown,
  onPortMouseUp,
  onPortHover,
  onPortLeave,
  hoverTarget,
  simActive,
  energizedWires,
  simStates,
  onSimModeChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSelectAnnotation,
  selectedAnnotationId,
  altHeld,
  onDragChange,
}) => {
  const state = usePanelStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [zoomInput, setZoomInput] = useState('');
  const [zoomInputActive, setZoomInputActive] = useState(false);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const [isDraggingSegment, setIsDraggingSegment] = useState(false);
  const [isDraggingIO, setIsDraggingIO] = useState(false);
  const [hoveringWaypoint, setHoveringWaypoint] = useState(false);
  const [isDraggingWaypoint, setIsDraggingWaypoint] = useState(false);
  const [isDraggingDevice, setIsDraggingDevice] = useState(false);

  useEffect(() => {
    onDragChange?.(isDraggingSegment || isDraggingIO || isDraggingWaypoint || isDraggingDevice);
  }, [isDraggingSegment, isDraggingIO, isDraggingWaypoint, isDraggingDevice, onDragChange]);
  const [wiringMousePos, setWiringMousePos] = useState<{ x: number; y: number } | null>(null);
  const [measureActive, setMeasureActive] = useState(false);
  const [measureLines, setMeasureLines] = useState<Array<{ ax: number; ay: number; bx: number; by: number }>>([]);
  const [measurePending, setMeasurePending] = useState<{ x: number; y: number } | null>(null);
  const [measureMouse, setMeasureMouse] = useState<{ x: number; y: number } | null>(null);
  const clipboardRef = useRef<{ data: ClipboardData; pasteCount: number } | null>(null);
  const clampZoom = useCallback((value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)), []);

  const commitZoomInput = useCallback(() => {
    const v = parseFloat(zoomInput);
    if (Number.isNaN(v) || v <= 0 || v >= 1000) {
      setZoomInputActive(false);
      return;
    }
    setZoom(clampZoom(v / 100));
    setZoomInputActive(false);
  }, [zoomInput, clampZoom]);

  const zoomInputRef = useRef<HTMLInputElement>(null);

  const handleZoomInputFocus = useCallback(() => {
    setZoomInput(String(Math.round(zoom * 100)));
    setZoomInputActive(true);
    requestAnimationFrame(() => zoomInputRef.current?.select());
  }, [zoom]);

  const handleZoomInputBlur = useCallback(() => {
    commitZoomInput();
  }, [commitZoomInput]);

  const handleZoomInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        (e.currentTarget as HTMLInputElement).blur();
      }
    },
    [],
  );

  const layout = useMemo(
    () =>
      resolveLayout({
        enclosureId: state.enclosureId,
        widthUnits: state.widthUnits,
        rowCount: state.rowCount,
        rows: state.rows,
        exteriorWidthMm: state.exteriorWidthMm,
        exteriorHeightMm: state.exteriorHeightMm,
        railYOverridesMm: state.railYOverridesMm,
        barOverhangMm: state.barOverhangMm,
      }),
    [state.enclosureId, state.widthUnits, state.rowCount, state.rows, state.exteriorWidthMm, state.exteriorHeightMm, state.railYOverridesMm, state.barOverhangMm],
  );

  const svgWidth = mmToPx(layout.exteriorWidthMm);
  const svgHeight = mmToPx(layout.exteriorHeightMm);
  const intX = mmToPx(layout.interiorOffsetXMm);
  const intY = mmToPx(layout.interiorOffsetYMm);
  const intW = mmToPx(layout.interiorWidthMm);
  const intH = mmToPx(layout.interiorHeightMm);

  const ioWireTargets = useMemo(() => {
    const MODULE_H_MM = 70;
    const resolvePort = (instanceId: string, portId: string): { x: number; y: number } | null => {
      if (instanceId.startsWith('panel-io:')) {
        const ioId = instanceId.replace('panel-io:', '');
        const io = state.panelIOs.find((p) => p.id === ioId);
        if (!io) return null;
        const ppos = getIOPortPosition(io, portId, svgWidth, svgHeight);
        return ppos ? { x: ppos.x, y: ppos.y } : null;
      }
      const extDev = state.externalDevices.find((d) => d.instanceId === instanceId);
      if (extDev) return getExternalDevicePortPosition(extDev, portId);
      for (let ri = 0; ri < state.rows.length; ri++) {
        const mod = state.rows[ri].modules.find((m) => m.instanceId === instanceId);
        if (!mod) continue;
        const def = getModuleById(mod.moduleId);
        const port = def?.ports.find((p) => p.id === portId);
        const rail = layout.rails[ri];
        if (!def || !port || !rail) return null;
        const railLeft = intX + mmToPx(rail.xMm);
        const usableX = railLeft + mmToPx(rail.fixingMarginMm);
        const railCY = intY + mmToPx(rail.yMm) + mmToPx(35) / 2;
        const mx = usableX + mmToPx(mod.positionMm);
        const my = railCY - mmToPx(MODULE_H_MM / 2);
        const mh = mmToPx(MODULE_H_MM);
        const hasVerticalOffset = port.offsetYMm !== undefined;
        const py = hasVerticalOffset
          ? my + mmToPx(port.offsetYMm!)
          : port.side === 'top'
            ? my - 2
            : my + mh + 2;
        return { x: mx + mmToPx(port.offsetXMm), y: py };
      }
      return null;
    };

    const targets = new Map<string, Array<{ x: number; y: number }>>();
    for (const wire of state.wires) {
      const addTarget = (ioInstanceId: string, otherInstanceId: string, otherPortId: string) => {
        if (!ioInstanceId.startsWith('panel-io:')) return;
        const ioId = ioInstanceId.replace('panel-io:', '');
        const pos = resolvePort(otherInstanceId, otherPortId);
        if (!pos) return;
        if (!targets.has(ioId)) targets.set(ioId, []);
        targets.get(ioId)!.push(pos);
      };
      addTarget(wire.sourceInstanceId, wire.targetInstanceId, wire.targetPortId);
      addTarget(wire.targetInstanceId, wire.sourceInstanceId, wire.sourcePortId);
    }
    return targets;
  }, [state.wires, state.panelIOs, state.externalDevices, state.rows, layout.rails, svgWidth, svgHeight, intX, intY]);

  // All port positions for wiring snap targets
  const wiringSnapTargets = useMemo(() => {
    const targets: { x: number; y: number }[] = [];
    const MODULE_H_MM = 70;

    // Module ports
    for (let ri = 0; ri < state.rows.length; ri++) {
      const rail = layout.rails[ri];
      if (!rail) continue;
      const railLeft = intX + mmToPx(rail.xMm);
      const usableX = railLeft + mmToPx(rail.fixingMarginMm);
      const railCY = intY + mmToPx(rail.yMm) + mmToPx(35) / 2;

      for (const mod of state.rows[ri].modules) {
        const def = getModuleById(mod.moduleId);
        if (!def) continue;
        const mx = usableX + mmToPx(mod.positionMm);
        const my = railCY - mmToPx(MODULE_H_MM / 2);
        const mh = mmToPx(MODULE_H_MM);

        for (const port of def.ports) {
          const hasVO = port.offsetYMm !== undefined;
          const px = mx + mmToPx(port.offsetXMm);
          const py = hasVO
            ? my + mmToPx(port.offsetYMm!)
            : port.side === 'top' ? my - 2 : my + mh + 2;
          targets.push({ x: px, y: py });
        }
      }
    }

    // Panel IO ports
    for (const io of state.panelIOs) {
      for (const t of io.types) {
        const pos = getIOPortPosition(io, t, svgWidth, svgHeight);
        if (pos) targets.push({ x: pos.x, y: pos.y });
      }
    }

    // External device ports
    for (const dev of state.externalDevices) {
      const def = getModuleById(dev.moduleId);
      if (!def) continue;
      for (const port of def.ports) {
        const pos = getExternalDevicePortPosition(dev, port.id);
        if (pos) targets.push(pos);
      }
    }

    return targets;
  }, [state.rows, layout.rails, intX, intY, state.panelIOs, state.externalDevices, svgWidth, svgHeight]);

  const DIM_LABEL_MM = 8;
  const contentBounds = useMemo(() => {
    let minX = -mmToPx(DIM_LABEL_MM);
    let minY = -mmToPx(DIM_LABEL_MM);
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

    for (const io of state.panelIOs) {
      const pos = getIOPosition(io, svgWidth, svgHeight);
      minX = Math.min(minX, pos.boxX);
      minY = Math.min(minY, pos.boxY);
      maxX = Math.max(maxX, pos.boxX + pos.boxW);
      maxY = Math.max(maxY, pos.boxY + pos.boxH);
    }

    return {
      x: minX - MARGIN,
      y: minY - MARGIN,
      w: maxX - minX + MARGIN * 2,
      h: maxY - minY + MARGIN * 2,
    };
  }, [svgWidth, svgHeight, state.externalDevices, state.panelIOs]);

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

  const fitToWidth = useCallback(() => {
    const container = containerRef.current;
    const cb = contentBoundsRef.current;
    if (!container || cb.w <= 0) return;
    const cssPad = 20;
    const availW = container.clientWidth - cssPad * 2;
    if (availW <= 0) return;
    const fitZoom = availW / cb.w;
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
    // Don't cancel wiring if we just placed a waypoint via Alt+click
    if (wiringWaypointJustPlacedRef.current) {
      wiringWaypointJustPlacedRef.current = false;
      return;
    }
    onSelectModule(null);
    state.selectWire(null);
    state.selectIO(null);
    state.selectAnnotation(null);
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
      const railLeftPx = intX + mmToPx(rail.xMm);
      const fixingPx = mmToPx(rail.fixingMarginMm);
      const usableOffsetXPx = railLeftPx + fixingPx;
      const railTopPx = intY + mmToPx(rail.yMm);
      const railHeightPx = mmToPx(35);
      const railCenterY = railTopPx + railHeightPx / 2;

      for (const mod of row.modules) {
        const def = getModuleById(mod.moduleId);
        if (!def) continue;
        const mx = usableOffsetXPx + mmToPx(mod.positionMm);
        const my = railCenterY - mmToPx(MODULE_HEIGHT_MM / 2);
        const mw = mmToPx(def.widthMm);
        const mh = mmToPx(MODULE_HEIGHT_MM);
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
  const wiringWaypointJustPlacedRef = useRef(false);

  const resolvePortPos = useCallback((instanceId: string, portId: string): { x: number; y: number; side?: 'top' | 'bottom' | 'left' | 'right' } | null => {
    if (instanceId.startsWith('panel-io:')) {
      const ioId = instanceId.replace('panel-io:', '');
      const io = state.panelIOs.find((p) => p.id === ioId);
      if (!io) return null;
      const pos = getIOPortPosition(io, portId, svgWidth, svgHeight);
      if (!pos) return null;
      // Panel IO edge maps to the inward-facing side
      const edgeToSide: Record<string, 'top' | 'bottom' | 'left' | 'right'> = {
        top: 'top', bottom: 'bottom', left: 'left', right: 'right',
      };
      return { x: pos.x, y: pos.y, side: edgeToSide[io.edge] };
    }
    const extDev = state.externalDevices.find((d) => d.instanceId === instanceId);
    if (extDev) {
      const pos = getExternalDevicePortPosition(extDev, portId);
      if (!pos) return null;
      const def = getModuleById(extDev.moduleId);
      const port = def?.ports.find((p) => p.id === portId);
      const rot = Number(extDev.properties?.rotationDeg) || 0;
      let side = port?.side as 'top' | 'bottom' | 'left' | 'right' | undefined;
      // Rotate the side by the device rotation
      if (side && rot) {
        const sides: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];
        const steps = ((rot % 360) + 360) % 360 / 90;
        const idx = sides.indexOf(side);
        if (idx >= 0) side = sides[(idx + Math.round(steps)) % 4];
      }
      return { x: pos.x, y: pos.y, side };
    }
    for (let ri = 0; ri < state.rows.length; ri++) {
      const mod = state.rows[ri].modules.find((m) => m.instanceId === instanceId);
      if (!mod) continue;
      const def = getModuleById(mod.moduleId);
      const port = def?.ports.find((p) => p.id === portId);
      const rail = layout.rails[ri];
      if (!def || !port || !rail) return null;
      const railLeft = intX + mmToPx(rail.xMm);
      const usableX = railLeft + mmToPx(rail.fixingMarginMm);
      const railCY = intY + mmToPx(rail.yMm) + mmToPx(35) / 2;
      const mx = usableX + mmToPx(mod.positionMm);
      const my = railCY - mmToPx(70 / 2);
      const mh = mmToPx(70);
      const hasVO = port.offsetYMm !== undefined;
      const py = hasVO
        ? my + mmToPx(port.offsetYMm!)
        : port.side === 'top' ? my - 2 : my + mh + 2;
      return { x: mx + mmToPx(port.offsetXMm), y: py, side: port.side as 'top' | 'bottom' | 'left' | 'right' | undefined };
    }
    return null;
  }, [state.panelIOs, state.externalDevices, state.rows, layout.rails, svgWidth, svgHeight, intX, intY]);

  const snapWiringPoint = useCallback((pt: { x: number; y: number }): { x: number; y: number } => {
    const SNAP_TOL = 3;
    let sx = pt.x;
    let sy = pt.y;
    let bestDx = SNAP_TOL + 1;
    let bestDy = SNAP_TOL + 1;

    // Snap to all port positions
    for (const p of wiringSnapTargets) {
      const dx = Math.abs(sx - p.x);
      const dy = Math.abs(sy - p.y);
      if (dx < bestDx) { bestDx = dx; sx = p.x; }
      if (dy < bestDy) { bestDy = dy; sy = p.y; }
    }

    // Also snap to existing wiring waypoints
    for (const wp of state.wiringWaypoints) {
      const dx = Math.abs(sx - wp.x);
      const dy = Math.abs(sy - wp.y);
      if (dx < bestDx) { bestDx = dx; sx = wp.x; }
      if (dy < bestDy) { bestDy = dy; sy = wp.y; }
    }

    return { x: sx, y: sy };
  }, [wiringSnapTargets, state.wiringWaypoints]);

  const handleSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 2) {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      };
      return;
    }
    if (e.button !== 0) return;

    // Measuring tool click handling
    if (measureActive) {
      e.stopPropagation();
      e.preventDefault();
      const raw = screenToSvg(e.clientX, e.clientY);
      if (!measurePending) {
        setMeasurePending(raw);
      } else {
        let bx = raw.x;
        let by = raw.y;
        // Constrain to H/V unless Shift is held
        if (!e.shiftKey) {
          const dx = Math.abs(bx - measurePending.x);
          const dy = Math.abs(by - measurePending.y);
          if (dx >= dy) by = measurePending.y;
          else bx = measurePending.x;
        }
        setMeasureLines((prev) => [...prev, { ax: measurePending.x, ay: measurePending.y, bx, by }]);
        setMeasurePending(null);
        setMeasureMouse(null);
      }
      return;
    }

    // Alt+click during wiring: add waypoint(s) with Manhattan routing
    if (state.wiringFrom && e.altKey) {
      e.stopPropagation();
      e.preventDefault();
      const rawPt = screenToSvg(e.clientX, e.clientY);
      const snapped = (!e.shiftKey && state.wireSnapAlignment) ? snapWiringPoint(rawPt) : rawPt;

      // Determine the last point: last waypoint or source port
      const wps = state.wiringWaypoints;
      const PORT_EXT = 10;
      const isFirstWaypoint = wps.length === 0;
      const srcPortInfo = isFirstWaypoint
        ? resolvePortPos(state.wiringFrom.instanceId, state.wiringFrom.portId)
        : null;
      const lastPt = isFirstWaypoint
        ? srcPortInfo
        : wps[wps.length - 1];

      if (lastPt) {
        // For the first waypoint, prepend an extension point perpendicular to the port surface
        const extPoints: Array<{ x: number; y: number }> = [];
        let effectiveLast = lastPt;
        if (isFirstWaypoint && srcPortInfo?.side) {
          let ex = srcPortInfo.x;
          let ey = srcPortInfo.y;
          if (srcPortInfo.side === 'top') ey -= PORT_EXT;
          else if (srcPortInfo.side === 'bottom') ey += PORT_EXT;
          else if (srcPortInfo.side === 'left') ex -= PORT_EXT;
          else if (srcPortInfo.side === 'right') ex += PORT_EXT;
          extPoints.push({ x: ex, y: ey });
          effectiveLast = { x: ex, y: ey };
        }

        const dx = Math.abs(snapped.x - effectiveLast.x);
        const dy = Math.abs(snapped.y - effectiveLast.y);
        const EPSILON = 0.5;

        if (dx < EPSILON && dy < EPSILON) {
          // Too close to last point, just add extension if any
          if (extPoints.length > 0) state.addWiringWaypoints(extPoints);
        } else if (dy < EPSILON || dx < EPSILON) {
          // Already axis-aligned
          state.addWiringWaypoints([...extPoints, { x: snapped.x, y: snapped.y }]);
        } else {
          // Manhattan: horizontal first, then vertical
          state.addWiringWaypoints([
            ...extPoints,
            { x: snapped.x, y: effectiveLast.y },
            { x: snapped.x, y: snapped.y },
          ]);
        }
      } else {
        state.addWiringWaypoint(snapped.x, snapped.y);
      }

      wiringWaypointJustPlacedRef.current = true;
      return;
    }

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
  }, [screenToSvg, state, snapWiringPoint, resolvePortPos, measureActive, measurePending]);

  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanningRef.current) {
      const container = containerRef.current;
      if (container) {
        container.scrollLeft = panStartRef.current.scrollLeft - (e.clientX - panStartRef.current.x);
        container.scrollTop = panStartRef.current.scrollTop - (e.clientY - panStartRef.current.y);
      }
      return;
    }
    // Track mouse for measuring tool
    if (measureActive) {
      const pt = screenToSvg(e.clientX, e.clientY);
      if (measurePending) {
        let mx = pt.x;
        let my = pt.y;
        if (!e.shiftKey) {
          const dx = Math.abs(mx - measurePending.x);
          const dy = Math.abs(my - measurePending.y);
          if (dx >= dy) my = measurePending.y;
          else mx = measurePending.x;
        }
        setMeasureMouse({ x: mx, y: my });
      } else {
        setMeasureMouse(pt);
      }
    }
    // Track mouse position during wiring for preview
    if (state.wiringFrom) {
      const pt = screenToSvg(e.clientX, e.clientY);
      // Snap preview position when Alt is held (unless Shift disables snap)
      if (e.altKey && !e.shiftKey && state.wireSnapAlignment) {
        setWiringMousePos(snapWiringPoint(pt));
      } else {
        setWiringMousePos(pt);
      }
    }
    if (!marqueeRef.current) return;
    const pt = screenToSvg(e.clientX, e.clientY);
    const updated = { ...marqueeRef.current, currentX: pt.x, currentY: pt.y };
    marqueeRef.current = updated;
    setMarquee(updated);
    const r = marqueeToRect(updated);
    if (r.w > 2 || r.h > 2) didMarqueeRef.current = true;
  }, [screenToSvg, state.wiringFrom, state.wireSnapAlignment, snapWiringPoint, measureActive, measurePending]);

  const handleSvgMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 2) {
      isPanningRef.current = false;
      return;
    }
    if (e.button !== 0) return;
    if (!marqueeRef.current) return;
    handleMarqueeEnd();
  }, [handleMarqueeEnd]);

  // --- Keyboard: delete + zoom ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (measureActive) {
          if (measurePending) { setMeasurePending(null); setMeasureMouse(null); }
          else { setMeasureActive(false); setMeasureLines([]); setMeasurePending(null); setMeasureMouse(null); }
          return;
        }
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
      const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
      const isRedo = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'));

      if (isUndo && !isInput) {
        e.preventDefault();
        onUndo?.();
        return;
      }
      if (isRedo && !isInput) {
        e.preventDefault();
        onRedo?.();
        return;
      }

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
                oldId: id, moduleId: mod.moduleId, positionMm: mod.positionMm, rowId: row.id, label: mod.label,
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

          let targetPos = snapToMm(mod.positionMm + 20 * offset);
          if (!canPlace(row.modules, targetPos, def.widthMm, rail.usableWidthMm)) {
            const occupied = row.modules.map((m) => {
              const md = getModuleById(m.moduleId);
              return { start: m.positionMm, end: m.positionMm + (md?.widthMm ?? 0) };
            });
            targetPos = findFirstFit(occupied, def.widthMm, rail.usableWidthMm);
          }
          if (targetPos >= 0 && canPlace(row.modules, targetPos, def.widthMm, rail.usableWidthMm)) {
            pasteData.modules.push({ ...mod, positionMm: targetPos });
          }
        }

        const newIds = state.pasteElements(pasteData);
        onSetSelection(newIds);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedModules, state, layout, fitToContainer, onSelectModule, onSetSelection, clampZoom, onUndo, onRedo]);

  // --- Right-click pan: stop on global mouseup and suppress context menu ---
  useEffect(() => {
    const stopPan = () => { isPanningRef.current = false; };
    window.addEventListener('mouseup', stopPan);
    return () => window.removeEventListener('mouseup', stopPan);
  }, []);

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
      const newZoom = clampZoom(oldZoom - e.deltaY * 0.008);
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
    <div className="panel-view-wrapper">
      <div
        ref={containerRef}
        className="panel-view-container"
        onClick={handleClearSelection}
      >
        <div className="panel-view-inner">
      <svg
        ref={svgRef}
        width={vb.w * zoom}
        height={vb.h * zoom}
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', flexShrink: 0, cursor: measureActive ? 'crosshair' : undefined }}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onContextMenu={(e) => e.preventDefault()}
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
          {/* DIN rail top lip shadow (downward fade) */}
          <linearGradient id="rail-top-shadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          {/* DIN rail bottom lip glare (upward shine) */}
          <linearGradient id="rail-bottom-glare" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          {/* Enclosure top border shadow (downward fade) */}
          <linearGradient id="enclosure-top-shadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Workspace background with dot grid */}
        <rect
          x={vb.x}
          y={vb.y}
          width={vb.w}
          height={vb.h}
          fill="url(#grid-dots)"
        />

        {/* Panel dimensions (top-left, same layout as din rail labels) */}
        <g className="panel-dimension-labels">
          <text
            className="rail-length-label"
            x={-mmToPx(7)}
            y={mmToPx(6.5)}
            textAnchor="start"
            dominantBaseline="hanging"
            fill="#607d8b"
            fontSize={2.2}
            transform={`rotate(-90, ${-mmToPx(3.5)}, ${mmToPx(8)})`}
          >
            {layout.exteriorHeightMm}mm
          </text>
          <text
            className="rail-length-label"
            x={mmToPx(3.5)}
            y={-mmToPx(3.5)}
            textAnchor="start"
            dominantBaseline="auto"
            fill="#607d8b"
            fontSize={2.2}
          >
            {layout.exteriorWidthMm}mm
          </text>
        </g>

        {/* Exterior shell */}
        <rect
          x={0}
          y={0}
          width={svgWidth}
          height={svgHeight}
          rx={2}
          fill="#fafafa"
          stroke="#999"
          strokeWidth={2}
        />

        {/* Top border outer shadow */}
        <rect
          x={0}
          y={0}
          width={svgWidth}
          height={mmToPx(12)}
          fill="url(#enclosure-top-shadow)"
          style={{ pointerEvents: 'none' }}
        />

        {/* Mounting holes */}
        {layout.mountingHoles.map((hole, i) => (
          <circle
            key={i}
            cx={intX + mmToPx(hole.xMm)}
            cy={intY + mmToPx(hole.yMm)}
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
              hideDropHighlight={hideRailDropHighlight}
              onPortClick={onPortClick}
              onPortMouseDown={onPortMouseDown}
              onPortMouseUp={onPortMouseUp}
              onPortHover={onPortHover}
              onPortLeave={onPortLeave}
              simStates={simActive ? simStates : undefined}
              onSimModeChange={simActive ? onSimModeChange : undefined}
            />
          );
        })}

        {/* Panel edge snap preview (when dragging entradas/saídas) */}
        {panelEdgePreview && (() => {
          const pos = getEdgePreviewPosition(panelEdgePreview.edge, panelEdgePreview.positionPercent, svgWidth, svgHeight);
          return (
            <rect
              key="edge-preview"
              x={pos.x}
              y={pos.y}
              width={pos.w}
              height={pos.h}
              fill="#42a5f5"
              opacity={0.45}
              rx={2}
              stroke="#1565c0"
              strokeWidth={0.8}
              style={{ pointerEvents: 'none' }}
            />
          );
        })()}

        {/* Panel I/O */}
        <PanelIOLayer
          svgWidth={svgWidth}
          svgHeight={svgHeight}
          selectedIOId={state.selectedIOId}
          onSelectIO={(id) => state.selectIO(id)}
          onPortClick={onPortClick}
          onPortMouseDown={onPortMouseDown}
          onPortMouseUp={onPortMouseUp}
          onPortHover={onPortHover}
          onPortLeave={onPortLeave}
          onIODragChange={setIsDraggingIO}
          wireAlignTargets={ioWireTargets}
        />

        {/* External Devices */}
        <ExternalDeviceLayer
          selectedDeviceIds={selectedModules}
          onSelectDevice={onSelectModule}
          onPortClick={onPortClick}
          onPortMouseDown={onPortMouseDown}
          onPortMouseUp={onPortMouseUp}
          onPortHover={onPortHover}
          onPortLeave={onPortLeave}
          simStates={simActive ? simStates : undefined}
          onSimModeChange={simActive ? onSimModeChange : undefined}
          onDragChange={setIsDraggingDevice}
        />

        {/* Wires — rendered on top so they stay clickable when passing through switches/buttons */}
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
          onSegmentDragChange={setIsDraggingSegment}
          onWaypointHoverChange={setHoveringWaypoint}
          onWaypointDragChange={setIsDraggingWaypoint}
          dragGhost={ghostPreview?.instanceId ? ghostPreview : undefined}
          wiringMousePos={wiringMousePos}
          altHeld={altHeld}
        />

        {/* Text Annotations — on top of everything */}
        <TextAnnotationLayer
          annotations={state.textAnnotations}
          selectedAnnotationId={selectedAnnotationId ?? null}
          svgRef={svgRef}
          onSelect={(id) => onSelectAnnotation?.(id)}
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

        {/* Measuring tool overlay */}
        {measureActive && (
          <g style={{ pointerEvents: 'none' }}>
            {/* Completed measurement lines */}
            {measureLines.map((ln, i) => {
              const dist = Math.sqrt((ln.bx - ln.ax) ** 2 + (ln.by - ln.ay) ** 2);
              const mx = (ln.ax + ln.bx) / 2;
              const my = (ln.ay + ln.by) / 2;
              const crossSize = 2;
              return (
                <g key={`measure-${i}`}>
                  <line x1={ln.ax} y1={ln.ay} x2={ln.bx} y2={ln.by} stroke="#ff5722" strokeWidth={0.4} />
                  {/* Cross at A */}
                  <line x1={ln.ax - crossSize} y1={ln.ay} x2={ln.ax + crossSize} y2={ln.ay} stroke="#ff5722" strokeWidth={0.3} />
                  <line x1={ln.ax} y1={ln.ay - crossSize} x2={ln.ax} y2={ln.ay + crossSize} stroke="#ff5722" strokeWidth={0.3} />
                  {/* Cross at B */}
                  <line x1={ln.bx - crossSize} y1={ln.by} x2={ln.bx + crossSize} y2={ln.by} stroke="#ff5722" strokeWidth={0.3} />
                  <line x1={ln.bx} y1={ln.by - crossSize} x2={ln.bx} y2={ln.by + crossSize} stroke="#ff5722" strokeWidth={0.3} />
                  {/* Label */}
                  <text x={mx} y={my - 1.5} textAnchor="middle" dominantBaseline="auto" fill="#ff5722" fontSize={3} fontWeight="bold">
                    {dist < 1 ? `${(dist).toFixed(1)}mm` : `${Math.round(dist)}mm`}
                  </text>
                </g>
              );
            })}
            {/* Preview line from pending point to mouse */}
            {measurePending && measureMouse && (
              <g>
                <line x1={measurePending.x} y1={measurePending.y} x2={measureMouse.x} y2={measureMouse.y} stroke="#ff5722" strokeWidth={0.4} opacity={0.6} />
                {(() => {
                  const dist = Math.sqrt((measureMouse.x - measurePending.x) ** 2 + (measureMouse.y - measurePending.y) ** 2);
                  const mx = (measurePending.x + measureMouse.x) / 2;
                  const my = (measurePending.y + measureMouse.y) / 2;
                  return dist > 0.5 ? (
                    <text x={mx} y={my - 1.5} textAnchor="middle" dominantBaseline="auto" fill="#ff5722" fontSize={3} fontWeight="bold" opacity={0.6}>
                      {dist < 1 ? `${(dist).toFixed(1)}mm` : `${Math.round(dist)}mm`}
                    </text>
                  ) : null;
                })()}
                {/* Cross at pending point */}
                <line x1={measurePending.x - 2} y1={measurePending.y} x2={measurePending.x + 2} y2={measurePending.y} stroke="#ff5722" strokeWidth={0.3} />
                <line x1={measurePending.x} y1={measurePending.y - 2} x2={measurePending.x} y2={measurePending.y + 2} stroke="#ff5722" strokeWidth={0.3} />
                {/* Cross at mouse */}
                <line x1={measureMouse.x - 2} y1={measureMouse.y} x2={measureMouse.x + 2} y2={measureMouse.y} stroke="#ff5722" strokeWidth={0.3} opacity={0.5} />
                <line x1={measureMouse.x} y1={measureMouse.y - 2} x2={measureMouse.x} y2={measureMouse.y + 2} stroke="#ff5722" strokeWidth={0.3} opacity={0.5} />
              </g>
            )}
            {/* Crosshair cursor at mouse when no pending point */}
            {!measurePending && measureMouse && (
              <g>
                <line x1={measureMouse.x - 2} y1={measureMouse.y} x2={measureMouse.x + 2} y2={measureMouse.y} stroke="#ff5722" strokeWidth={0.3} opacity={0.5} />
                <line x1={measureMouse.x} y1={measureMouse.y - 2} x2={measureMouse.x} y2={measureMouse.y + 2} stroke="#ff5722" strokeWidth={0.3} opacity={0.5} />
              </g>
            )}
          </g>
        )}
      </svg>
      </div>
      </div>
      <div className="panel-view-hud">
        <div className="history-controls">
          <button
            onClick={onUndo}
            title="Desfazer (Ctrl+Z)"
            disabled={!canUndo}
            aria-label="Desfazer"
          >
            ↶
          </button>
          <button
            onClick={onRedo}
            title="Refazer (Ctrl+Y)"
            disabled={!canRedo}
            aria-label="Refazer"
          >
            ↷
          </button>
          <button
            onClick={() => {
              if (measureActive) {
                setMeasureActive(false);
                setMeasureLines([]);
                setMeasurePending(null);
                setMeasureMouse(null);
              } else {
                setMeasureActive(true);
              }
            }}
            title="Medir (régua)"
            aria-label="Medir"
            className={measureActive ? 'measure-btn active' : 'measure-btn'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="5" width="14" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <line x1="4" y1="5" x2="4" y2="8" stroke="currentColor" strokeWidth="0.8" />
              <line x1="6.5" y1="5" x2="6.5" y2="7" stroke="currentColor" strokeWidth="0.8" />
              <line x1="9" y1="5" x2="9" y2="8" stroke="currentColor" strokeWidth="0.8" />
              <line x1="11.5" y1="5" x2="11.5" y2="7" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          </button>
        </div>
        {measureActive && (
          <div className="drag-hint measure-hint">
            Clique para marcar pontos de medição
            {' · '}
            <kbd>Shift</kbd> permite ângulo livre
            {measureLines.length > 0 && (
              <>
                {' · '}
                <span style={{ opacity: 0.7 }}>{measureLines.length} medição{measureLines.length > 1 ? 'ões' : ''}</span>
              </>
            )}
          </div>
        )}
        {state.wiringFrom && (
          <div className="drag-hint wiring-hint">
            <kbd>Alt</kbd>+clique para criar ponto intermediário
            {' · '}
            <kbd>Shift</kbd> desativa snap
            {state.wiringWaypoints.length > 0 && (
              <>
                {' · '}
                <span style={{ opacity: 0.7 }}>{state.wiringWaypoints.length} ponto{state.wiringWaypoints.length > 1 ? 's' : ''}</span>
              </>
            )}
          </div>
        )}
        {(isDraggingSegment || isDraggingIO || isDraggingWaypoint) && (
          <div className="drag-hint">
            Segure <kbd>Shift</kbd> para desativar snap
          </div>
        )}
        {state.selectedWireId && !isDraggingSegment && !isDraggingWaypoint && (() => {
          const selWire = state.wires.find((w) => w.id === state.selectedWireId);
          const hasWaypoints = selWire && selWire.waypoints && selWire.waypoints.length > 0;
          const message = hasWaypoints
            ? (hoveringWaypoint ? 'Clique direito em um ponto para removê-lo' : null)
            : 'Clique novamente no fio para editar pontos';
          if (!message) return null;
          return (
            <div className="drag-hint wire-hint">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M4 1v10l2.5-2.5L9 14h1.5l-2.5-5.5L11 6H4V1z" fill="currentColor" opacity="0.85" />
                <rect x="9" y="1" width="5" height="7" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
                <rect x="11.5" y="1" width="2.5" height="3.5" rx="0.6" fill="currentColor" opacity="0.7" />
              </svg>
              {message}
            </div>
          );
        })()}
        <div className="zoom-controls">
          <button onClick={() => setZoom((z) => clampZoom(z - 0.2))}>-</button>
          <input
            ref={zoomInputRef}
            type="text"
            className="zoom-input"
            value={zoomInputActive ? zoomInput : Math.round(zoom * 100)}
            onChange={(e) => zoomInputActive && setZoomInput(e.target.value)}
            onFocus={handleZoomInputFocus}
            onBlur={handleZoomInputBlur}
            onKeyDown={handleZoomInputKeyDown}
            aria-label="Zoom percentual"
          />
          <span className="zoom-percent-suffix">%</span>
          <button onClick={() => setZoom((z) => clampZoom(z + 0.2))}>+</button>
          <button onClick={fitToWidth} title="Encaiar na largura (quadro cabe horizontalmente)" className="zoom-btn-fit">
            <FitToWidthIcon size="1.1em" />
          </button>
          <button onClick={fitToContainer} title="Ajustar ao container" className="zoom-btn-fit">
            <FitToContainerIcon size="1.1em" />
          </button>
        </div>
      </div>
    </div>
  );
};
