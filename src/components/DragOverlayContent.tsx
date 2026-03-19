import React from 'react';
import { getModuleById } from '../data/modules';
import { mmToPx } from '../utils/geometry';
import { usePanelStore } from '../store/panelStore';
import { ModuleIcon } from './ModuleIcon';

interface Props {
  moduleId: string;
}

const DEFAULT_MODULE_HEIGHT_MM = 70;

export const DragOverlayContent: React.FC<Props> = ({ moduleId }) => {
  const def = getModuleById(moduleId);
  const displayMode = usePanelStore((s) => s.displayMode);
  if (!def) return null;

  const w = mmToPx(def.widthMm);
  const h = mmToPx(def.heightMm ?? DEFAULT_MODULE_HEIGHT_MM);
  const iconSize = Math.min(w * 0.6, h * 0.35);

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{
        opacity: 0.8,
        filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.35))',
        pointerEvents: 'none',
      }}
    >
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={1}
        fill={def.color}
        stroke="#fff"
        strokeWidth={0.5}
      />
      <ModuleIcon
        icon={def.icon}
        imageUrl={def.imageUrl}
        displayMode={displayMode}
        size={iconSize}
        color="#fff"
        inline
        x={(w - iconSize) / 2}
        y={h * 0.08}
      />
      {def.widthMm >= 30 && (
        <text
          x={w / 2}
          y={h * 0.7}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={3.2}
          fontWeight={600}
        >
          {def.name}
        </text>
      )}
      <text
        x={w / 2}
        y={h * 0.88}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.7)"
        fontSize={2.5}
      >
        {def.widthMm}mm
      </text>
    </svg>
  );
};
