import React from 'react';
import { PortDefinition } from '../types';
import { cmToPx } from '../utils/geometry';

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
  onPortHover: (instanceId: string, portId: string) => void;
  onPortLeave: () => void;
}

const RADIUS = 1.2;

export const PortDot: React.FC<Props> = ({
  port,
  moduleX,
  moduleY,
  moduleH,
  instanceId,
  isWiringSource,
  isConnected,
  onPortClick,
  onPortHover,
  onPortLeave,
}) => {
  const cx = moduleX + cmToPx(port.offsetXCm);
  const cy = port.side === 'top' ? moduleY - 1 : moduleY + moduleH + 1;
  const color = PORT_COLORS[port.type] ?? '#999';

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        onPortClick(instanceId, port.id);
      }}
      onMouseEnter={() => onPortHover(instanceId, port.id)}
      onMouseLeave={onPortLeave}
    >
      {isWiringSource && (
        <circle cx={cx} cy={cy} r={RADIUS + 1.5} fill="none" stroke="#ffd600" strokeWidth={0.5} opacity={0.8}>
          <animate attributeName="r" values={`${RADIUS + 1};${RADIUS + 2.5};${RADIUS + 1}`} dur="1s" repeatCount="indefinite" />
        </circle>
      )}
      <circle
        cx={cx}
        cy={cy}
        r={RADIUS}
        fill={isConnected ? color : '#fff'}
        stroke={color}
        strokeWidth={0.5}
      />
      <text
        x={cx}
        y={cy + (port.side === 'top' ? -2.5 : 3.5)}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={1.8}
        fill="#666"
        fontWeight={500}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {port.label}
      </text>
    </g>
  );
};
