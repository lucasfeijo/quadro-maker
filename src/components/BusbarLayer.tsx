import React, { useCallback, useRef, useState } from 'react';
import type { Busbar, BusbarType } from '../types';
import { usePanelStore } from '../store/panelStore';

const BAR_HEIGHT = 6;

const TYPE_COLORS: Record<BusbarType, string> = {
  phase: '#d32f2f',
  neutral: '#1565c0',
  ground: '#2e7d32',
};

const TYPE_LABELS: Record<BusbarType, string> = {
  phase: 'Fase',
  neutral: 'Neutro',
  ground: 'Terra',
};

interface Props {
  onPortClick?: (instanceId: string, portId: string) => void;
  onPortMouseDown?: (instanceId: string, portId: string) => void;
  onPortMouseUp?: (instanceId: string, portId: string) => void;
  onPortHover?: (instanceId: string, portId: string) => void;
  onPortLeave?: () => void;
  onSelectBusbar?: (id: string) => void;
  selectedBusbarId?: string | null;
}

export const BusbarLayer: React.FC<Props> = ({
  onPortClick,
  onPortMouseDown,
  onPortMouseUp,
  onPortHover,
  onPortLeave,
  onSelectBusbar,
  selectedBusbarId,
}) => {
  const busbars = usePanelStore((s) => s.busbars);
  const wires = usePanelStore((s) => s.wires);
  const wiringFrom = usePanelStore((s) => s.wiringFrom);
  const moveBusbar = usePanelStore((s) => s.moveBusbar);
  const resizeBusbar = usePanelStore((s) => s.resizeBusbar);
  const removeBusbar = usePanelStore((s) => s.removeBusbar);
  const addBusbarConnectionPoint = usePanelStore((s) => s.addBusbarConnectionPoint);

  return (
    <g className="busbar-layer">
      {busbars.map((bar) => (
        <BusbarItem
          key={bar.id}
          bar={bar}
          selected={bar.id === selectedBusbarId}
          wires={wires}
          wiringFrom={wiringFrom}
          onMove={moveBusbar}
          onResize={resizeBusbar}
          onRemove={removeBusbar}
          onAddPoint={addBusbarConnectionPoint}
          onPortClick={onPortClick}
          onPortMouseDown={onPortMouseDown}
          onPortMouseUp={onPortMouseUp}
          onPortHover={onPortHover}
          onPortLeave={onPortLeave}
          onSelect={onSelectBusbar}
        />
      ))}
    </g>
  );
};

interface BusbarItemProps {
  bar: Busbar;
  selected?: boolean;
  wires: { sourceInstanceId: string; sourcePortId: string; targetInstanceId: string; targetPortId: string }[];
  wiringFrom: { instanceId: string; portId: string } | null;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, widthPx: number) => void;
  onRemove: (id: string) => void;
  onAddPoint: (id: string) => void;
  onPortClick?: (instanceId: string, portId: string) => void;
  onPortMouseDown?: (instanceId: string, portId: string) => void;
  onPortMouseUp?: (instanceId: string, portId: string) => void;
  onPortHover?: (instanceId: string, portId: string) => void;
  onPortLeave?: () => void;
  onSelect?: (id: string) => void;
}

function BusbarItem({
  bar,
  selected,
  wires,
  wiringFrom,
  onMove,
  onResize,
  onRemove,
  onAddPoint,
  onPortClick,
  onPortMouseDown,
  onPortMouseUp,
  onPortHover,
  onPortLeave,
  onSelect,
}: BusbarItemProps) {
  const instanceId = `busbar:${bar.id}`;
  const color = TYPE_COLORS[bar.type];
  const dragRef = useRef<{ startX: number; startY: number; barX: number; barY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; origWidth: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  const getSvgPoint = useCallback((ev: React.PointerEvent | PointerEvent) => {
    const svg = (ev.target as SVGElement).ownerSVGElement;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const ctm = svg.getScreenCTM()?.inverse();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm);
    return { x: p.x, y: p.y };
  }, []);

  const handleBarPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as SVGElement).closest('[data-busbar-port]')) return;
    if ((e.target as SVGElement).closest('[data-busbar-resize]')) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(bar.id);
    const pt = getSvgPoint(e);
    dragRef.current = { startX: pt.x, startY: pt.y, barX: bar.x, barY: bar.y };

    const onMove_ = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const p = getSvgPoint(ev as any);
      onMove(bar.id, dragRef.current.barX + (p.x - dragRef.current.startX), dragRef.current.barY + (p.y - dragRef.current.startY));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove_);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove_);
    window.addEventListener('pointerup', onUp);
  }, [bar.id, bar.x, bar.y, getSvgPoint, onMove, onSelect]);

  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const pt = getSvgPoint(e);
    resizeRef.current = { startX: pt.x, origWidth: bar.widthPx };

    const onMove_ = (ev: PointerEvent) => {
      if (!resizeRef.current) return;
      const p = getSvgPoint(ev as any);
      onResize(bar.id, resizeRef.current.origWidth + (p.x - resizeRef.current.startX));
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('pointermove', onMove_);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove_);
    window.addEventListener('pointerup', onUp);
  }, [bar.id, bar.widthPx, getSvgPoint, onResize]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm(`Remover barramento ${bar.label || TYPE_LABELS[bar.type]}?`)) {
      onRemove(bar.id);
    }
  }, [bar.id, bar.label, bar.type, onRemove]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest('[data-busbar-port]')) return;
    e.stopPropagation();
    onAddPoint(bar.id);
  }, [bar.id, onAddPoint]);

  const isPortConnected = (pointId: string) =>
    wires.some(
      (w) =>
        (w.sourceInstanceId === instanceId && w.sourcePortId === pointId) ||
        (w.targetInstanceId === instanceId && w.targetPortId === pointId),
    );

  return (
    <g
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Bar body */}
      <rect
        x={bar.x}
        y={bar.y}
        width={bar.widthPx}
        height={BAR_HEIGHT}
        rx={1}
        fill={color}
        stroke={selected ? '#ffd600' : hovered ? '#ffd600' : '#333'}
        strokeWidth={selected ? 1.2 : hovered ? 1 : 0.4}
        style={{ cursor: 'grab' }}
        onPointerDown={handleBarPointerDown}
      />

      {/* Label */}
      <text
        x={bar.x + bar.widthPx / 2}
        y={bar.y + BAR_HEIGHT / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={3.2}
        fontWeight={700}
        fill="#fff"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {bar.label || TYPE_LABELS[bar.type]}
      </text>

      {/* Resize handle */}
      <rect
        data-busbar-resize
        x={bar.x + bar.widthPx - 3}
        y={bar.y}
        width={3}
        height={BAR_HEIGHT}
        fill="transparent"
        style={{ cursor: 'ew-resize' }}
        onPointerDown={handleResizePointerDown}
      />

      {/* Connection points */}
      {bar.connectionPoints.map((pt) => {
        const px = bar.x + (pt.offsetPercent / 100) * bar.widthPx;
        const py = bar.y + BAR_HEIGHT + 3;
        const isSource = wiringFrom?.instanceId === instanceId && wiringFrom?.portId === pt.id;
        const connected = isPortConnected(pt.id);

        return (
          <g
            key={pt.id}
            data-busbar-port
            data-wire-instance-id={instanceId}
            data-wire-port-id={pt.id}
            style={{ cursor: 'pointer' }}
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onPortMouseDown?.(instanceId, pt.id); }}
            onPointerUp={(e) => { e.stopPropagation(); onPortMouseUp?.(instanceId, pt.id); }}
            onClick={(e) => { e.stopPropagation(); onPortClick?.(instanceId, pt.id); }}
            onPointerEnter={() => onPortHover?.(instanceId, pt.id)}
            onPointerLeave={() => onPortLeave?.()}
          >
            {/* Line from bar to port dot */}
            <line
              x1={px} y1={bar.y + BAR_HEIGHT}
              x2={px} y2={py}
              stroke={color} strokeWidth={0.6} style={{ pointerEvents: 'none' }}
            />
            {isSource && (
              <circle cx={px} cy={py} r={3.5} fill="none" stroke="#ffd600" strokeWidth={0.6} opacity={0.8}>
                <animate attributeName="r" values="3;4.5;3" dur="1s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={px} cy={py} r={2}
              fill={connected ? color : '#fff'}
              stroke={color} strokeWidth={0.6}
            />
          </g>
        );
      })}
    </g>
  );
}

export function getBusbarPortPosition(
  bar: Busbar,
  portId: string,
): { x: number; y: number } | null {
  const pt = bar.connectionPoints.find((p) => p.id === portId);
  if (!pt) return null;
  return {
    x: bar.x + (pt.offsetPercent / 100) * bar.widthPx,
    y: bar.y + BAR_HEIGHT + 3,
  };
}
