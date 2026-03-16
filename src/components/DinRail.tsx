import React from 'react';
import { ResolvedRail, PanelRow, GhostPreview, ComponentState } from '../types';
import { cmToPx } from '../utils/geometry';
import { ModuleBlock } from './ModuleBlock';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  rail: ResolvedRail;
  row: PanelRow;
  interiorOffsetXPx: number;
  interiorOffsetYPx: number;
  selectedModules: string[];
  onSelectModule: (instanceId: string, additive?: boolean) => void;
  ghostPreview: GhostPreview | null;
  onPortClick?: (instanceId: string, portId: string) => void;
  onPortMouseDown?: (instanceId: string, portId: string) => void;
  onPortMouseUp?: (instanceId: string, portId: string) => void;
  onPortHover?: (instanceId: string, portId: string) => void;
  onPortLeave?: () => void;
  simStates?: ComponentState[];
  onSimModeChange?: (instanceId: string, newMode: string) => void;
}

const RAIL_HEIGHT_CM = 1;
const MODULE_HEIGHT_CM = 7;
/** Barra física do trilho não vai até as bordas; recuo em cada extremidade (cm) */
const RAIL_BAR_END_INSET_CM = 1.5;

export const DinRail: React.FC<Props> = ({
  rail,
  row,
  interiorOffsetXPx,
  interiorOffsetYPx,
  selectedModules,
  onSelectModule,
  ghostPreview,
  onPortClick,
  onPortMouseDown,
  onPortMouseUp,
  onPortHover,
  onPortLeave,
  simStates,
  onSimModeChange,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `rail-${row.id}`,
    data: { rowId: row.id, rail },
  });

  const railLeftPx = interiorOffsetXPx + cmToPx(rail.xCm);
  const railTopPx = interiorOffsetYPx + cmToPx(rail.yCm);
  const railWidthPx = cmToPx(rail.widthCm);
  const railHeightPx = cmToPx(RAIL_HEIGHT_CM);
  const fixingPx = cmToPx(rail.fixingMarginCm);
  const usablePx = cmToPx(rail.usableWidthCm);
  const usableOffsetXPx = railLeftPx + fixingPx;

  // Barra física: recua das bordas (não vai até o final do interior)
  const railBarInsetPx = cmToPx(RAIL_BAR_END_INSET_CM);
  const railBarLeftPx = railLeftPx + railBarInsetPx;
  const railBarWidthPx = railWidthPx - railBarInsetPx * 2;

  const ghostX = ghostPreview
    ? usableOffsetXPx + cmToPx(ghostPreview.positionCm)
    : 0;
  const ghostW = ghostPreview ? cmToPx(ghostPreview.widthCm) : 0;
  const ghostH = cmToPx(MODULE_HEIGHT_CM);
  const ghostY = railTopPx + railHeightPx / 2 - ghostH / 2;

  const railCenterYPx = railTopPx + railHeightPx / 2;
  const labelSpacingPx = cmToPx(0.35);
  const heightLabelXPx = railBarLeftPx - labelSpacingPx;
  const lengthLabelYPx = railTopPx - labelSpacingPx;

  return (
    <g ref={(el) => setNodeRef(el as unknown as HTMLElement | null)}>
      {/* Rail height label (35mm) - rotated 90°, vertically aligned with rail */}
      <text
        className="rail-length-label"
        x={heightLabelXPx}
        y={railCenterYPx}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#607d8b"
        fontSize={2.2}
        transform={`rotate(-90, ${heightLabelXPx}, ${railCenterYPx})`}
      >
        35mm
      </text>

      {/* Rail length label - above top face, left-aligned, same spacing */}
      <text
        className="rail-length-label"
        x={railBarLeftPx + labelSpacingPx}
        y={lengthLabelYPx}
        textAnchor="start"
        dominantBaseline="auto"
        fill="#607d8b"
        fontSize={2.2}
      >
        {rail.usableWidthCm*10}mm
      </text>

      {/* Fixing margin left - hatched */}
      <rect
        x={railLeftPx}
        y={railTopPx - cmToPx(3.5)}
        width={fixingPx}
        height={cmToPx(8)}
        fill="url(#hatch)"
        opacity={0.25}
      />
      {/* Fixing margin right - hatched */}
      <rect
        x={railLeftPx + fixingPx + usablePx}
        y={railTopPx - cmToPx(3.5)}
        width={fixingPx}
        height={cmToPx(8)}
        fill="url(#hatch)"
        opacity={0.25}
      />

      {/* 1cm grid lines in usable area */}
      {Array.from({ length: rail.usableWidthCm + 1 }, (_, i) => (
        <line
          key={i}
          x1={usableOffsetXPx + cmToPx(i)}
          y1={railTopPx - cmToPx(3.5)}
          x2={usableOffsetXPx + cmToPx(i)}
          y2={railTopPx + cmToPx(4.5)}
          stroke={i % 3 === 0 ? '#ccc' : '#e8e8e8'}
          strokeWidth={i % 3 === 0 ? 0.3 : 0.15}
        />
      ))}

      {/* DIN rail bar (não vai até as bordas do interior) */}
      <rect
        x={railBarLeftPx}
        y={railTopPx}
        width={railBarWidthPx}
        height={railHeightPx}
        rx={0.3}
        fill="#b0bec5"
        stroke="#78909c"
        strokeWidth={0.3}
      />
      {/* Rail perforations */}
      {Array.from(
        { length: Math.floor(railBarWidthPx / cmToPx(2)) },
        (_, i) => (
          <rect
            key={i}
            x={railBarLeftPx + cmToPx(0.5) + i * cmToPx(2)}
            y={railTopPx + cmToPx(0.2)}
            width={cmToPx(1)}
            height={cmToPx(0.6)}
            rx={0.2}
            fill="#90a4ae"
          />
        ),
      )}

      {/* Drop zone highlight */}
      {isOver && (
        <rect
          x={usableOffsetXPx}
          y={railTopPx - cmToPx(3.5)}
          width={usablePx}
          height={cmToPx(8)}
          fill="#ffd600"
          opacity={0.07}
          rx={1}
        />
      )}

      {/* Ghost snap preview */}
      {ghostPreview && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={ghostX}
            y={ghostY}
            width={ghostW}
            height={ghostH}
            rx={1}
            fill={ghostPreview.color}
            opacity={ghostPreview.valid ? 0.3 : 0.12}
            stroke={ghostPreview.valid ? ghostPreview.color : '#f44336'}
            strokeWidth={ghostPreview.valid ? 0.8 : 1}
            strokeDasharray={ghostPreview.valid ? 'none' : '2 1'}
          />
          {/* Snap position indicator line */}
          <line
            x1={ghostX}
            y1={ghostY - 2}
            x2={ghostX}
            y2={ghostY + ghostH + 2}
            stroke={ghostPreview.valid ? ghostPreview.color : '#f44336'}
            strokeWidth={0.4}
            opacity={0.6}
          />
          {/* Position label */}
          <text
            x={ghostX + ghostW / 2}
            y={ghostY - 3}
            textAnchor="middle"
            fill={ghostPreview.valid ? '#333' : '#f44336'}
            fontSize={2.5}
            fontWeight={600}
            opacity={0.8}
          >
            {ghostPreview.positionCm}cm
            {!ghostPreview.valid && ' ✕'}
          </text>
        </g>
      )}

      {/* Placed modules */}
      {row.modules.map((mod) => (
        <ModuleBlock
          key={mod.instanceId}
          mod={mod}
          rowId={row.id}
          railUsableOffsetXPx={usableOffsetXPx}
          railYPx={railTopPx + railHeightPx / 2}
          selected={selectedModules.includes(mod.instanceId)}
          onSelect={onSelectModule}
          onPortClick={onPortClick}
          onPortMouseDown={onPortMouseDown}
          onPortMouseUp={onPortMouseUp}
          onPortHover={onPortHover}
          onPortLeave={onPortLeave}
          simState={simStates?.find((s) => s.instanceId === mod.instanceId)}
          onSimModeChange={onSimModeChange}
        />
      ))}
    </g>
  );
};
