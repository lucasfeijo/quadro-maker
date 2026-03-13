import React, { useCallback, useRef, useState } from 'react';
import { PlacedModule, ResolvedRail } from '../types';
import { getModuleById } from '../data/modules';
import { cmToPx } from '../utils/geometry';
import { usePanelStore } from '../store/panelStore';
import { getIOPortPosition } from '../utils/panelIO';
import { getExternalDevicePortPosition } from './ExternalDeviceLayer';

const MODULE_HEIGHT_CM = 7;
const WIRE_COLORS: Record<string, string> = {
  phase: '#333',
  neutral: '#2196f3',
  ground: '#4caf50',
  any: '#ff9800',
};

const OBSTACLE_MARGIN = 3;
const CHANNEL_SPACING = 1.5;
const BRIDGE_RADIUS = 2;
const MIN_STRAIGHT_BEFORE_BRIDGE = 12;
const MIN_STRAIGHT_FROM_PORT = 10;
const PORT_EXTEND = MIN_STRAIGHT_FROM_PORT;
const VERTEX_RADIUS = 2;
const HIT_WIDTH = 4;
const PORT_OBSTACLE_R = 2;

// --- Types ---

interface PortPosition {
  x: number;
  y: number;
  type: string;
  side?: 'top' | 'bottom';
}

interface ObstacleRect {
  instanceId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

type Point = { x: number; y: number };
type VerticalSegment = { x: number; yMin: number; yMax: number };

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface CrossingOnSegment {
  point: Point;
  t: number;
}

interface Props {
  rails: ResolvedRail[];
  interiorOffsetXPx: number;
  interiorOffsetYPx: number;
  panelWidth: number;
  panelHeight: number;
  svgWidth: number;
  svgHeight: number;
  padding: number;
  selectedWireId: string | null;
  onSelectWire: (wireId: string) => void;
  hoverTarget?: { instanceId: string; portId: string } | null;
  energizedWires?: Set<string>;
}

// --- Module/port helpers ---

function findModuleAndRow(
  rows: { id: string; modules: PlacedModule[] }[],
  instanceId: string,
): { mod: PlacedModule; rowIndex: number } | null {
  for (let i = 0; i < rows.length; i++) {
    const mod = rows[i].modules.find((m) => m.instanceId === instanceId);
    if (mod) return { mod, rowIndex: i };
  }
  return null;
}

function getPortAbsolutePosition(
  mod: PlacedModule,
  portId: string,
  rowIndex: number,
  rails: ResolvedRail[],
  interiorOffsetXPx: number,
  interiorOffsetYPx: number,
): PortPosition | null {
  const def = getModuleById(mod.moduleId);
  if (!def) return null;
  const port = def.ports.find((p) => p.id === portId);
  if (!port) return null;

  const rail = rails[rowIndex];
  if (!rail) return null;

  const railLeftPx = interiorOffsetXPx + cmToPx(rail.xCm);
  const fixingPx = cmToPx(rail.fixingMarginCm);
  const usableOffsetXPx = railLeftPx + fixingPx;
  const railTopPx = interiorOffsetYPx + cmToPx(rail.yCm);
  const railHeightPx = cmToPx(1);
  const railCenterY = railTopPx + railHeightPx / 2;

  const moduleX = usableOffsetXPx + cmToPx(mod.positionCm);
  const moduleY = railCenterY - cmToPx(MODULE_HEIGHT_CM / 2);
  const moduleH = cmToPx(MODULE_HEIGHT_CM);

  const x = moduleX + cmToPx(port.offsetXCm);
  const y = port.side === 'top' ? moduleY - 2 : moduleY + moduleH + 2;

  return { x, y, type: port.type, side: port.side };
}

// --- Obstacle collection ---

function getModuleBounds(
  rows: { id: string; modules: PlacedModule[] }[],
  rails: ResolvedRail[],
  interiorOffsetXPx: number,
  interiorOffsetYPx: number,
): ObstacleRect[] {
  const rects: ObstacleRect[] = [];
  for (let i = 0; i < rows.length; i++) {
    const rail = rails[i];
    if (!rail) continue;
    const railLeftPx = interiorOffsetXPx + cmToPx(rail.xCm);
    const fixingPx = cmToPx(rail.fixingMarginCm);
    const usableOffsetXPx = railLeftPx + fixingPx;
    const railTopPx = interiorOffsetYPx + cmToPx(rail.yCm);
    const railHeightPx = cmToPx(1);
    const railCenterY = railTopPx + railHeightPx / 2;

    for (const mod of rows[i].modules) {
      const def = getModuleById(mod.moduleId);
      if (!def) continue;
      rects.push({
        instanceId: mod.instanceId,
        x: usableOffsetXPx + cmToPx(mod.positionCm),
        y: railCenterY - cmToPx(MODULE_HEIGHT_CM / 2),
        w: cmToPx(def.widthCm),
        h: cmToPx(MODULE_HEIGHT_CM),
      });
    }
  }
  return rects;
}

function getPortObstacles(
  rows: { id: string; modules: PlacedModule[] }[],
  rails: ResolvedRail[],
  interiorOffsetXPx: number,
  interiorOffsetYPx: number,
): ObstacleRect[] {
  const rects: ObstacleRect[] = [];
  for (let i = 0; i < rows.length; i++) {
    const rail = rails[i];
    if (!rail) continue;
    const railLeftPx = interiorOffsetXPx + cmToPx(rail.xCm);
    const fixingPx = cmToPx(rail.fixingMarginCm);
    const usableOffsetXPx = railLeftPx + fixingPx;
    const railTopPx = interiorOffsetYPx + cmToPx(rail.yCm);
    const railHeightPx = cmToPx(1);
    const railCenterY = railTopPx + railHeightPx / 2;

    for (const mod of rows[i].modules) {
      const def = getModuleById(mod.moduleId);
      if (!def) continue;
      const moduleX = usableOffsetXPx + cmToPx(mod.positionCm);
      const moduleY = railCenterY - cmToPx(MODULE_HEIGHT_CM / 2);
      const moduleH = cmToPx(MODULE_HEIGHT_CM);

      for (const port of def.ports) {
        const px = moduleX + cmToPx(port.offsetXCm);
        const py = port.side === 'top' ? moduleY - 2 : moduleY + moduleH + 2;
        rects.push({
          instanceId: `${mod.instanceId}:${port.id}`,
          x: px - PORT_OBSTACLE_R,
          y: py - PORT_OBSTACLE_R,
          w: PORT_OBSTACLE_R * 2,
          h: PORT_OBSTACLE_R * 2,
        });
      }
    }
  }
  return rects;
}

// --- Segment clearance checks ---

function horizontalSegmentClear(
  y: number, x1: number, x2: number,
  obstacles: ObstacleRect[], margin: number,
): boolean {
  const xMin = Math.min(x1, x2);
  const xMax = Math.max(x1, x2);
  for (const r of obstacles) {
    if (y >= r.y - margin && y <= r.y + r.h + margin &&
        xMax > r.x - margin && xMin < r.x + r.w + margin) {
      return false;
    }
  }
  return true;
}

function verticalSegmentClear(
  x: number, y1: number, y2: number,
  obstacles: ObstacleRect[], margin: number,
): boolean {
  const yMin = Math.min(y1, y2);
  const yMax = Math.max(y1, y2);
  for (const r of obstacles) {
    if (x >= r.x - margin && x <= r.x + r.w + margin &&
        yMax > r.y - margin && yMin < r.y + r.h + margin) {
      return false;
    }
  }
  return true;
}

// --- Channel finding ---

function findClearChannel(
  srcX: number, tgtX: number, idealMidY: number,
  obstacles: ObstacleRect[], usedChannels: Map<number, number>,
): number {
  const applyOffset = (y: number): number => {
    const key = Math.round(y);
    const count = usedChannels.get(key) ?? 0;
    usedChannels.set(key, count + 1);
    return y + count * CHANNEL_SPACING;
  };

  if (horizontalSegmentClear(idealMidY, srcX, tgtX, obstacles, OBSTACLE_MARGIN)) {
    return applyOffset(idealMidY);
  }

  const xMin = Math.min(srcX, tgtX);
  const xMax = Math.max(srcX, tgtX);
  const blocking = obstacles.filter(r =>
    xMax > r.x - OBSTACLE_MARGIN && xMin < r.x + r.w + OBSTACLE_MARGIN,
  );

  if (blocking.length === 0) return applyOffset(idealMidY);

  const topY = Math.min(...blocking.map(r => r.y)) - OBSTACLE_MARGIN;
  const botY = Math.max(...blocking.map(r => r.y + r.h)) + OBSTACLE_MARGIN;
  const candidates = [topY, botY].sort((a, b) =>
    Math.abs(a - idealMidY) - Math.abs(b - idealMidY),
  );

  for (const y of candidates) {
    if (horizontalSegmentClear(y, srcX, tgtX, obstacles, OBSTACLE_MARGIN)) {
      return applyOffset(y);
    }
  }

  for (let delta = 1; delta <= 50; delta++) {
    for (const y of [idealMidY - delta * 2, idealMidY + delta * 2]) {
      if (horizontalSegmentClear(y, srcX, tgtX, obstacles, OBSTACLE_MARGIN)) {
        return applyOffset(y);
      }
    }
  }

  return applyOffset(idealMidY);
}

function overlapsVertically(
  x1: number, yMin1: number, yMax1: number,
  x2: number, yMin2: number, yMax2: number,
  xTol: number,
): boolean {
  if (Math.abs(x1 - x2) >= xTol) return false;
  return yMax1 > yMin2 && yMin1 < yMax2;
}

function findClearVerticalChannel(
  idealX: number, y1: number, y2: number,
  obstacles: ObstacleRect[],
  placedVerticalSegments: Array<{ x: number; yMin: number; yMax: number }>,
): number {
  const yMin = Math.min(y1, y2);
  const yMax = Math.max(y1, y2);
  const xTol = CHANNEL_SPACING + 0.5;

  const tryX = (x: number): boolean => {
    if (!verticalSegmentClear(x, y1, y2, obstacles, OBSTACLE_MARGIN)) return false;
    const overlaps = placedVerticalSegments.some(s =>
      overlapsVertically(x, yMin, yMax, s.x, s.yMin, s.yMax, xTol),
    );
    return !overlaps;
  };

  const useAndRecord = (x: number): number => {
    placedVerticalSegments.push({ x, yMin, yMax });
    return x;
  };

  if (tryX(idealX)) return useAndRecord(idealX);

  const blocking = obstacles.filter(r =>
    yMax > r.y - OBSTACLE_MARGIN && yMin < r.y + r.h + OBSTACLE_MARGIN,
  );

  if (blocking.length > 0) {
    const leftX = Math.min(...blocking.map(r => r.x)) - OBSTACLE_MARGIN;
    const rightX = Math.max(...blocking.map(r => r.x + r.w)) + OBSTACLE_MARGIN;
    const candidates = [leftX, rightX].sort((a, b) =>
      Math.abs(a - idealX) - Math.abs(b - idealX),
    );
    for (const x of candidates) {
      if (tryX(x)) return useAndRecord(x);
    }
  }

  for (let delta = 1; delta <= 50; delta++) {
    for (const x of [idealX - delta * CHANNEL_SPACING, idealX + delta * CHANNEL_SPACING]) {
      if (tryX(x)) return useAndRecord(x);
    }
  }

  return useAndRecord(idealX);
}

// --- Smart Manhattan routing ---

function buildSmartRoute(
  src: PortPosition, tgt: PortPosition,
  obstacles: ObstacleRect[],
  usedChannels: Map<number, number>,
  verticalSegments: VerticalSegment[],
): Point[] {
  const srcExtend = src.side === 'top' ? -PORT_EXTEND
    : src.side === 'bottom' ? PORT_EXTEND
    : (src.y < tgt.y ? PORT_EXTEND : -PORT_EXTEND);
  const tgtExtend = tgt.side === 'top' ? -PORT_EXTEND
    : tgt.side === 'bottom' ? PORT_EXTEND
    : (tgt.y > src.y ? -PORT_EXTEND : PORT_EXTEND);

  const srcExtY = src.y + srcExtend;
  const tgtExtY = tgt.y + tgtExtend;

  const idealMidY = (srcExtY + tgtExtY) / 2;
  const midY = findClearChannel(src.x, tgt.x, idealMidY, obstacles, usedChannels);

  const srcVertX = findClearVerticalChannel(src.x, srcExtY, midY, obstacles, verticalSegments);
  const tgtVertX = findClearVerticalChannel(tgt.x, midY, tgtExtY, obstacles, verticalSegments);

  const raw: Point[] = [
    { x: src.x, y: src.y },
    { x: src.x, y: srcExtY },
    { x: srcVertX, y: srcExtY },
    { x: srcVertX, y: midY },
    { x: tgtVertX, y: midY },
    { x: tgtVertX, y: tgtExtY },
    { x: tgt.x, y: tgtExtY },
    { x: tgt.x, y: tgt.y },
  ];

  return raw.filter((p, i) =>
    i === 0 || Math.abs(p.x - raw[i - 1].x) > 0.01 || Math.abs(p.y - raw[i - 1].y) > 0.01,
  );
}

// --- Simple Manhattan (for wiring preview) ---

function buildPreviewPath(src: PortPosition, tgt: PortPosition): string {
  const extSrc = src.side === 'top' ? -PORT_EXTEND
    : src.side === 'bottom' ? PORT_EXTEND
    : (src.y < tgt.y ? PORT_EXTEND : -PORT_EXTEND);
  const extTgt = tgt.side === 'top' ? -PORT_EXTEND
    : tgt.side === 'bottom' ? PORT_EXTEND
    : (tgt.y > src.y ? -PORT_EXTEND : PORT_EXTEND);
  const midY = (src.y + extSrc + tgt.y + extTgt) / 2;
  return [
    `M ${src.x} ${src.y}`,
    `L ${src.x} ${src.y + extSrc}`,
    `L ${src.x} ${midY}`,
    `L ${tgt.x} ${midY}`,
    `L ${tgt.x} ${tgt.y + extTgt}`,
    `L ${tgt.x} ${tgt.y}`,
  ].join(' ');
}

// --- Path conversion helpers ---

function pointsToSegments(points: Point[]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segs.push({
      x1: points[i].x, y1: points[i].y,
      x2: points[i + 1].x, y2: points[i + 1].y,
    });
  }
  return segs;
}

function pointsToPathString(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

// --- Crossing detection ---

function segmentIntersection(s1: Segment, s2: Segment): Point | null {
  const dx1 = s1.x2 - s1.x1, dy1 = s1.y2 - s1.y1;
  const dx2 = s2.x2 - s2.x1, dy2 = s2.y2 - s2.y1;

  const det = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(det) < 0.001) return null;

  const dx3 = s2.x1 - s1.x1, dy3 = s2.y1 - s1.y1;
  const t = (dx3 * dy2 - dy3 * dx2) / det;
  const u = (dx3 * dy1 - dy3 * dx1) / det;

  const eps = 0.01;
  if (t <= eps || t >= 1 - eps || u <= eps || u >= 1 - eps) return null;

  return { x: s1.x1 + t * dx1, y: s1.y1 + t * dy1 };
}

function findCrossingsForWire(
  wireSegments: Segment[],
  laterWireSegments: Segment[][],
): Map<number, CrossingOnSegment[]> {
  const result = new Map<number, CrossingOnSegment[]>();

  for (let segIdx = 0; segIdx < wireSegments.length; segIdx++) {
    const seg = wireSegments[segIdx];
    const segLen = Math.sqrt((seg.x2 - seg.x1) ** 2 + (seg.y2 - seg.y1) ** 2);
    if (segLen < 0.01) continue;

    const crossings: CrossingOnSegment[] = [];

    for (const otherSegs of laterWireSegments) {
      for (const otherSeg of otherSegs) {
        const pt = segmentIntersection(seg, otherSeg);
        if (pt) {
          const dist = Math.sqrt((pt.x - seg.x1) ** 2 + (pt.y - seg.y1) ** 2);
          crossings.push({ point: pt, t: dist / segLen });
        }
      }
    }

    if (crossings.length > 0) {
      crossings.sort((a, b) => a.t - b.t);
      result.set(segIdx, crossings);
    }
  }

  return result;
}

// --- Bridge rendering ---
// Sempre desenha o arco em cruzamentos. Quando o cruzamento está perto de curva/extremo,
// insere L extra no path para criar espaço reto antes do arco (não pula o arco).

function buildPathWithBridges(
  points: Point[],
  crossingsPerSegment: Map<number, CrossingOnSegment[]>,
): string {
  if (crossingsPerSegment.size === 0) {
    return pointsToPathString(points);
  }

  const needed = MIN_STRAIGHT_BEFORE_BRIDGE + BRIDGE_RADIUS;
  const parts: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const crossings = crossingsPerSegment.get(i);

    if (!crossings || crossings.length === 0) {
      parts.push(`L ${p2.x} ${p2.y}`);
      continue;
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) {
      parts.push(`L ${p2.x} ${p2.y}`);
      continue;
    }
    const ux = dx / len;
    const uy = dy / len;
    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    const sweep = isHorizontal ? (dx >= 0 ? 0 : 1) : (dy >= 0 ? 1 : 0);

    for (const crossing of crossings) {
      const cx = crossing.point.x;
      const cy = crossing.point.y;
      const distFromStart = crossing.t * len;
      const distFromEnd = len - distFromStart;
      const straightBefore = distFromStart - BRIDGE_RADIUS;
      const straightAfter = distFromEnd - BRIDGE_RADIUS;

      if (straightBefore < MIN_STRAIGHT_BEFORE_BRIDGE && distFromStart > needed) {
        const pInsertX = cx - ux * needed;
        const pInsertY = cy - uy * needed;
        parts.push(`L ${pInsertX} ${pInsertY}`);
      }

      const beforeX = cx - ux * BRIDGE_RADIUS;
      const beforeY = cy - uy * BRIDGE_RADIUS;
      const afterX = cx + ux * BRIDGE_RADIUS;
      const afterY = cy + uy * BRIDGE_RADIUS;

      parts.push(`L ${beforeX} ${beforeY}`);
      parts.push(`A ${BRIDGE_RADIUS} ${BRIDGE_RADIUS} 0 0 ${sweep} ${afterX} ${afterY}`);

      if (straightAfter < MIN_STRAIGHT_BEFORE_BRIDGE && distFromEnd > needed) {
        const pInsertX = cx + ux * needed;
        const pInsertY = cy + uy * needed;
        parts.push(`L ${pInsertX} ${pInsertY}`);
      }
    }

    parts.push(`L ${p2.x} ${p2.y}`);
  }

  return parts.join(' ');
}

// --- Component ---

export const WireLayer: React.FC<Props> = ({
  rails,
  interiorOffsetXPx,
  interiorOffsetYPx,
  panelWidth,
  panelHeight,
  svgWidth,
  svgHeight,
  padding,
  selectedWireId,
  onSelectWire,
  hoverTarget,
  energizedWires,
}) => {
  const rows = usePanelStore((s) => s.rows);
  const wires = usePanelStore((s) => s.wires);
  const panelIOs = usePanelStore((s) => s.panelIOs);
  const externalDevices = usePanelStore((s) => s.externalDevices);
  const wiringFrom = usePanelStore((s) => s.wiringFrom);
  const addWireWaypoint = usePanelStore((s) => s.addWireWaypoint);
  const moveWireWaypoint = usePanelStore((s) => s.moveWireWaypoint);
  const removeWireWaypoint = usePanelStore((s) => s.removeWireWaypoint);

  const [draggingWp, setDraggingWp] = useState<{ wireId: string; wpIndex: number } | null>(null);
  const dragRef = useRef<boolean>(false);

  const getPos = (instanceId: string, portId: string): PortPosition | null => {
    if (instanceId.startsWith('panel-io:')) {
      const ioId = instanceId.replace('panel-io:', '');
      const io = panelIOs.find((i) => i.id === ioId);
      if (!io) return null;
      const pos = getIOPortPosition(io, panelWidth, panelHeight);
      const edgeSide: 'top' | 'bottom' | undefined =
        io.edge === 'top' ? 'top' : io.edge === 'bottom' ? 'bottom' : undefined;
      return { ...pos, side: edgeSide };
    }
    const extDev = externalDevices.find((d) => d.instanceId === instanceId);
    if (extDev) {
      const pos = getExternalDevicePortPosition(extDev, portId);
      if (pos) {
        const def = getModuleById(extDev.moduleId);
        const port = def?.ports.find((p) => p.id === portId);
        return { x: pos.x, y: pos.y, type: port?.type ?? 'any', side: port?.side };
      }
    }
    const mr = findModuleAndRow(rows, instanceId);
    if (!mr) return null;
    return getPortAbsolutePosition(mr.mod, portId, mr.rowIndex, rails, interiorOffsetXPx, interiorOffsetYPx);
  };

  const getSvgPoint = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const svg = (e.target as SVGElement).ownerSVGElement;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM()?.inverse();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm);
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const handleWpMouseDown = useCallback((e: React.MouseEvent, wireId: string, wpIndex: number) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingWp({ wireId, wpIndex });
    dragRef.current = false;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingWp) return;
    dragRef.current = true;
    const pt = getSvgPoint(e);
    moveWireWaypoint(draggingWp.wireId, draggingWp.wpIndex, pt.x, pt.y);
  }, [draggingWp, getSvgPoint, moveWireWaypoint]);

  const handleMouseUp = useCallback(() => {
    setDraggingWp(null);
  }, []);

  const handleWpRightClick = useCallback((e: React.MouseEvent, wireId: string, wpIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    removeWireWaypoint(wireId, wpIndex);
  }, [removeWireWaypoint]);

  const handleSegmentDoubleClick = useCallback((e: React.MouseEvent, wireId: string, segmentIndex: number) => {
    e.stopPropagation();
    const pt = getSvgPoint(e);
    addWireWaypoint(wireId, segmentIndex, pt.x, pt.y);
  }, [getSvgPoint, addWireWaypoint]);

  // ---- Collect all obstacles once ----

  const allModuleBounds = getModuleBounds(rows, rails, interiorOffsetXPx, interiorOffsetYPx);
  const allPortObstacles = getPortObstacles(rows, rails, interiorOffsetXPx, interiorOffsetYPx);

  // ---- Smart route computation ----

  const usedChannels = new Map<number, number>();
  const verticalSegments: VerticalSegment[] = [];

  const computedWires: Array<{
    wire: typeof wires[0];
    src: PortPosition;
    tgt: PortPosition;
    points: Point[];
    hasWaypoints: boolean;
  }> = [];

  for (const wire of wires) {
    const src = getPos(wire.sourceInstanceId, wire.sourcePortId);
    const tgt = getPos(wire.targetInstanceId, wire.targetPortId);
    if (!src || !tgt) continue;

    const waypoints = wire.waypoints ?? [];
    const hasWaypoints = waypoints.length > 0;

    let points: Point[];
    if (hasWaypoints) {
      points = [{ x: src.x, y: src.y }, ...waypoints, { x: tgt.x, y: tgt.y }];
    } else {
      const wireEndpoints = new Set([
        `${wire.sourceInstanceId}:${wire.sourcePortId}`,
        `${wire.targetInstanceId}:${wire.targetPortId}`,
      ]);
      const obstacles = [
        ...allModuleBounds.filter(r =>
          r.instanceId !== wire.sourceInstanceId && r.instanceId !== wire.targetInstanceId,
        ),
        ...allPortObstacles.filter(r => !wireEndpoints.has(r.instanceId)),
      ];
      points = buildSmartRoute(src, tgt, obstacles, usedChannels, verticalSegments);
    }

    computedWires.push({ wire, src, tgt, points, hasWaypoints });
  }

  // ---- Crossing detection ----

  const allSegments = computedWires.map(cw => pointsToSegments(cw.points));

  const allCrossings = computedWires.map((_, i) => {
    const laterSegments = allSegments.slice(i + 1);
    return findCrossingsForWire(allSegments[i], laterSegments);
  });

  // ---- Build render data ----

  const renderData = computedWires.map((cw, i) => ({
    ...cw,
    displayPath: buildPathWithBridges(cw.points, allCrossings[i]),
    hitPath: pointsToPathString(cw.points),
  }));

  return (
    <g
      className="wire-layer"
      style={{ pointerEvents: 'stroke' }}
      onMouseMove={draggingWp ? handleMouseMove : undefined}
      onMouseUp={draggingWp ? handleMouseUp : undefined}
      onMouseLeave={draggingWp ? handleMouseUp : undefined}
    >
      {draggingWp && (
        <rect
          x={-padding}
          y={-padding}
          width={svgWidth + padding * 2}
          height={svgHeight + padding * 2}
          fill="transparent"
          style={{ pointerEvents: 'all' }}
        />
      )}
      {renderData.map(({ wire, src, tgt, points, hasWaypoints, displayPath, hitPath }) => {
        const isSelected = wire.id === selectedWireId;
        const isEnergized = energizedWires?.has(wire.id);
        const baseColor = wire.wireColor ?? WIRE_COLORS[src.type] ?? '#333';
        const color = isEnergized ? '#ffab00' : baseColor;
        const isGround = src.type === 'ground' || tgt.type === 'ground';
        const waypoints = wire.waypoints ?? [];

        return (
          <g key={wire.id}>
            {hasWaypoints ? (
              points.slice(0, -1).map((p, i) => {
                const next = points[i + 1];
                const segPath = `M ${p.x} ${p.y} L ${next.x} ${next.y}`;
                return (
                  <path
                    key={`seg-hit-${i}`}
                    d={segPath}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={HIT_WIDTH}
                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                    onClick={(e) => { e.stopPropagation(); onSelectWire(wire.id); }}
                    onDoubleClick={(e) => handleSegmentDoubleClick(e, wire.id, i)}
                  />
                );
              })
            ) : (
              <path
                d={hitPath}
                fill="none"
                stroke="transparent"
                strokeWidth={HIT_WIDTH}
                style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                onClick={(e) => { e.stopPropagation(); onSelectWire(wire.id); }}
                onDoubleClick={(e) => handleSegmentDoubleClick(e, wire.id, 0)}
              />
            )}

            {isEnergized && (
              <path
                d={displayPath}
                fill="none"
                stroke="#ffab00"
                strokeWidth={2}
                opacity={0.25}
                style={{ pointerEvents: 'none' }}
              />
            )}

            <path
              d={displayPath}
              fill="none"
              stroke={isSelected ? '#ffd600' : color}
              strokeWidth={isSelected ? 0.8 : isEnergized ? 0.7 : 0.5}
              strokeDasharray={isGround ? '1.5 0.8' : 'none'}
              opacity={0.9}
              style={{ pointerEvents: 'none' }}
            />

            {isSelected && waypoints.map((wp, i) => (
              <circle
                key={`wp-${i}`}
                cx={wp.x}
                cy={wp.y}
                r={VERTEX_RADIUS}
                fill="#fff"
                stroke="#1976d2"
                strokeWidth={0.6}
                style={{ cursor: 'grab', pointerEvents: 'all' }}
                onMouseDown={(e) => handleWpMouseDown(e, wire.id, i)}
                onContextMenu={(e) => handleWpRightClick(e, wire.id, i)}
              />
            ))}

            {isSelected && !hasWaypoints && (
              <path
                d={hitPath}
                fill="none"
                stroke="transparent"
                strokeWidth={HIT_WIDTH}
                style={{ cursor: 'crosshair', pointerEvents: 'stroke' }}
                onDoubleClick={(e) => handleSegmentDoubleClick(e, wire.id, 0)}
              />
            )}
          </g>
        );
      })}

      {wiringFrom && hoverTarget && (
        (() => {
          const src = getPos(wiringFrom.instanceId, wiringFrom.portId);
          const tgt = getPos(hoverTarget.instanceId, hoverTarget.portId);
          if (!src || !tgt) return null;
          return (
            <path
              d={buildPreviewPath(src, tgt)}
              fill="none"
              stroke="#ffd600"
              strokeWidth={0.5}
              strokeDasharray="2 1"
              opacity={0.7}
              style={{ pointerEvents: 'none' }}
            />
          );
        })()
      )}
    </g>
  );
};
