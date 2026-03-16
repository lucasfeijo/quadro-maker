import React, { useState } from 'react';
import { PlacedModule, ComponentState } from '../types';
import { getModuleById } from '../data/modules';
import { mmToPx } from '../utils/geometry';
import { usePanelStore } from '../store/panelStore';
import { ModuleIcon } from './ModuleIcon';
import { PortDot } from './PortDot';
import { useDraggable } from '@dnd-kit/core';
import { getModeInfo, getNextMode, SIM_MODES } from '../engine/circuit';

interface Props {
  mod: PlacedModule;
  rowId: string;
  railUsableOffsetXPx: number;
  railYPx: number;
  selected: boolean;
  onSelect: (instanceId: string, additive?: boolean) => void;
  isDragging?: boolean;
  onPortClick?: (instanceId: string, portId: string) => void;
  onPortMouseDown?: (instanceId: string, portId: string) => void;
  onPortMouseUp?: (instanceId: string, portId: string) => void;
  onPortHover?: (instanceId: string, portId: string) => void;
  onPortLeave?: () => void;
  simState?: ComponentState;
  onSimModeChange?: (instanceId: string, newMode: string) => void;
}

const MODULE_HEIGHT_MM = 70;

export const ModuleBlock: React.FC<Props> = ({
  mod,
  rowId,
  railUsableOffsetXPx,
  railYPx,
  selected,
  onSelect,
  isDragging: isDraggingProp = false,
  onPortClick,
  onPortMouseDown,
  onPortMouseUp,
  onPortHover,
  onPortLeave,
  simState,
  onSimModeChange,
}) => {
  const def = getModuleById(mod.moduleId);
  const removeModule = usePanelStore((s) => s.removeModule);
  const updateLabel = usePanelStore((s) => s.updateLabel);
  const displayMode = usePanelStore((s) => s.displayMode);
  const wiringFrom = usePanelStore((s) => s.wiringFrom);
  const wires = usePanelStore((s) => s.wires);
  const [editing, setEditing] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging: isDraggingLocal } = useDraggable({
    id: `placed-${mod.instanceId}`,
    data: {
      type: 'placed-module',
      instanceId: mod.instanceId,
      moduleId: mod.moduleId,
      rowId,
    },
  });

  const dragging = isDraggingProp || isDraggingLocal;

  if (!def) return null;

  const x = railUsableOffsetXPx + mmToPx(mod.positionMm);
  const y = railYPx - mmToPx(MODULE_HEIGHT_MM / 2);
  const w = mmToPx(def.widthMm);
  const h = mmToPx(MODULE_HEIGHT_MM);
  const iconSize = Math.min(w * 0.6, h * 0.35);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm(`Remover ${mod.label || def.name}?`)) {
      removeModule(rowId, mod.instanceId);
    }
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
      ref={(el) => setNodeRef(el as unknown as HTMLElement | null)}
      {...listeners}
      {...attributes}
      className="module-block"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(mod.instanceId, e.ctrlKey || e.metaKey || e.shiftKey);
      }}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: dragging ? 'grabbing' : 'grab', opacity: dragging ? 0.3 : 1 }}
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
      <ModuleIcon
        icon={def.icon}
        imageUrl={def.imageUrl}
        displayMode={displayMode}
        size={iconSize}
        color="#fff"
        inline
        x={x + (w - iconSize) / 2}
        y={y + h * 0.08}
      />
      {def.widthMm >= 30 ? (
        <>
          <text
            x={x + w / 2}
            y={mod.label ? y + h * 0.62 : y + h * 0.7}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={Math.min(3.2, w * 0.35)}
            fontWeight={600}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {def.name}
          </text>
          {mod.label && (
            <text
              x={x + w / 2}
              y={y + h * 0.8}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.85)"
              fontSize={Math.min(2.8, w * 0.3)}
              fontWeight={500}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {mod.label}
            </text>
          )}
        </>
      ) : mod.label ? (
        <text
          x={x + w / 2}
          y={y + h * 0.7}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.9)"
          fontSize={Math.min(2.5, w * 0.6)}
          fontWeight={600}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          transform={`rotate(-90, ${x + w / 2}, ${y + h * 0.7})`}
        >
          {mod.label}
        </text>
      ) : null}
      <text
        x={x + w / 2}
        y={y + h * 0.92}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.55)"
        fontSize={2}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {def.widthMm}mm
      </text>
      {editing && (
        <foreignObject x={x - 10} y={y + h + 1} width={w + 20} height={10}>
          <input
            autoFocus
            defaultValue={mod.label ?? ''}
            style={{
              width: '100%',
              fontSize: '9px',
              textAlign: 'center',
              border: '1px solid #ffd600',
              background: '#333',
              color: '#fff',
              borderRadius: 2,
              padding: '1px 2px',
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
      )}
      {simState && (() => {
        const modes = SIM_MODES[def.category];
        if (!modes || modes.length <= 1) return null;
        const modeInfo = getModeInfo(def.category, simState.mode);
        if (!modeInfo) return null;
        const badgeW = Math.min(w - 2, 18);
        const badgeH = 5;
        const badgeX = x + (w - badgeW) / 2;
        const badgeY = y - badgeH - 3;
        return (
          <g
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onSimModeChange?.(mod.instanceId, getNextMode(def.category, simState.mode));
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
            {simState.voltageV > 0 && (
              <text
                x={badgeX + badgeW / 2}
                y={badgeY - 2.5}
                textAnchor="middle"
                fontSize={2.2}
                fontWeight={600}
                fill="#666"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {simState.voltageV.toFixed(0)}V {simState.currentA.toFixed(1)}A
              </text>
            )}
          </g>
        );
      })()}
      {def.ports.map((port) => {
        const isSource = wiringFrom?.instanceId === mod.instanceId && wiringFrom?.portId === port.id;
        const isConnected = wires.some(
          (w) =>
            (w.sourceInstanceId === mod.instanceId && w.sourcePortId === port.id) ||
            (w.targetInstanceId === mod.instanceId && w.targetPortId === port.id),
        );
        return (
          <PortDot
            key={port.id}
            port={port}
            moduleX={x}
            moduleY={y}
            moduleH={h}
            instanceId={mod.instanceId}
            isWiringSource={isSource}
            isConnected={isConnected}
            onPortClick={onPortClick ?? (() => {})}
            onPortMouseDown={onPortMouseDown}
            onPortMouseUp={onPortMouseUp}
            onPortHover={onPortHover ?? (() => {})}
            onPortLeave={onPortLeave ?? (() => {})}
          />
        );
      })}
    </g>
  );
};
