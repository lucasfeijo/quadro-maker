import React, { useCallback, useRef, useState } from 'react';
import { usePanelStore } from '../store/panelStore';
import { getModuleById } from '../data/modules';
import { cmToPx } from '../utils/geometry';
import { getModeInfo, getNextMode, SIM_MODES } from '../engine/circuit';
import type { ComponentState } from '../types';

interface Props {
  selectedDeviceIds: string[];
  onSelectDevice: (id: string | null, additive?: boolean) => void;
  onPortClick?: (instanceId: string, portId: string) => void;
  onPortHover?: (instanceId: string, portId: string) => void;
  onPortLeave?: () => void;
  simStates?: ComponentState[];
  onSimModeChange?: (instanceId: string, newMode: string) => void;
}

const DEV_SCALE = 1;
const BOX_H = 18 * DEV_SCALE;

export function getExternalDevicePortPosition(
  device: { x: number; y: number; moduleId: string },
  portId: string,
): { x: number; y: number } | null {
  const def = getModuleById(device.moduleId);
  if (!def) return null;

  const boxW = cmToPx(def.widthCm) * DEV_SCALE;
  const bx = device.x - boxW / 2;
  const by = device.y - BOX_H / 2;

  const port = def.ports.find((p) => p.id === portId);
  if (!port) return null;

  const px = bx + cmToPx(port.offsetXCm) * DEV_SCALE;
  const py = port.side === 'top' ? by - 2 : by + BOX_H + 2;
  return { x: px, y: py };
}

export function getExternalDeviceBounds(
  device: { x: number; y: number; moduleId: string },
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const def = getModuleById(device.moduleId);
  if (!def) return null;
  const boxW = cmToPx(def.widthCm) * DEV_SCALE;
  const portMargin = 8;
  return {
    minX: device.x - boxW / 2 - portMargin,
    minY: device.y - BOX_H / 2 - portMargin,
    maxX: device.x + boxW / 2 + portMargin,
    maxY: device.y + BOX_H / 2 + portMargin,
  };
}

export const ExternalDeviceLayer: React.FC<Props> = ({
  selectedDeviceIds,
  onSelectDevice,
  onPortClick,
  onPortHover,
  onPortLeave,
  simStates,
  onSimModeChange,
}) => {
  const devices = usePanelStore((s) => s.externalDevices);
  const moveDevice = usePanelStore((s) => s.moveExternalDevice);
  const moveDevices = usePanelStore((s) => s.moveExternalDevices);
  const removeDevice = usePanelStore((s) => s.removeExternalDevice);
  const updateLabel = usePanelStore((s) => s.updateExternalDeviceLabel);
  const wiringFrom = usePanelStore((s) => s.wiringFrom);
  const wires = usePanelStore((s) => s.wires);

  const [dragging, setDragging] = useState<string | null>(null);
  const dragOrigin = useRef<{
    mx: number;
    my: number;
    targets: Array<{ instanceId: string; ox: number; oy: number }>;
  } | null>(null);

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
    (e: React.MouseEvent, instanceId: string, devX: number, devY: number) => {
      if (wiringFrom) return;
      if (e.button !== 0) return;
      e.stopPropagation();
      const pt = getSvgPoint(e);

      const isInSelection = selectedDeviceIds.includes(instanceId);
      const targets = isInSelection && selectedDeviceIds.length > 1
        ? devices
            .filter((d) => selectedDeviceIds.includes(d.instanceId))
            .map((d) => ({ instanceId: d.instanceId, ox: d.x, oy: d.y }))
        : [{ instanceId, ox: devX, oy: devY }];

      dragOrigin.current = { mx: pt.x, my: pt.y, targets };
      setDragging(instanceId);
    },
    [wiringFrom, getSvgPoint, selectedDeviceIds, devices],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !dragOrigin.current) return;
      const pt = getSvgPoint(e);
      const dx = pt.x - dragOrigin.current.mx;
      const dy = pt.y - dragOrigin.current.my;

      if (dragOrigin.current.targets.length === 1) {
        const t = dragOrigin.current.targets[0];
        moveDevice(t.instanceId, t.ox + dx, t.oy + dy);
      } else {
        moveDevices(
          dragOrigin.current.targets.map((t) => ({
            instanceId: t.instanceId,
            x: t.ox + dx,
            y: t.oy + dy,
          })),
        );
      }
    },
    [dragging, getSvgPoint, moveDevice, moveDevices],
  );

  const onMouseUp = useCallback(() => {
    setDragging(null);
    dragOrigin.current = null;
  }, []);

  return (
    <g
      className="external-device-layer"
      onMouseMove={dragging ? onMouseMove : undefined}
      onMouseUp={dragging ? onMouseUp : undefined}
      onMouseLeave={dragging ? onMouseUp : undefined}
    >
      {dragging && (
        <rect
          x={-9999}
          y={-9999}
          width={99999}
          height={99999}
          fill="transparent"
          style={{ pointerEvents: 'all' }}
        />
      )}
      {devices.map((dev) => {
        const def = getModuleById(dev.moduleId);
        if (!def) return null;

        const boxW = cmToPx(def.widthCm) * DEV_SCALE;
        const bx = dev.x - boxW / 2;
        const by = dev.y - BOX_H / 2;
        const isSelected = selectedDeviceIds.includes(dev.instanceId);

        const isConnected = (portId: string) => wires.some(
          (w) =>
            (w.sourceInstanceId === dev.instanceId && w.sourcePortId === portId) ||
            (w.targetInstanceId === dev.instanceId && w.targetPortId === portId),
        );

        return (
          <g
            key={dev.instanceId}
            onClick={(e) => {
              e.stopPropagation();
              onSelectDevice(dev.instanceId, e.ctrlKey || e.metaKey || e.shiftKey);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm(`Remover ${dev.label || def.name}?`)) {
                removeDevice(dev.instanceId);
                onSelectDevice(null);
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              const newLabel = prompt('Rótulo do dispositivo:', dev.label || def.name);
              if (newLabel !== null) {
                updateLabel(dev.instanceId, newLabel);
              }
            }}
            style={{ cursor: dragging === dev.instanceId ? 'grabbing' : 'grab' }}
          >
            {isSelected && (
              <rect
                x={bx - 3}
                y={by - 3}
                width={boxW + 6}
                height={BOX_H + 6}
                rx={3}
                fill="none"
                stroke="#ffd600"
                strokeWidth={1.2}
              />
            )}

            <rect
              x={bx - 1}
              y={by - 1}
              width={boxW + 2}
              height={BOX_H + 2}
              rx={2}
              fill="none"
              stroke="#7b1fa2"
              strokeWidth={0.5}
              strokeDasharray="2,1"
              opacity={0.5}
            />

            <rect
              x={bx}
              y={by}
              width={boxW}
              height={BOX_H}
              rx={1.5}
              fill={def.color}
              stroke={dragging === dev.instanceId ? '#ff9800' : isSelected ? '#ffd600' : '#555'}
              strokeWidth={dragging === dev.instanceId ? 1 : isSelected ? 0.8 : 0.5}
              onMouseDown={(e) => onMouseDown(e, dev.instanceId, dev.x, dev.y)}
            />

            {def.category === 'switch' && (
              <g opacity={0.9} style={{ pointerEvents: 'none' }}>
                <line x1={bx + boxW / 2} y1={by + 4} x2={bx + boxW / 2 + 3} y2={by + BOX_H - 4} stroke="white" strokeWidth={1} strokeLinecap="round" />
                <circle cx={bx + boxW / 2} cy={by + 4} r={1} fill="white" />
                <circle cx={bx + boxW / 2} cy={by + BOX_H - 4} r={1} fill="white" />
              </g>
            )}
            {def.category === 'button' && (
              <g opacity={0.9} style={{ pointerEvents: 'none' }}>
                <line x1={bx + boxW / 2 - 4} y1={by + BOX_H / 2} x2={bx + boxW / 2 + 4} y2={by + BOX_H / 2} stroke="white" strokeWidth={1} strokeLinecap="round" />
                <line x1={bx + boxW / 2} y1={by + BOX_H / 2 - 2} x2={bx + boxW / 2} y2={by + BOX_H / 2} stroke="white" strokeWidth={1} strokeLinecap="round" />
              </g>
            )}

            <text
              x={bx + boxW / 2}
              y={by + BOX_H + 5}
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
                  <rect x={badgeX} y={badgeY} width={badgeW} height={badgeH} rx={1.5} fill={modeInfo.color} stroke="#fff" strokeWidth={0.4} opacity={0.95} />
                  <text x={badgeX + badgeW / 2} y={badgeY + badgeH / 2} textAnchor="middle" dominantBaseline="central" fontSize={2.8} fontWeight={700} fill="#fff" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {modeInfo.label}
                  </text>
                </g>
              );
            })()}

            {def.ports.map((port) => {
              const px = bx + cmToPx(port.offsetXCm) * DEV_SCALE;
              const py = port.side === 'top' ? by - 2 : by + BOX_H + 2;
              const labelY = port.side === 'top' ? py - 4 : py + 5;
              const connected = isConnected(port.id);

              return (
                <g key={port.id}>
                  <circle
                    cx={px}
                    cy={py}
                    r={2}
                    fill={wiringFrom ? '#ff9800' : connected ? '#1976d2' : '#90caf9'}
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
                  <text x={px} y={labelY} textAnchor="middle" fontSize={3.2} fontWeight={600} fill="#444" style={{ pointerEvents: 'none' }}>
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
