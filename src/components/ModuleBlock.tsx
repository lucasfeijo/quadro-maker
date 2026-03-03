import React, { useState } from 'react';
import { PlacedModule } from '../types';
import { getModuleById } from '../data/modules';
import { cmToPx } from '../utils/geometry';
import { usePanelStore } from '../store/panelStore';

interface Props {
  mod: PlacedModule;
  rowId: string;
  railUsableOffsetXPx: number;
  railYPx: number;
  selected: boolean;
  onSelect: (instanceId: string) => void;
}

const MODULE_HEIGHT_CM = 7;

export const ModuleBlock: React.FC<Props> = ({
  mod,
  rowId,
  railUsableOffsetXPx,
  railYPx,
  selected,
  onSelect,
}) => {
  const def = getModuleById(mod.moduleId);
  const removeModule = usePanelStore((s) => s.removeModule);
  const updateLabel = usePanelStore((s) => s.updateLabel);
  const [editing, setEditing] = useState(false);

  if (!def) return null;

  const x = railUsableOffsetXPx + cmToPx(mod.positionCm);
  const y = railYPx - cmToPx(MODULE_HEIGHT_CM / 2);
  const w = cmToPx(def.widthCm);
  const h = cmToPx(MODULE_HEIGHT_CM);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    removeModule(rowId, mod.instanceId);
  };

  const handleDoubleClick = () => {
    setEditing(true);
  };

  const handleLabelSubmit = (value: string) => {
    updateLabel(rowId, mod.instanceId, value);
    setEditing(false);
  };

  return (
    <g
      className="module-block"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(mod.instanceId);
      }}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: 'grab' }}
      data-instance-id={mod.instanceId}
      data-module-id={mod.moduleId}
      data-row-id={rowId}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={1}
        fill={def.color}
        stroke={selected ? '#ffd600' : '#222'}
        strokeWidth={selected ? 1.5 : 0.5}
        opacity={0.92}
      />
      {/* Module name */}
      <text
        x={x + w / 2}
        y={y + h / 2 - 3}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={3.2}
        fontWeight={600}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {def.widthCm >= 3 ? def.name : ''}
      </text>
      {/* Width indicator */}
      <text
        x={x + w / 2}
        y={y + h / 2 + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.7)"
        fontSize={2.5}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {def.widthCm}cm
      </text>
      {/* Label below module */}
      {editing ? (
        <foreignObject x={x} y={y + h + 1} width={w} height={8}>
          <input
            autoFocus
            defaultValue={mod.label ?? ''}
            style={{
              width: '100%',
              fontSize: '8px',
              textAlign: 'center',
              border: '1px solid #ffd600',
              background: '#333',
              color: '#fff',
              borderRadius: 2,
              padding: 0,
              outline: 'none',
            }}
            onBlur={(e) => handleLabelSubmit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                handleLabelSubmit((e.target as HTMLInputElement).value);
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        </foreignObject>
      ) : mod.label ? (
        <text
          x={x + w / 2}
          y={y + h + 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#555"
          fontSize={2.8}
          fontWeight={500}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {mod.label}
        </text>
      ) : null}
    </g>
  );
};
