import React, { useCallback, useRef, useState } from 'react';
import { usePanelStore } from '../store/panelStore';
import { getModuleById } from '../data/modules';
import { cmToPx } from '../utils/geometry';
import { getModeInfo, getNextMode, SIM_MODES } from '../engine/circuit';
import type { ComponentState } from '../types';

interface Props {
  svgWidth: number;
  svgHeight: number;
  padding: number;
  selectedDeviceId: string | null;
  onSelectDevice: (id: string | null) => void;
  onPortClick?: (instanceId: string, portId: string) => void;
  onPortHover?: (instanceId: string, portId: string) => void;
  onPortLeave?: () => void;
  simStates?: ComponentState[];
  onSimModeChange?: (instanceId: string, newMode: string) => void;
}

const DEV_SCALE = 1;

export function getExternalDevicePortPosition(
  device: { xPercent: number; yPercent: number; moduleId: string },
  portId: string,
  svgWidth: number,
  svgHeight: number,
  padding: number,
): { x: number; y: number } | null {
  const def = getModuleById(device.moduleId);
  if (!def) return null;

  const totalW = svgWidth + padding * 2;
  const totalH = svgHeight + padding * 2;
  const cx = -padding + (device.xPercent / 100) * totalW;
  const cy = -padding + (device.yPercent / 100) * totalH;

  const boxW = cmToPx(def.widthCm) * DEV_SCALE;
  const boxH = 18 * DEV_SCALE;
  const bx = cx - boxW / 2;
  const by = cy - boxH / 2;

  const port = def.ports.find((p) => p.id === portId);
  if (!port) return null;

  const px = bx + cmToPx(port.offsetXCm) * DEV_SCALE;
  const py = port.side === 'top' ? by - 2 : by + boxH + 2;
  return { x: px, y: py };
}

export const ExternalDeviceLayer: React.FC<Props> = ({
  svgWidth,
  svgHeight,
  padding,
  selectedDeviceId,
  onSelectDevice,
  onPortClick,
  onPortHover,
  onPortLeave,
  simStates,
  onSimModeChange,
}) => {
  const devices = usePanelStore((s) => s.externalDevices);
  const moveDevice = usePanelStore((s) => s.moveExternalDevice);
  const updateLabel = usePanelStore((s) => s.updateExternalDeviceLabel);
  const wiringFrom = usePanelStore((s) => s.wiringFrom);

  const [dragging, setDragging] = useState<string | null>(null);
  const dragOrigin = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const didDrag = useRef(false);

  const totalW = svgWidth + padding * 2;
  const totalH = svgHeight + padding * 2;

  const toPercent = useCallback(
    (svgX: number, svgY: number) => ({
      xPercent: Math.max(0, Math.min(100, ((svgX + padding) / totalW) * 100)),
      yPercent: Math.max(0, Math.min(100, ((svgY + padding) / totalH) * 100)),
    }),
    [totalW, totalH, padding],
  );

  const getSvgPoint = useCallback(
    (e: React.MouseEvent) => {
      const svg = (e.target as SVGElement).ownerSVGElement;
      if (!svg) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM()?.inverse();
      if (!ctm) return { x: 0, y: 0 };
      const svgPt = pt.matrixTransform(ctm);
      return { x: svgPt.x, y: svgPt.y };
    },
    [],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent, instanceId: string, xPercent: number, yPercent: number) => {
      if (wiringFrom) return;
      e.stopPropagation();
      const pt = getSvgPoint(e);
      const cx = -padding + (xPercent / 100) * totalW;
      const cy = -padding + (yPercent / 100) * totalH;
      dragOrigin.current = { mx: pt.x, my: pt.y, ox: cx, oy: cy };
      didDrag.current = false;
      setDragging(instanceId);
    },
    [wiringFrom, getSvgPoint, padding, totalW, totalH],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !dragOrigin.current) return;
      const pt = getSvgPoint(e);
      const dx = pt.x - dragOrigin.current.mx;
      const dy = pt.y - dragOrigin.current.my;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) didDrag.current = true;
      const newX = dragOrigin.current.ox + dx;
      const newY = dragOrigin.current.oy + dy;
      const pct = toPercent(newX, newY);
      moveDevice(dragging, pct.xPercent, pct.yPercent);
    },
    [dragging, getSvgPoint, toPercent, moveDevice],
  );

  const onMouseUp = useCallback(() => {
    const wasDragging = dragging;
    const wasDragged = didDrag.current;
    setDragging(null);
    dragOrigin.current = null;
    if (wasDragging && !wasDragged) {
      onSelectDevice(wasDragging);
    }
  }, [dragging, onSelectDevice]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, instanceId: string, currentLabel: string, defName: string) => {
      e.stopPropagation();
      const newLabel = prompt('Rótulo do dispositivo:', currentLabel || defName);
      if (newLabel !== null) {
        updateLabel(instanceId, newLabel);
      }
    },
    [updateLabel],
  );

  return (
    <g
      className="external-device-layer"
      onMouseMove={dragging ? onMouseMove : undefined}
      onMouseUp={dragging ? onMouseUp : undefined}
      onMouseLeave={dragging ? onMouseUp : undefined}
    >
      {dragging && (
        <rect
          x={-padding}
          y={-padding}
          width={totalW}
          height={totalH}
          fill="transparent"
          style={{ pointerEvents: 'all' }}
        />
      )}
      {devices.map((dev) => {
        const def = getModuleById(dev.moduleId);
        if (!def) return null;

        const cx = -padding + (dev.xPercent / 100) * totalW;
        const cy = -padding + (dev.yPercent / 100) * totalH;
        const boxW = cmToPx(def.widthCm) * DEV_SCALE;
        const boxH = 18 * DEV_SCALE;
        const bx = cx - boxW / 2;
        const by = cy - boxH / 2;
        const isSelected = selectedDeviceId === dev.instanceId;

        return (
          <g key={dev.instanceId}>
            {/* Selection highlight */}
            {isSelected && (
              <rect
                x={bx - 3}
                y={by - 3}
                width={boxW + 6}
                height={boxH + 6}
                rx={3}
                fill="none"
                stroke="#ffd600"
                strokeWidth={1.2}
              />
            )}

            {/* Dashed external indicator */}
            <rect
              x={bx - 1}
              y={by - 1}
              width={boxW + 2}
              height={boxH + 2}
              rx={2}
              fill="none"
              stroke="#7b1fa2"
              strokeWidth={0.5}
              strokeDasharray="2,1"
              opacity={0.5}
            />

            {/* Main box */}
            <rect
              x={bx}
              y={by}
              width={boxW}
              height={boxH}
              rx={1.5}
              fill={def.color}
              stroke={dragging === dev.instanceId ? '#ff9800' : isSelected ? '#ffd600' : '#555'}
              strokeWidth={dragging === dev.instanceId ? 1 : isSelected ? 0.8 : 0.5}
              cursor={wiringFrom ? 'default' : 'grab'}
              onMouseDown={(e) => onMouseDown(e, dev.instanceId, dev.xPercent, dev.yPercent)}
              onDoubleClick={(e) => handleDoubleClick(e, dev.instanceId, dev.label || '', def.name)}
            />

            {def.category === 'switch' && (
              <g opacity={0.9} style={{ pointerEvents: 'none' }}>
                <line
                  x1={bx + boxW / 2}
                  y1={by + 4}
                  x2={bx + boxW / 2 + 3}
                  y2={by + boxH - 4}
                  stroke="white"
                  strokeWidth={1}
                  strokeLinecap="round"
                />
                <circle cx={bx + boxW / 2} cy={by + 4} r={1} fill="white" />
                <circle cx={bx + boxW / 2} cy={by + boxH - 4} r={1} fill="white" />
              </g>
            )}
            {def.category === 'button' && (
              <g opacity={0.9} style={{ pointerEvents: 'none' }}>
                <line
                  x1={bx + boxW / 2 - 4}
                  y1={by + boxH / 2}
                  x2={bx + boxW / 2 + 4}
                  y2={by + boxH / 2}
                  stroke="white"
                  strokeWidth={1}
                  strokeLinecap="round"
                />
                <line
                  x1={bx + boxW / 2}
                  y1={by + boxH / 2 - 2}
                  x2={bx + boxW / 2}
                  y2={by + boxH / 2}
                  stroke="white"
                  strokeWidth={1}
                  strokeLinecap="round"
                />
              </g>
            )}

            <text
              x={bx + boxW / 2}
              y={by + boxH + 5}
              textAnchor="middle"
              fontSize={3.2}
              fontWeight={600}
              fill="#333"
              style={{ pointerEvents: 'none' }}
            >
              {dev.label || def.name}
            </text>

            {(() => {
              const simState = simStates?.find((s) => s.instanceId === dev.instanceId);
              if (!simState) return null;
              const modes = SIM_MODES[def.category];
              if (!modes || modes.length <= 1) return null;
              const modeInfo = getModeInfo(def.category, simState.mode);
              if (!modeInfo) return null;
              const badgeW = Math.min(boxW - 2, 18);
              const badgeH = 5;
              const badgeX = bx + (boxW - badgeW) / 2;
              const badgeY = by - badgeH - 3;
              return (
                <g
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSimModeChange?.(dev.instanceId, getNextMode(def.category, simState.mode));
                  }}
                >
                  <rect
                    x={badgeX}
                    y={badgeY}
                    width={badgeW}
                    height={badgeH}
                    rx={1.5}
                    fill={modeInfo.color}
                    stroke="#fff"
                    strokeWidth={0.4}
                    opacity={0.95}
                  />
                  <text
                    x={badgeX + badgeW / 2}
                    y={badgeY + badgeH / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={2.8}
                    fontWeight={700}
                    fill="#fff"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {modeInfo.label}
                  </text>
                </g>
              );
            })()}

            {def.ports.map((port) => {
              const px = bx + cmToPx(port.offsetXCm) * DEV_SCALE;
              const py = port.side === 'top' ? by - 2 : by + boxH + 2;
              const labelY = port.side === 'top' ? py - 4 : py + 5;

              return (
                <g key={port.id}>
                  <circle
                    cx={px}
                    cy={py}
                    r={2}
                    fill={wiringFrom ? '#ff9800' : '#1976d2'}
                    stroke="white"
                    strokeWidth={0.6}
                    cursor="pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPortClick?.(dev.instanceId, port.id);
                    }}
                    onMouseEnter={() => onPortHover?.(dev.instanceId, port.id)}
                    onMouseLeave={() => onPortLeave?.()}
                  />
                  <text
                    x={px}
                    y={labelY}
                    textAnchor="middle"
                    fontSize={3.2}
                    fontWeight={600}
                    fill="#444"
                    style={{ pointerEvents: 'none' }}
                  >
                    {port.label}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
};
