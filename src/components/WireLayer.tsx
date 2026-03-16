import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PlacedModule, ResolvedRail } from '../types';
import { getModuleById } from '../data/modules';
import { cmToPx } from '../utils/geometry';
import { usePanelStore } from '../store/panelStore';
import { getIOPortPosition } from '../utils/panelIO';
import { getExternalDevicePortPosition } from './ExternalDeviceLayer';
import { getBusbarPortPosition } from './BusbarLayer';

const MODULE_HEIGHT_CM = 7;
const WIRE_COLORS: Record<string, string> = {
  phase: '#333',
  neutral: '#2196f3',
  ground: '#4caf50',
  any: '#ff9800',
};

function gaugeToStrokeWidth(gaugeMm2: number | undefined): number {
  if (!gaugeMm2) return 0.5;
  return Math.min(0.4 + Math.sqrt(gaugeMm2) * 0.15, 1.8);
}

const OBSTACLE_MARGIN = 3;
const CHANNEL_SPACING = 1.5;
const BRIDGE_RADIUS = 2;
const MIN_STRAIGHT_BEFORE_BRIDGE = 12;
const MIN_STRAIGHT_FROM_PORT = 10;
const PORT_EXTEND = MIN_STRAIGHT_FROM_PORT;
const VERTEX_RADIUS = 2;
const HIT_WIDTH = 4;
const PORT_OBSTACLE_R = 2;
const SNAP_TOLERANCE = 3;
const SEGMENT_SNAP_TOLERANCE = 1.5; // Menor que vértice: segmento tem muitos alvos, evita travar demais
const SEGMENT_DRAG_THRESHOLD = 3;

// --- Types ---

interface PortPosition {
  x: number;
  y: number;
  type: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
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
type HorizontalSegment = { y: number; xMin: number; xMax: number };

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

interface DimensionLine {
  x1: number; y1: number;
  x2: number; y2: number;
  label: string;
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
  onSegmentDragChange?: (dragging: boolean) => void;
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

function overlapsHorizontally(
  y1: number, xMin1: number, xMax1: number,
  y2: number, xMin2: number, xMax2: number,
  yTol: number,
): boolean {
  if (Math.abs(y1 - y2) >= yTol) return false;
  return xMax1 > xMin2 && xMin1 < xMax2;
}

function findClearChannel(
  srcX: number, tgtX: number, idealMidY: number,
  obstacles: ObstacleRect[],
  placedHorizontalSegments: HorizontalSegment[],
): number {
  const xMin = Math.min(srcX, tgtX);
  const xMax = Math.max(srcX, tgtX);
  const yTol = CHANNEL_SPACING + 0.5;

  const tryY = (y: number): boolean => {
    if (!horizontalSegmentClear(y, srcX, tgtX, obstacles, OBSTACLE_MARGIN)) return false;
    return !placedHorizontalSegments.some(s =>
      overlapsHorizontally(y, xMin, xMax, s.y, s.xMin, s.xMax, yTol),
    );
  };

  const useAndRecord = (y: number): number => {
    placedHorizontalSegments.push({ y, xMin, xMax });
    return y;
  };

  if (tryY(idealMidY)) return useAndRecord(idealMidY);

  const blocking = obstacles.filter(r =>
    xMax > r.x - OBSTACLE_MARGIN && xMin < r.x + r.w + OBSTACLE_MARGIN,
  );

  if (blocking.length > 0) {
    const topY = Math.min(...blocking.map(r => r.y)) - OBSTACLE_MARGIN;
    const botY = Math.max(...blocking.map(r => r.y + r.h)) + OBSTACLE_MARGIN;
    const candidates = [topY, botY].sort((a, b) =>
      Math.abs(a - idealMidY) - Math.abs(b - idealMidY),
    );
    for (const y of candidates) {
      if (tryY(y)) return useAndRecord(y);
    }
  }

  for (let delta = 1; delta <= 50; delta++) {
    for (const y of [idealMidY - delta * CHANNEL_SPACING, idealMidY + delta * CHANNEL_SPACING]) {
      if (tryY(y)) return useAndRecord(y);
    }
  }

  return useAndRecord(idealMidY);
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

// --- Extension helpers ---

function isHorizontalSide(side?: PortPosition['side']): boolean {
  return side === 'left' || side === 'right';
}

function getVerticalExtend(port: PortPosition, other: PortPosition): number {
  if (port.side === 'top') return -PORT_EXTEND;
  if (port.side === 'bottom') return PORT_EXTEND;
  return port.y < other.y ? PORT_EXTEND : -PORT_EXTEND;
}

function getHorizontalExtend(port: PortPosition, other: PortPosition): number {
  if (port.side === 'left') return -PORT_EXTEND;
  if (port.side === 'right') return PORT_EXTEND;
  return port.x < other.x ? PORT_EXTEND : -PORT_EXTEND;
}

// Resolve a horizontal-exit port to a virtual vertical-exit port after the horizontal stub
function resolveHorizontalPort(port: PortPosition, other: PortPosition): { resolved: PortPosition; stub: Point[] } {
  const hExt = getHorizontalExtend(port, other);
  const extX = port.x + hExt;
  const stub: Point[] = [
    { x: port.x, y: port.y },
    { x: extX, y: port.y },
  ];
  const resolved: PortPosition = {
    x: extX,
    y: port.y,
    type: port.type,
    side: undefined, // let routing pick vertical direction freely
  };
  return { resolved, stub };
}

// --- Smart Manhattan routing ---

function buildSmartRoute(
  src: PortPosition, tgt: PortPosition,
  obstacles: ObstacleRect[],
  horizontalSegments: HorizontalSegment[],
  verticalSegments: VerticalSegment[],
): Point[] {
  let srcStub: Point[] = [];
  let tgtStub: Point[] = [];
  let eSrc = src;
  let eTgt = tgt;

  if (isHorizontalSide(src.side)) {
    const r = resolveHorizontalPort(src, tgt);
    srcStub = r.stub;
    eSrc = r.resolved;
  }
  if (isHorizontalSide(tgt.side)) {
    const r = resolveHorizontalPort(tgt, src);
    tgtStub = r.stub;
    eTgt = r.resolved;
  }

  const srcExtend = getVerticalExtend(eSrc, eTgt);
  const tgtExtend = getVerticalExtend(eTgt, eSrc);

  const srcExtY = eSrc.y + srcExtend;
  const tgtExtY = eTgt.y + tgtExtend;

  const idealMidY = (srcExtY + tgtExtY) / 2;
  let midY = findClearChannel(eSrc.x, eTgt.x, idealMidY, obstacles, horizontalSegments);

  // Clamp so the wire never backtracks past the source extension
  if (srcExtend > 0 && midY < srcExtY) midY = srcExtY;
  if (srcExtend < 0 && midY > srcExtY) midY = srcExtY;

  const srcVertX = findClearVerticalChannel(eSrc.x, srcExtY, midY, obstacles, verticalSegments);
  const tgtVertX = findClearVerticalChannel(eTgt.x, midY, tgtExtY, obstacles, verticalSegments);

  const core: Point[] = [
    { x: eSrc.x, y: eSrc.y },
    { x: eSrc.x, y: srcExtY },
    { x: srcVertX, y: srcExtY },
    { x: srcVertX, y: midY },
    { x: tgtVertX, y: midY },
    { x: tgtVertX, y: tgtExtY },
    { x: eTgt.x, y: tgtExtY },
    { x: eTgt.x, y: eTgt.y },
  ];

  const raw: Point[] = [
    ...srcStub,
    ...core,
    ...tgtStub.slice().reverse(),
  ];

  return raw.filter((p, i) =>
    i === 0 || Math.abs(p.x - raw[i - 1].x) > 0.01 || Math.abs(p.y - raw[i - 1].y) > 0.01,
  );
}

// --- Simple Manhattan (for wiring preview) ---

function buildPreviewPath(src: PortPosition, tgt: PortPosition): string {
  const srcH = isHorizontalSide(src.side);
  const tgtH = isHorizontalSide(tgt.side);

  const srcHExt = srcH ? getHorizontalExtend(src, tgt) : 0;
  const tgtHExt = tgtH ? getHorizontalExtend(tgt, src) : 0;

  const eSrcX = src.x + srcHExt;
  const eTgtX = tgt.x + tgtHExt;

  const eSrc: PortPosition = srcH ? { x: eSrcX, y: src.y, type: src.type } : src;
  const eTgt: PortPosition = tgtH ? { x: eTgtX, y: tgt.y, type: tgt.type } : tgt;

  const extSrc = getVerticalExtend(eSrc, eTgt);
  const extTgt = getVerticalExtend(eTgt, eSrc);

  let midY = (eSrc.y + extSrc + eTgt.y + extTgt) / 2;
  const srcExtY = eSrc.y + extSrc;
  if (extSrc > 0 && midY < srcExtY) midY = srcExtY;
  if (extSrc < 0 && midY > srcExtY) midY = srcExtY;

  const parts: string[] = [];
  parts.push(`M ${src.x} ${src.y}`);
  if (srcH) parts.push(`L ${eSrcX} ${src.y}`);
  parts.push(`L ${eSrcX} ${eSrc.y + extSrc}`);
  parts.push(`L ${eSrcX} ${midY}`);
  parts.push(`L ${eTgtX} ${midY}`);
  parts.push(`L ${eTgtX} ${eTgt.y + extTgt}`);
  if (tgtH) parts.push(`L ${tgt.x} ${tgt.y}`);
  else parts.push(`L ${tgt.x} ${tgt.y}`);

  return parts.join(' ');
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

function WireLabel({ points, label, color }: { points: Point[]; label: string; color: string }) {
  let bestLen = 0;
  let bestMid = points[0];
  let bestAngle = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > bestLen) {
      bestLen = len;
      bestMid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
      bestAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    }
  }
  if (bestAngle > 90) bestAngle -= 180;
  if (bestAngle < -90) bestAngle += 180;
  const isVertical = Math.abs(bestAngle) > 45;
  const offsetX = isVertical ? 2.5 : 0;
  const offsetY = isVertical ? 0 : -1.5;
  return (
    <text
      x={bestMid.x + offsetX}
      y={bestMid.y + offsetY}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={3.2}
      fontWeight={600}
      fill={color}
      stroke="#fff"
      strokeWidth={2.5}
      paintOrder="stroke"
      transform={`rotate(${bestAngle}, ${bestMid.x + offsetX}, ${bestMid.y + offsetY})`}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      {label}
    </text>
  );
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
  onSegmentDragChange,
}) => {
  const rows = usePanelStore((s) => s.rows);
  const wires = usePanelStore((s) => s.wires);
  const panelIOs = usePanelStore((s) => s.panelIOs);
  const externalDevices = usePanelStore((s) => s.externalDevices);
  const busbars = usePanelStore((s) => s.busbars);
  const wiringFrom = usePanelStore((s) => s.wiringFrom);
  const addWireWaypoint = usePanelStore((s) => s.addWireWaypoint);
  const addWireWaypointFromPath = usePanelStore((s) => s.addWireWaypointFromPath);
  const materializeWireWaypoints = usePanelStore((s) => s.materializeWireWaypoints);
  const moveWireWaypoint = usePanelStore((s) => s.moveWireWaypoint);
  const moveWireSegment = usePanelStore((s) => s.moveWireSegment);
  const removeWireWaypoint = usePanelStore((s) => s.removeWireWaypoint);
  const wireSnapAlignment = usePanelStore((s) => s.wireSnapAlignment);

  const [draggingWp, setDraggingWp] = useState<{ wireId: string; wpIndex: number } | null>(null);
  const [draggingSegment, setDraggingSegment] = useState<{
    wireId: string;
    segmentIndex: number;
    startP1: Point;
    startP2: Point;
    lastMouse: Point;
  } | null>(null);
  const [pendingSegmentDrag, setPendingSegmentDrag] = useState<{
    wireId: string;
    segmentIndex: number;
    startMouse: Point;
    startP1: Point;
    startP2: Point;
  } | null>(null);
  const dragRef = useRef<boolean>(false);
  const [snapGuides, setSnapGuides] = useState<{from: Point; to: Point}[]>([]);
  const [equidistantGuides, setEquidistantGuides] = useState<DimensionLine[]>([]);

  useEffect(() => {
    onSegmentDragChange?.(draggingSegment != null);
  }, [draggingSegment, onSegmentDragChange]);

  const getPos = (instanceId: string, portId: string): PortPosition | null => {
    if (instanceId.startsWith('panel-io:')) {
      const ioId = instanceId.replace('panel-io:', '');
      const io = panelIOs.find((i) => i.id === ioId);
      if (!io) return null;
      const pos = getIOPortPosition(io, panelWidth, panelHeight);
      const edgeSide: PortPosition['side'] =
        io.edge === 'top' ? 'bottom'
        : io.edge === 'bottom' ? 'top'
        : io.edge === 'left' ? 'right'
        : io.edge === 'right' ? 'left'
        : undefined;
      return { ...pos, side: edgeSide };
    }
    if (instanceId.startsWith('busbar:')) {
      const busbarId = instanceId.replace('busbar:', '');
      const bar = busbars.find((b) => b.id === busbarId);
      if (!bar) return null;
      const pos = getBusbarPortPosition(bar, portId);
      if (!pos) return null;
      const typeMap: Record<string, string> = { phase: 'phase', neutral: 'neutral', ground: 'ground' };
      return { x: pos.x, y: pos.y, type: typeMap[bar.type] ?? 'any', side: 'top' };
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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pt = getSvgPoint(e);

      if (draggingSegment) {
        const wire = wires.find((w) => w.id === draggingSegment.wireId);
        const waypoints = wire?.waypoints ?? [];
        const refIdx = draggingSegment.segmentIndex > 0 ? draggingSegment.segmentIndex - 1 : 0;
        const pCurr = waypoints[refIdx];
        if (!pCurr) {
          setDraggingSegment((s) => (s ? { ...s, lastMouse: pt } : null));
          return;
        }
        const dx = pt.x - draggingSegment.lastMouse.x;
        const dy = pt.y - draggingSegment.lastMouse.y;
        const segDx = draggingSegment.startP2.x - draggingSegment.startP1.x;
        const segDy = draggingSegment.startP2.y - draggingSegment.startP1.y;
        const len = Math.sqrt(segDx * segDx + segDy * segDy);
        if (len > 0.01) {
          const perpX = -segDy / len;
          const perpY = segDx / len;
          let deltaPerpX = (dx * perpX + dy * perpY) * perpX;
          let deltaPerpY = (dx * perpX + dy * perpY) * perpY;
          if (wireSnapAlignment && !e.shiftKey) {
            const movingIndices = new Set<number>(
              draggingSegment.segmentIndex === 0
                ? [0]
                : draggingSegment.segmentIndex === waypoints.length
                  ? [waypoints.length - 1]
                  : [draggingSegment.segmentIndex - 1, draggingSegment.segmentIndex],
            );
            const targets: Point[] = [];
            for (const w of wires) {
              const src = getPos(w.sourceInstanceId, w.sourcePortId);
              const tgt = getPos(w.targetInstanceId, w.targetPortId);
              if (src) targets.push(src);
              if (tgt) targets.push(tgt);
              (w.waypoints ?? []).forEach((wp, i) => {
                if (w.id !== draggingSegment.wireId || !movingIndices.has(i)) targets.push(wp);
              });
            }
            let x = pCurr.x + deltaPerpX;
            let y = pCurr.y + deltaPerpY;
            let bestX = x;
            let bestY = y;
            let bestDistX = SEGMENT_SNAP_TOLERANCE + 1;
            let bestDistY = SEGMENT_SNAP_TOLERANCE + 1;
            let bestTargetX: Point | null = null;
            let bestTargetY: Point | null = null;
            for (const t of targets) {
              const dX = Math.abs(x - t.x);
              const dY = Math.abs(y - t.y);
              if (dX <= SEGMENT_SNAP_TOLERANCE && dX < bestDistX) {
                bestDistX = dX;
                bestX = t.x;
                bestTargetX = t;
              }
              if (dY <= SEGMENT_SNAP_TOLERANCE && dY < bestDistY) {
                bestDistY = dY;
                bestY = t.y;
                bestTargetY = t;
              }
            }
            deltaPerpX = bestX - pCurr.x;
            deltaPerpY = bestY - pCurr.y;
            const newGuides: {from: Point; to: Point}[] = [];
            const snappedPos = { x: bestX, y: bestY };
            if (bestTargetX) {
              const d = Math.abs(snappedPos.x - bestTargetX.x) + Math.abs(snappedPos.y - bestTargetX.y);
              if (d > 0.5) newGuides.push({ from: snappedPos, to: bestTargetX });
            }
            if (bestTargetY) {
              const d = Math.abs(snappedPos.x - bestTargetY.x) + Math.abs(snappedPos.y - bestTargetY.y);
              if (d > 0.5) newGuides.push({ from: snappedPos, to: bestTargetY });
            }
            setSnapGuides(newGuides);

            // --- Equidistant snap ---
            const isHSeg = Math.abs(segDx) > Math.abs(segDy);
            const alignFiredOnMovAxis = isHSeg ? (bestTargetY != null) : (bestTargetX != null);
            const newEqGuides: DimensionLine[] = [];

            if (!alignFiredOnMovAxis) {
              const movCoord = isHSeg ? bestY : bestX;
              const fixedCoord = isHSeg ? pCurr.x : pCurr.y;

              const coordSet = new Set<number>();
              for (const t of targets) {
                coordSet.add(isHSeg ? t.y : t.x);
              }
              const coords = [...coordSet].sort((a, b) => a - b);

              let bestEqDist = SEGMENT_SNAP_TOLERANCE + 1;
              let bestEqPos = movCoord;
              let bestEqSegs: [number, number, number] | null = null;

              for (let i = 0; i < coords.length; i++) {
                for (let j = i + 1; j < coords.length; j++) {
                  const gap = coords[j] - coords[i];
                  if (gap < 3) continue;
                  const candidates: Array<{ pos: number; segs: [number, number, number] }> = [
                    { pos: coords[i] - gap, segs: [coords[i] - gap, coords[i], coords[j]] },
                    { pos: (coords[i] + coords[j]) / 2, segs: [coords[i], (coords[i] + coords[j]) / 2, coords[j]] },
                    { pos: coords[j] + gap, segs: [coords[i], coords[j], coords[j] + gap] },
                  ];
                  for (const cand of candidates) {
                    const d = Math.abs(movCoord - cand.pos);
                    if (d < bestEqDist) {
                      bestEqDist = d;
                      bestEqPos = cand.pos;
                      bestEqSegs = cand.segs;
                    }
                  }
                }
              }

              if (bestEqSegs && bestEqDist <= SEGMENT_SNAP_TOLERANCE) {
                if (isHSeg) {
                  bestY = bestEqPos;
                  deltaPerpY = bestY - pCurr.y;
                } else {
                  bestX = bestEqPos;
                  deltaPerpX = bestX - pCurr.x;
                }

                const [s1, s2, s3] = bestEqSegs;
                const gapMm = Math.abs(s2 - s1);
                const label = gapMm % 1 < 0.05 ? `${Math.round(gapMm)} mm` : `${gapMm.toFixed(1)} mm`;
                const offset = 6;

                if (isHSeg) {
                  const lx = fixedCoord - offset;
                  newEqGuides.push(
                    { x1: lx, y1: s1, x2: lx, y2: s2, label },
                    { x1: lx, y1: s2, x2: lx, y2: s3, label },
                  );
                } else {
                  const ly = fixedCoord - offset;
                  newEqGuides.push(
                    { x1: s1, y1: ly, x2: s2, y2: ly, label },
                    { x1: s2, y1: ly, x2: s3, y2: ly, label },
                  );
                }
              }
            }

            setEquidistantGuides(newEqGuides);
          } else {
            setSnapGuides([]);
            setEquidistantGuides([]);
          }
          moveWireSegment(draggingSegment.wireId, draggingSegment.segmentIndex, deltaPerpX, deltaPerpY);
        }
        setDraggingSegment((s) => (s ? { ...s, lastMouse: pt } : null));
        return;
      }

      if (pendingSegmentDrag) {
        const dist = Math.sqrt(
          (pt.x - pendingSegmentDrag.startMouse.x) ** 2 + (pt.y - pendingSegmentDrag.startMouse.y) ** 2,
        );
        if (dist > SEGMENT_DRAG_THRESHOLD) {
          setDraggingSegment({
            wireId: pendingSegmentDrag.wireId,
            segmentIndex: pendingSegmentDrag.segmentIndex,
            startP1: pendingSegmentDrag.startP1,
            startP2: pendingSegmentDrag.startP2,
            lastMouse: pt,
          });
          setPendingSegmentDrag(null);
        }
        return;
      }

      if (!draggingWp) return;
      dragRef.current = true;
      const wire = wires.find((w) => w.id === draggingWp.wireId);
      if (wire) {
        const waypoints = wire.waypoints ?? [];
        const src = getPos(wire.sourceInstanceId, wire.sourcePortId);
        const tgt = getPos(wire.targetInstanceId, wire.targetPortId);
        const prev = draggingWp.wpIndex > 0 ? waypoints[draggingWp.wpIndex - 1] : src;
        const next =
          draggingWp.wpIndex < waypoints.length - 1 ? waypoints[draggingWp.wpIndex + 1] : tgt;
        let ptX = pt.x;
        let ptY = pt.y;
        if (wireSnapAlignment && !e.shiftKey && prev && next) {
          if (Math.abs(pt.x - prev.x) <= SNAP_TOLERANCE) ptX = prev.x;
          else if (Math.abs(pt.x - next.x) <= SNAP_TOLERANCE) ptX = next.x;
          if (Math.abs(pt.y - prev.y) <= SNAP_TOLERANCE) ptY = prev.y;
          else if (Math.abs(pt.y - next.y) <= SNAP_TOLERANCE) ptY = next.y;
        }
        moveWireWaypoint(draggingWp.wireId, draggingWp.wpIndex, ptX, ptY);
      } else {
        moveWireWaypoint(draggingWp.wireId, draggingWp.wpIndex, pt.x, pt.y);
      }
    },
    [
      draggingWp,
      draggingSegment,
      pendingSegmentDrag,
      getSvgPoint,
      moveWireWaypoint,
      moveWireSegment,
      wires,
      getPos,
      wireSnapAlignment,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setDraggingWp(null);
    setDraggingSegment(null);
    setPendingSegmentDrag(null);
    setSnapGuides([]);
    setEquidistantGuides([]);
  }, []);

  const handleSegmentMouseDown = useCallback(
    (e: React.MouseEvent, wireId: string, segmentIndex: number, points: Point[], hasWaypoints: boolean) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const pt = getSvgPoint(e);
      const p1 = points[segmentIndex];
      const p2 = points[segmentIndex + 1];
      if (!p1 || !p2) return;
      if (!hasWaypoints) {
        materializeWireWaypoints(wireId, points);
      }
      setPendingSegmentDrag({ wireId, segmentIndex, startMouse: pt, startP1: p1, startP2: p2 });
    },
    [getSvgPoint, materializeWireWaypoints],
  );

  const handleWpRightClick = useCallback((e: React.MouseEvent, wireId: string, wpIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    removeWireWaypoint(wireId, wpIndex);
  }, [removeWireWaypoint]);

  const handleSegmentDoubleClick = useCallback(
    (e: React.MouseEvent, wireId: string, segmentIndex: number, pathPoints: Point[], hasWaypoints: boolean) => {
      e.stopPropagation();
      const pt = getSvgPoint(e);
      const p1 = pathPoints[segmentIndex];
      const p2 = pathPoints[segmentIndex + 1];
      let x = pt.x;
      let y = pt.y;
      if (p1 && p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq > 0.001) {
          const t = Math.max(0, Math.min(1, ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / lenSq));
          x = p1.x + t * dx;
          y = p1.y + t * dy;
        }
      }
      if (hasWaypoints) {
        addWireWaypoint(wireId, segmentIndex, x, y);
      } else {
        addWireWaypointFromPath(wireId, segmentIndex, x, y, pathPoints);
      }
    },
    [getSvgPoint, addWireWaypoint, addWireWaypointFromPath],
  );

  // ---- Collect all obstacles once ----

  const allModuleBounds = getModuleBounds(rows, rails, interiorOffsetXPx, interiorOffsetYPx);
  const allPortObstacles = getPortObstacles(rows, rails, interiorOffsetXPx, interiorOffsetYPx);

  // ---- Smart route computation ----

  const horizontalSegments: HorizontalSegment[] = [];
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
      points = buildSmartRoute(src, tgt, obstacles, horizontalSegments, verticalSegments);
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

  const isDragging = draggingWp || draggingSegment || pendingSegmentDrag;

  return (
    <g
      className="wire-layer"
      style={{ pointerEvents: 'stroke' }}
      onMouseMove={isDragging ? handleMouseMove : undefined}
      onMouseUp={isDragging ? handleMouseUp : undefined}
      onMouseLeave={isDragging ? handleMouseUp : undefined}
    >
      {isDragging && (
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
        const baseWidth = gaugeToStrokeWidth(wire.wireGaugeMm2);
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
                    onMouseDown={
                      isSelected
                        ? (e) => handleSegmentMouseDown(e, wire.id, i, points, true)
                        : undefined
                    }
                    onDoubleClick={(e) =>
                      handleSegmentDoubleClick(e, wire.id, i, points, true)
                    }
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
                onMouseDown={
                  isSelected
                    ? (e) => handleSegmentMouseDown(e, wire.id, 0, points, false)
                    : undefined
                }
                onDoubleClick={(e) =>
                  handleSegmentDoubleClick(e, wire.id, 0, points, false)
                }
              />
            )}

            {isEnergized && (
              <path
                d={displayPath}
                fill="none"
                stroke="#ffab00"
                strokeWidth={baseWidth + 1.5}
                opacity={0.25}
                style={{ pointerEvents: 'none' }}
              />
            )}

            <path
              d={displayPath}
              fill="none"
              stroke={isSelected ? '#ffd600' : color}
              strokeWidth={isSelected ? Math.max(baseWidth, 0.8) : isEnergized ? Math.max(baseWidth, 0.7) : baseWidth}
              strokeDasharray={isGround ? '1.5 0.8' : 'none'}
              opacity={0.9}
              style={{ pointerEvents: 'none' }}
            />

            {wire.label && (
              <WireLabel points={points} label={wire.label} color={baseColor} />
            )}

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
          </g>
        );
      })}

      {snapGuides.map((guide, i) => (
        <g key={`snap-guide-${i}`} style={{ pointerEvents: 'none' }}>
          <line
            x1={guide.from.x}
            y1={guide.from.y}
            x2={guide.to.x}
            y2={guide.to.y}
            stroke="#42a5f5"
            strokeWidth={0.3}
            strokeDasharray="1.5 1"
            opacity={0.8}
          />
          <circle
            cx={guide.to.x}
            cy={guide.to.y}
            r={1.2}
            fill="none"
            stroke="#42a5f5"
            strokeWidth={0.3}
            opacity={0.8}
          />
        </g>
      ))}

      {equidistantGuides.map((line, i) => {
        const ldx = line.x2 - line.x1;
        const ldy = line.y2 - line.y1;
        const lLen = Math.sqrt(ldx * ldx + ldy * ldy);
        if (lLen < 2) return null;
        const ux = ldx / lLen;
        const uy = ldy / lLen;
        const px = -uy;
        const py = ux;
        const a = 1.5;
        const midX = (line.x1 + line.x2) / 2;
        const midY = (line.y1 + line.y2) / 2;

        const arrowStart = [
          `M ${line.x1 + ux * a + px * a * 0.5} ${line.y1 + uy * a + py * a * 0.5}`,
          `L ${line.x1} ${line.y1}`,
          `L ${line.x1 + ux * a - px * a * 0.5} ${line.y1 + uy * a - py * a * 0.5}`,
        ].join(' ');
        const arrowEnd = [
          `M ${line.x2 - ux * a + px * a * 0.5} ${line.y2 - uy * a + py * a * 0.5}`,
          `L ${line.x2} ${line.y2}`,
          `L ${line.x2 - ux * a - px * a * 0.5} ${line.y2 - uy * a - py * a * 0.5}`,
        ].join(' ');

        return (
          <g key={`eq-guide-${i}`} style={{ pointerEvents: 'none' }}>
            <line
              x1={line.x1} y1={line.y1}
              x2={line.x2} y2={line.y2}
              stroke="#ff9800" strokeWidth={0.3} opacity={0.9}
            />
            <path d={arrowStart} stroke="#ff9800" strokeWidth={0.3} fill="none" opacity={0.9} />
            <path d={arrowEnd} stroke="#ff9800" strokeWidth={0.3} fill="none" opacity={0.9} />
            <text
              x={midX + px * 3} y={midY + py * 3}
              textAnchor="middle" dominantBaseline="central"
              fontSize={2.5} fontWeight={600}
              fill="#ff9800" stroke="#fff" strokeWidth={2} paintOrder="stroke"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {line.label}
            </text>
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
