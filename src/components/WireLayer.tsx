import React from 'react';
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

export const WireLayer: React.FC<Props> = ({
  rails,
  interiorOffsetXPx,
  interiorOffsetYPx,
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

  const getPos = (instanceId: string, portId: string): PortPosition | null => {
    if (instanceId.startsWith('panel-io:')) {
      const ioId = instanceId.replace('panel-io:', '');
      const io = panelIOs.find((i) => i.id === ioId);
      if (!io) return null;
      return getIOPortPosition(io, svgWidth, svgHeight);
    }
    const extDev = externalDevices.find((d) => d.instanceId === instanceId);
    if (extDev) {
      const pos = getExternalDevicePortPosition(extDev, portId, svgWidth, svgHeight, padding);
      if (pos) return { x: pos.x, y: pos.y, type: 'any' };
    }
    const mr = findModuleAndRow(rows, instanceId);
    if (!mr) return null;
    return getPortAbsolutePosition(mr.mod, portId, mr.rowIndex, rails, interiorOffsetXPx, interiorOffsetYPx);
  };

  return (
    <g className="wire-layer" style={{ pointerEvents: 'stroke' }}>
      {wires.map((wire) => {
        const src = getPos(wire.sourceInstanceId, wire.sourcePortId);
        const tgt = getPos(wire.targetInstanceId, wire.targetPortId);
        if (!src || !tgt) return null;

        const isSelected = wire.id === selectedWireId;
        const isEnergized = energizedWires?.has(wire.id);
        const baseColor = wire.wireColor ?? WIRE_COLORS[src.type] ?? '#333';
        const color = isEnergized ? '#ffab00' : baseColor;
        const isGround = src.type === 'ground' || tgt.type === 'ground';
        const path = buildManhattanPath(src, tgt);

        return (
          <g key={wire.id} onClick={(e) => { e.stopPropagation(); onSelectWire(wire.id); }} style={{ cursor: 'pointer' }}>
            <path d={path} fill="none" stroke="transparent" strokeWidth={3} />
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
            <path
              d={path}
              fill="none"
              stroke={isSelected ? '#ffd600' : color}
              strokeWidth={isSelected ? 0.8 : isEnergized ? 0.7 : 0.5}
              strokeDasharray={isGround ? '1.5 0.8' : 'none'}
              opacity={0.9}
            />
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
