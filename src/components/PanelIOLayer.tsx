import React, { useCallback, useRef } from 'react';
import { usePanelStore } from '../store/panelStore';
import { getIOPosition, closestEdge } from '../utils/panelIO';

const IO_COLORS: Record<string, string> = {
  phase: '#d32f2f',
  neutral: '#1565c0',
  ground: '#2e7d32',
  dc_pos: '#c62828',
  dc_neg: '#1a237e',
  signal: '#f57c00',
};

const IO_LABELS: Record<string, string> = {
  phase: 'F',
  neutral: 'N',
  ground: 'PE',
  dc_pos: 'DC+',
  dc_neg: 'DC-',
  signal: 'SIG',
};

const DIR_ARROWS: Record<string, string> = {
  input: '▼',
  output: '▲',
};

const DOT_R = 2.5;

interface Props {
  svgWidth: number;
  svgHeight: number;
  selectedIOId: string | null;
  onSelectIO: (id: string) => void;
  onPortClick?: (instanceId: string, portId: string) => void;
  onPortMouseDown?: (instanceId: string, portId: string) => void;
  onPortMouseUp?: (instanceId: string, portId: string) => void;
  onPortHover?: (instanceId: string, portId: string) => void;
  onPortLeave?: () => void;
}

function screenToSvg(svgEl: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  return pt.matrixTransform(ctm.inverse());
}

export const PanelIOLayer: React.FC<Props> = ({
  svgWidth,
  svgHeight,
  selectedIOId,
  onSelectIO,
  onPortClick,
  onPortMouseDown,
  onPortMouseUp,
  onPortHover,
  onPortLeave,
}) => {
  const panelIOs = usePanelStore((s) => s.panelIOs);
  const wiringFrom = usePanelStore((s) => s.wiringFrom);
  const wires = usePanelStore((s) => s.wires);
  const movePanelIO = usePanelStore((s) => s.movePanelIO);

  const draggingRef = useRef<string | null>(null);

  const handleMouseDown = useCallback(
    (ioId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      draggingRef.current = ioId;

      const svgEl = (e.target as Element).closest('svg') as SVGSVGElement | null;
      if (!svgEl) return;

      const onMove = (me: MouseEvent) => {
        if (!draggingRef.current) return;
        const svgPt = screenToSvg(svgEl, me.clientX, me.clientY);
        const { edge, positionPercent } = closestEdge(svgPt.x, svgPt.y, svgWidth, svgHeight);
        movePanelIO(draggingRef.current, edge, positionPercent);
      };

      const onUp = () => {
        draggingRef.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [svgWidth, svgHeight, movePanelIO],
  );

  return (
    <g className="panel-io-layer">
      {panelIOs.map((io) => {
        const pos = getIOPosition(io, svgWidth, svgHeight);
        const color = IO_COLORS[io.type] ?? '#999';
        const isSelected = io.id === selectedIOId;
        const instanceId = `panel-io:${io.id}`;
        const portId = 'port';
        const isWiringSource = wiringFrom?.instanceId === instanceId && wiringFrom?.portId === portId;
        const isConnected = wires.some(
          (w) =>
            (w.sourceInstanceId === instanceId && w.sourcePortId === portId) ||
            (w.targetInstanceId === instanceId && w.targetPortId === portId),
        );

        return (
          <g key={io.id}>
            {/* IO Box */}
            <rect
              x={pos.boxX}
              y={pos.boxY}
              width={pos.boxW}
              height={pos.boxH}
              rx={2}
              fill={color}
              opacity={0.92}
              stroke={isSelected ? '#ffd600' : '#fff'}
              strokeWidth={isSelected ? 1.5 : 0.5}
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => handleMouseDown(io.id, e)}
              onClick={(e) => { e.stopPropagation(); onSelectIO(io.id); }}
            />
            {/* Type abbreviation */}
            <text
              x={pos.boxX + pos.boxW / 2}
              y={pos.boxY + pos.boxH / 2 - 1.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={5}
              fill="#fff"
              fontWeight={700}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {IO_LABELS[io.type] ?? io.type}
            </text>
            {/* Direction arrow */}
            <text
              x={pos.boxX + pos.boxW / 2}
              y={pos.boxY + pos.boxH / 2 + 3.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={3}
              fill="rgba(255,255,255,0.7)"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {DIR_ARROWS[io.direction]}
            </text>
            {/* Label outside the box */}
            {io.label && (
              <text
                x={pos.boxX + pos.boxW / 2}
                y={io.edge === 'bottom' ? pos.boxY + pos.boxH + 5 : pos.boxY - 3}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={3.5}
                fill="#555"
                fontWeight={600}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {io.label}
              </text>
            )}
            {/* Specs line */}
            {(() => {
              const specs = io.direction === 'input'
                ? `${io.voltageV ?? 220}V / ${io.maxCurrentA ?? 63}A`
                : (io.consumptionA ? `${io.consumptionA}A` : '');
              if (!specs) return null;
              const specY = io.edge === 'bottom'
                ? pos.boxY + pos.boxH + (io.label ? 9 : 5)
                : pos.boxY - (io.label ? 7 : 3);
              return (
                <text
                  x={pos.boxX + pos.boxW / 2}
                  y={specY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={3.2}
                  fill="#666"
                  fontWeight={600}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {specs}
                </text>
              );
            })()}

            {/* Port dot for wiring */}
            <g
              data-wire-instance-id={instanceId}
              data-wire-port-id={portId}
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onPortMouseDown?.(instanceId, portId); }}
              onPointerUp={(e) => { e.stopPropagation(); onPortMouseUp?.(instanceId, portId); }}
              onClick={(e) => { e.stopPropagation(); onPortClick?.(instanceId, portId); }}
              onPointerEnter={() => onPortHover?.(instanceId, portId)}
              onPointerLeave={() => onPortLeave?.()}
            >
              {isWiringSource && (
                <circle cx={pos.portX} cy={pos.portY} r={DOT_R + 1.5} fill="none" stroke="#ffd600" strokeWidth={0.5} opacity={0.8}>
                  <animate attributeName="r" values={`${DOT_R + 1};${DOT_R + 2.5};${DOT_R + 1}`} dur="1s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={pos.portX}
                cy={pos.portY}
                r={DOT_R}
                fill={isConnected ? color : '#fff'}
                stroke={color}
                strokeWidth={0.5}
              />
            </g>

            {/* Connection line from box to port */}
            <line
              x1={pos.boxX + pos.boxW / 2}
              y1={io.edge === 'top' ? pos.boxY + pos.boxH : io.edge === 'bottom' ? pos.boxY : io.edge === 'left' ? pos.boxY + pos.boxH / 2 : pos.boxY + pos.boxH / 2}
              x2={pos.portX}
              y2={pos.portY}
              stroke={color}
              strokeWidth={0.6}
              opacity={0.6}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      })}
    </g>
  );
};
