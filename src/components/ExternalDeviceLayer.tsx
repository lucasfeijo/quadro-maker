import React, { useCallback, useRef, useState } from 'react';
import { usePanelStore } from '../store/panelStore';
import { getModuleById } from '../data/modules';
import { cmToPx } from '../utils/geometry';

interface Props {
  svgWidth: number;
  svgHeight: number;
  padding: number;
  onPortClick?: (instanceId: string, portId: string) => void;
  onPortHover?: (instanceId: string, portId: string) => void;
  onPortLeave?: () => void;
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
  onPortClick,
  onPortHover,
  onPortLeave,
}) => {
  const devices = usePanelStore((s) => s.externalDevices);
  const moveDevice = usePanelStore((s) => s.moveExternalDevice);
  const removeDevice = usePanelStore((s) => s.removeExternalDevice);
  const wiringFrom = usePanelStore((s) => s.wiringFrom);

  const [dragging, setDragging] = useState<string | null>(null);
  const dragOrigin = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

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
      const newX = dragOrigin.current.ox + dx;
      const newY = dragOrigin.current.oy + dy;
      const pct = toPercent(newX, newY);
      moveDevice(dragging, pct.xPercent, pct.yPercent);
    },
    [dragging, getSvgPoint, toPercent, moveDevice],
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

        return (
          <g key={dev.instanceId}>
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

            <rect
              x={bx}
              y={by}
              width={boxW}
              height={boxH}
              rx={1.5}
              fill={def.color}
              stroke={dragging === dev.instanceId ? '#ff9800' : '#555'}
              strokeWidth={dragging === dev.instanceId ? 1 : 0.5}
              cursor={wiringFrom ? 'default' : 'grab'}
              onMouseDown={(e) => onMouseDown(e, dev.instanceId, dev.xPercent, dev.yPercent)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (confirm(`Remover ${dev.label || def.name}?`)) {
                  removeDevice(dev.instanceId);
                }
              }}
            />

            {def.category === 'switch' && (
              <g opacity={0.9}>
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
              <g opacity={0.9}>
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
            >
              {dev.label || def.name}
            </text>

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
