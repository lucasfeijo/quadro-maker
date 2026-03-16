import React from 'react';
import { PortDefinition } from '../types';
import { mmToPx } from '../utils/geometry';

const PORT_COLORS: Record<string, string> = {
  phase: '#f44336',
  neutral: '#2196f3',
  ground: '#4caf50',
  any: '#ff9800',
};

interface Props {
  port: PortDefinition;
  moduleX: number;
  moduleY: number;
  moduleH: number;
  instanceId: string;
  isWiringSource: boolean;
  isConnected: boolean;
  onPortClick: (instanceId: string, portId: string) => void;
  onPortMouseDown?: (instanceId: string, portId: string) => void;
  onPortMouseUp?: (instanceId: string, portId: string) => void;
  onPortHover: (instanceId: string, portId: string) => void;
  onPortLeave: () => void;
}

const RADIUS = 2;

export const PortDot: React.FC<Props> = ({
  port,
  moduleX,
  moduleY,
  moduleH,
  instanceId,
  isWiringSource,
  isConnected,
  onPortClick,
  onPortMouseDown,
  onPortMouseUp,
  onPortHover,
  onPortLeave,
}) => {
  const hasVerticalOffset = port.offsetYMm !== undefined;
  const cx = moduleX + mmToPx(port.offsetXMm);
  const cy = hasVerticalOffset
    ? moduleY + mmToPx(port.offsetYMm!)
    : port.side === 'top'
      ? moduleY - 2
      : moduleY + moduleH + 2;
  const color = PORT_COLORS[port.type] ?? '#999';

  return (
    <g
      data-wire-instance-id={instanceId}
      data-wire-port-id={port.id}
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onPortMouseDown?.(instanceId, port.id);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onPortMouseUp?.(instanceId, port.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onPortClick(instanceId, port.id);
      }}
      onPointerEnter={() => onPortHover(instanceId, port.id)}
      onPointerLeave={onPortLeave}
    >
      {isWiringSource && (
        <circle cx={cx} cy={cy} r={RADIUS + 2} fill="none" stroke="#ffd600" strokeWidth={0.6} opacity={0.8}>
          <animate attributeName="r" values={`${RADIUS + 1.5};${RADIUS + 3};${RADIUS + 1.5}`} dur="1s" repeatCount="indefinite" />
        </circle>
      )}
      <circle
        cx={cx}
        cy={cy}
        r={RADIUS}
        fill={isConnected ? color : '#fff'}
        stroke={color}
        strokeWidth={0.6}
      />
      <text
        x={hasVerticalOffset ? cx + 5 : cx}
        y={hasVerticalOffset ? cy : cy + (port.side === 'top' ? -4 : 5)}
        textAnchor={hasVerticalOffset ? 'start' : 'middle'}
        dominantBaseline="middle"
        fontSize={3.2}
        fill="#444"
        fontWeight={600}
        stroke="#fff"
        strokeWidth={2}
        paintOrder="stroke"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {port.label}
      </text>
    </g>
  );
};
