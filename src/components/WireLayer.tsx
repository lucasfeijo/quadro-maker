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

interface PortPosition {
  x: number;
  y: number;
  type: string;
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

  return { x, y, type: port.type };
}

function buildManhattanPath(src: PortPosition, tgt: PortPosition): string {
  const extendSrc = src.y < tgt.y ? 4 : -4;
  const extendTgt = tgt.y > src.y ? -4 : 4;
  const midY = (src.y + extendSrc + tgt.y + extendTgt) / 2;

  return [
    `M ${src.x} ${src.y}`,
    `L ${src.x} ${src.y + extendSrc}`,
    `L ${src.x} ${midY}`,
    `L ${tgt.x} ${midY}`,
    `L ${tgt.x} ${tgt.y + extendTgt}`,
    `L ${tgt.x} ${tgt.y}`,
  ].join(' ');
}

function buildWaypointPath(src: PortPosition, tgt: PortPosition, waypoints: { x: number; y: number }[]): string {
  const points = [{ x: src.x, y: src.y }, ...waypoints, { x: tgt.x, y: tgt.y }];
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

const VERTEX_RADIUS = 2;
const HIT_WIDTH = 4;

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
      return getIOPortPosition(io, panelWidth, panelHeight);
    }
    const extDev = externalDevices.find((d) => d.instanceId === instanceId);
    if (extDev) {
      const pos = getExternalDevicePortPosition(extDev, portId);
      if (pos) return { x: pos.x, y: pos.y, type: 'any' };
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
      {wires.map((wire) => {
        const src = getPos(wire.sourceInstanceId, wire.sourcePortId);
        const tgt = getPos(wire.targetInstanceId, wire.targetPortId);
        if (!src || !tgt) return null;

        const isSelected = wire.id === selectedWireId;
        const isEnergized = energizedWires?.has(wire.id);
        const baseColor = wire.wireColor ?? WIRE_COLORS[src.type] ?? '#333';
        const color = isEnergized ? '#ffab00' : baseColor;
        const isGround = src.type === 'ground' || tgt.type === 'ground';
        const waypoints = wire.waypoints ?? [];
        const hasWaypoints = waypoints.length > 0;
        const path = hasWaypoints
          ? buildWaypointPath(src, tgt, waypoints)
          : buildManhattanPath(src, tgt);

        const allPoints = hasWaypoints
          ? [{ x: src.x, y: src.y }, ...waypoints, { x: tgt.x, y: tgt.y }]
          : null;

        return (
          <g key={wire.id}>
            {/* Hit area for each segment (for double-click to add waypoint) */}
            {hasWaypoints && allPoints ? (
              allPoints.slice(0, -1).map((p, i) => {
                const next = allPoints[i + 1];
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
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth={HIT_WIDTH}
                style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                onClick={(e) => { e.stopPropagation(); onSelectWire(wire.id); }}
                onDoubleClick={(e) => handleSegmentDoubleClick(e, wire.id, 0)}
              />
            )}

            {/* Glow for energized wires */}
            {isEnergized && (
              <path
                d={path}
                fill="none"
                stroke="#ffab00"
                strokeWidth={2}
                opacity={0.25}
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* Visible wire */}
            <path
              d={path}
              fill="none"
              stroke={isSelected ? '#ffd600' : color}
              strokeWidth={isSelected ? 0.8 : isEnergized ? 0.7 : 0.5}
              strokeDasharray={isGround ? '1.5 0.8' : 'none'}
              opacity={0.9}
              style={{ pointerEvents: 'none' }}
            />

            {/* Waypoint vertices (draggable) */}
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

            {/* When selected & no waypoints, show + hint on hover */}
            {isSelected && !hasWaypoints && (
              <path
                d={path}
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
              d={buildManhattanPath(src, tgt)}
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
