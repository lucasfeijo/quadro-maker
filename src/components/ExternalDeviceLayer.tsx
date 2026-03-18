import React, { useCallback, useRef, useState } from 'react';
import { usePanelStore } from '../store/panelStore';
import { getModuleById, isDualMount } from '../data/modules';
import { mmToPx } from '../utils/geometry';
import { getModeInfo, getNextMode, SIM_MODES } from '../engine/circuit';
import type { ComponentState } from '../types';
import { ModuleIcon } from './ModuleIcon';
import { PortDot } from './PortDot';

interface Props {
  selectedDeviceIds: string[];
  onSelectDevice: (id: string | null, additive?: boolean) => void;
  onPortClick?: (instanceId: string, portId: string) => void;
  onPortMouseDown?: (instanceId: string, portId: string) => void;
  onPortMouseUp?: (instanceId: string, portId: string) => void;
  onPortHover?: (instanceId: string, portId: string) => void;
  onPortLeave?: () => void;
  simStates?: ComponentState[];
  onSimModeChange?: (instanceId: string, newMode: string) => void;
  onDragChange?: (dragging: boolean) => void;
}

const DEV_SCALE = 1;
const BOX_H = 18 * DEV_SCALE;
const BAR_H = 8;
const MODULE_HEIGHT_MM = 70;

function isScrewBusbar(moduleId: string): boolean {
  return moduleId.startsWith('busbar-screw-8p-');
}

function rotatePoint(cx: number, cy: number, px: number, py: number, deg: number): { x: number; y: number } {
  if (deg === 0) return { x: px, y: py };
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export function getExternalDevicePortPosition(
  device: { x: number; y: number; moduleId: string; properties?: Record<string, number | string> },
  portId: string,
): { x: number; y: number } | null {
  const def = getModuleById(device.moduleId);
  if (!def) return null;

  const boxW = mmToPx(def.widthMm) * DEV_SCALE;
  const isBar = isScrewBusbar(device.moduleId);
  const isDual = isDualMount(device.moduleId);
  const h = isBar ? BAR_H : isDual ? mmToPx(MODULE_HEIGHT_MM) * DEV_SCALE : BOX_H;
  const bx = device.x - boxW / 2;
  const by = device.y - h / 2;

  const port = def.ports.find((p) => p.id === portId);
  if (!port) return null;

  let px: number;
  let py: number;
  if (port.offsetYMm !== undefined) {
    px = bx + mmToPx(port.offsetXMm) * DEV_SCALE;
    py = by + mmToPx(port.offsetYMm);
  } else {
    px = bx + mmToPx(port.offsetXMm) * DEV_SCALE;
    py = port.side === 'top' ? by - 2 : by + h + 2;
  }

  const rot = Number(device.properties?.rotationDeg) || 0;
  return rotatePoint(device.x, device.y, px, py, rot);
}

export function getExternalDeviceBounds(
  device: { x: number; y: number; moduleId: string; properties?: Record<string, number | string> },
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const def = getModuleById(device.moduleId);
  if (!def) return null;
  const boxW = mmToPx(def.widthMm) * DEV_SCALE;
  const isBar = isScrewBusbar(device.moduleId);
  const isDual = isDualMount(device.moduleId);
  const h = isBar ? BAR_H : isDual ? mmToPx(MODULE_HEIGHT_MM) * DEV_SCALE : BOX_H;
  const portMargin = 8;
  const rot = Number(device.properties?.rotationDeg) || 0;
  const halfW = boxW / 2 + portMargin;
  const halfH = h / 2 + portMargin;
  const corners = [
    [-halfW, -halfH],
    [halfW, -halfH],
    [halfW, halfH],
    [-halfW, halfH],
  ].map(([dx, dy]) => rotatePoint(device.x, device.y, device.x + dx, device.y + dy, rot));
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

export const ExternalDeviceLayer: React.FC<Props> = ({
  selectedDeviceIds,
  onSelectDevice,
  onPortClick,
  onPortMouseDown,
  onPortMouseUp,
  onPortHover,
  onPortLeave,
  simStates,
  onSimModeChange,
  onDragChange,
}) => {
  const devices = usePanelStore((s) => s.externalDevices);
  const displayMode = usePanelStore((s) => s.displayMode);
  const moveDevice = usePanelStore((s) => s.moveExternalDevice);
  const moveDevices = usePanelStore((s) => s.moveExternalDevices);
  const removeDevice = usePanelStore((s) => s.removeExternalDevice);
  const updateLabel = usePanelStore((s) => s.updateExternalDeviceLabel);
  const wiringFrom = usePanelStore((s) => s.wiringFrom);
  const wires = usePanelStore((s) => s.wires);

  const [dragging, setDragging] = useState<string | null>(null);
  React.useEffect(() => { onDragChange?.(dragging != null); }, [dragging, onDragChange]);
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

        const isBar = isScrewBusbar(dev.moduleId);
        const isDual = isDualMount(dev.moduleId);
        const boxH = isBar ? BAR_H : isDual ? mmToPx(MODULE_HEIGHT_MM) * DEV_SCALE : BOX_H;
        const boxW = mmToPx(def.widthMm) * DEV_SCALE;
        const bx = dev.x - boxW / 2;
        const by = dev.y - boxH / 2;
        const isSelected = selectedDeviceIds.includes(dev.instanceId);
        const rot = Number(dev.properties?.rotationDeg) || 0;
        const transform = rot ? `rotate(${rot} ${dev.x} ${dev.y})` : undefined;

        const isConnected = (portId: string) => wires.some(
          (w) =>
            (w.sourceInstanceId === dev.instanceId && w.sourcePortId === portId) ||
            (w.targetInstanceId === dev.instanceId && w.targetPortId === portId),
        );

        return (
          <g
            key={dev.instanceId}
            transform={transform}
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
                height={boxH + 6}
                rx={3}
                fill="none"
                stroke="#ffd600"
                strokeWidth={1.2}
              />
            )}

            {!isBar && !isDual && (
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
            )}

            <rect
              x={bx}
              y={by}
              width={boxW}
              height={boxH}
              rx={isDual ? 1 : 1.5}
              fill={def.color}
              stroke={dragging === dev.instanceId ? '#ff9800' : isSelected ? '#ffd600' : isDual ? '#222' : '#555'}
              strokeWidth={dragging === dev.instanceId ? 1 : isSelected ? (isDual ? 1.5 : 0.8) : (isDual ? 0.5 : 0.5)}
              opacity={isDual ? 0.92 : 1}
              onMouseDown={(e) => onMouseDown(e, dev.instanceId, dev.x, dev.y)}
            />

            {isDual && (() => {
              const iconSize = Math.min(boxW * 0.6, boxH * 0.35);
              return (
              <>
                <ModuleIcon
                  icon={def.icon}
                  imageUrl={def.imageUrl}
                  displayMode={displayMode}
                  size={iconSize}
                  color="#fff"
                  inline
                  x={bx + (boxW - iconSize) / 2}
                  y={by + boxH * 0.08}
                />
                {def.widthMm >= 30 ? (
                  (() => {
                    const nominalA = dev.properties?.nominalCurrentA;
                    const ampLabel = nominalA != null ? `${nominalA}A` : null;
                    const hasLabel = !!dev.label;
                    const hasAmp = !!ampLabel;
                    const nameY = hasLabel
                      ? (hasAmp ? by + boxH * 0.58 : by + boxH * 0.62)
                      : (hasAmp ? by + boxH * 0.62 : by + boxH * 0.7);
                    const labelY = hasAmp ? by + boxH * 0.70 : by + boxH * 0.8;
                    const ampY = hasLabel ? by + boxH * 0.80 : by + boxH * 0.78;
                    return (
                      <>
                        <text
                          x={bx + boxW / 2}
                          y={nameY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#fff"
                          fontSize={Math.min(3.2, boxW * 0.35)}
                          fontWeight={600}
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {def.name}
                        </text>
                        {hasLabel && (
                          <text
                            x={bx + boxW / 2}
                            y={labelY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="rgba(255,255,255,0.85)"
                            fontSize={Math.min(2.8, boxW * 0.3)}
                            fontWeight={500}
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                          >
                            {dev.label}
                          </text>
                        )}
                        {hasAmp && (
                          <text
                            x={bx + boxW / 2}
                            y={ampY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="rgba(255,255,255,0.7)"
                            fontSize={Math.min(2.8, boxW * 0.3)}
                            fontWeight={600}
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                          >
                            {ampLabel}
                          </text>
                        )}
                      </>
                    );
                  })()
                ) : dev.label ? (
                  <text
                    x={bx + boxW / 2}
                    y={by + boxH * 0.7}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.9)"
                    fontSize={Math.min(2.5, boxW * 0.6)}
                    fontWeight={600}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                    transform={`rotate(-90, ${bx + boxW / 2}, ${by + boxH * 0.7})`}
                  >
                    {dev.label}
                  </text>
                ) : null}
                <text
                  x={bx + boxW / 2}
                  y={by + boxH * 0.92}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.55)"
                  fontSize={2}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {def.widthMm}mm
                </text>
              </>
            );
            })()}


            {def.category === 'switch' && !isBar && !isDual && (
              <g opacity={0.9} style={{ pointerEvents: 'none' }}>
                <line x1={bx + boxW / 2} y1={by + 4} x2={bx + boxW / 2 + 3} y2={by + BOX_H - 4} stroke="white" strokeWidth={1} strokeLinecap="round" />
                <circle cx={bx + boxW / 2} cy={by + 4} r={1} fill="white" />
                <circle cx={bx + boxW / 2} cy={by + BOX_H - 4} r={1} fill="white" />
              </g>
            )}
            {def.id === 'led' && !isDual && (() => {
              const ledColor = (dev.properties?.ledColor as string) || '#f44336';
              const simState = simStates?.find((s) => s.instanceId === dev.instanceId);
              const isOn = simState?.mode === 'on';
              const cx = bx + boxW / 2;
              const cy = by + BOX_H / 2;
              const r = Math.min(boxW, BOX_H) * 0.3;
              return (
                <g style={{ pointerEvents: 'none' }}>
                  {isOn && <circle cx={cx} cy={cy} r={r + 3} fill={ledColor} opacity={0.25} />}
                  <circle cx={cx} cy={cy} r={r} fill={isOn ? ledColor : '#555'} stroke="#fff" strokeWidth={0.5} opacity={isOn ? 1 : 0.5} />
                  {isOn && <circle cx={cx - r * 0.25} cy={cy - r * 0.25} r={r * 0.2} fill="#fff" opacity={0.6} />}
                </g>
              );
            })()}
            {def.category === 'button' && def.id !== 'led' && !isBar && !isDual && (
              <g opacity={0.9} style={{ pointerEvents: 'none' }}>
                <line x1={bx + boxW / 2 - 4} y1={by + BOX_H / 2} x2={bx + boxW / 2 + 4} y2={by + BOX_H / 2} stroke="white" strokeWidth={1} strokeLinecap="round" />
                <line x1={bx + boxW / 2} y1={by + BOX_H / 2 - 2} x2={bx + boxW / 2} y2={by + BOX_H / 2} stroke="white" strokeWidth={1} strokeLinecap="round" />
              </g>
            )}

            {!isBar && !isDual && (
              <text
                x={bx + boxW / 2}
                y={by + boxH + 5.5}
                textAnchor="middle"
                fontSize={3.5}
                fontWeight={600}
                fill="#333"
                stroke="#fff"
                strokeWidth={2.5}
                paintOrder="stroke"
                style={{ pointerEvents: 'none' }}
              >
                {dev.label || def.name}
              </text>
            )}

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

            {isDual
              ? def.ports.map((port) => (
                  <PortDot
                    key={port.id}
                    port={port}
                    moduleX={bx}
                    moduleY={by}
                    moduleH={boxH}
                    instanceId={dev.instanceId}
                    isWiringSource={wiringFrom?.instanceId === dev.instanceId && wiringFrom?.portId === port.id}
                    isConnected={isConnected(port.id)}
                    onPortClick={onPortClick ?? (() => {})}
                    onPortMouseDown={onPortMouseDown}
                    onPortMouseUp={onPortMouseUp}
                    onPortHover={onPortHover ?? (() => {})}
                    onPortLeave={onPortLeave ?? (() => {})}
                  />
                ))
              : def.ports.map((port) => {
                  const hasVertOffset = port.offsetYMm !== undefined;
                  const px = bx + mmToPx(port.offsetXMm) * DEV_SCALE;
                  const py = hasVertOffset ? by + mmToPx(port.offsetYMm!) : (port.side === 'top' ? by - 2 : by + boxH + 2);
                  const labelY = hasVertOffset ? py + 5 : (port.side === 'top' ? py - 4 : py + 5);
                  const connected = isConnected(port.id);

                  return (
                    <g key={port.id}>
                      <circle
                        data-wire-instance-id={dev.instanceId}
                        data-wire-port-id={port.id}
                        cx={px}
                        cy={py}
                        r={2}
                        fill={wiringFrom ? '#ff9800' : connected ? '#1976d2' : '#90caf9'}
                        stroke="white"
                        strokeWidth={0.6}
                        cursor="pointer"
                        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onPortMouseDown?.(dev.instanceId, port.id); }}
                        onPointerUp={(e) => { e.stopPropagation(); onPortMouseUp?.(dev.instanceId, port.id); }}
                        onClick={(e) => { e.stopPropagation(); onPortClick?.(dev.instanceId, port.id); }}
                        onPointerEnter={() => onPortHover?.(dev.instanceId, port.id)}
                        onPointerLeave={() => onPortLeave?.()}
                      />
                      <g transform={rot ? `rotate(${-rot} ${px} ${labelY})` : undefined}>
                        <text x={px} y={labelY} textAnchor="middle" fontSize={3.2} fontWeight={600} fill="#444" stroke="#fff" strokeWidth={2} paintOrder="stroke" style={{ pointerEvents: 'none' }}>
                          {port.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
          </g>
        );
      })}
    </g>
  );
};
