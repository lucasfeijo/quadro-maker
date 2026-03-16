import React from 'react';
import { ResolvedRail, PanelRow, GhostPreview, ComponentState } from '../types';
import { mmToPx } from '../utils/geometry';
import { ModuleBlock } from './ModuleBlock';
import { useDroppable } from '@dnd-kit/core';
import { DIN_MODULE_1P_MM } from '../data/enclosures';

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

const RAIL_HEIGHT_MM = 10;
const MODULE_HEIGHT_MM = 70;
const RAIL_BAR_END_INSET_MM = 15;

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

  const railLeftPx = interiorOffsetXPx + mmToPx(rail.xMm);
  const railTopPx = interiorOffsetYPx + mmToPx(rail.yMm);
  const railWidthPx = mmToPx(rail.widthMm);
  const railHeightPx = mmToPx(RAIL_HEIGHT_MM);
  const fixingPx = mmToPx(rail.fixingMarginMm);
  const usablePx = mmToPx(rail.usableWidthMm);
  const usableOffsetXPx = railLeftPx + fixingPx;

  const railBarInsetPx = mmToPx(RAIL_BAR_END_INSET_MM);
  const railBarLeftPx = railLeftPx + railBarInsetPx;
  const railBarWidthPx = railWidthPx - railBarInsetPx * 2;

  const ghostX = ghostPreview
    ? usableOffsetXPx + mmToPx(ghostPreview.positionMm)
    : 0;
  const ghostW = ghostPreview ? mmToPx(ghostPreview.widthMm) : 0;
  const ghostH = mmToPx(MODULE_HEIGHT_MM);
  const ghostY = railTopPx + railHeightPx / 2 - ghostH / 2;

  const railCenterYPx = railTopPx + railHeightPx / 2;
  const labelSpacingPx = mmToPx(3.5);
  const heightLabelXPx = railBarLeftPx - labelSpacingPx;
  const lengthLabelYPx = railTopPx - labelSpacingPx;

  return (
    <g ref={(el) => setNodeRef(el as unknown as HTMLElement | null)}>
      {/* Rail height label (35mm) */}
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

      {/* Rail length label */}
      <text
        className="rail-length-label"
        x={railBarLeftPx + labelSpacingPx}
        y={lengthLabelYPx}
        textAnchor="start"
        dominantBaseline="auto"
        fill="#607d8b"
        fontSize={2.2}
      >
        {rail.usableWidthMm}mm
      </text>

      {/* Fixing margin left - hatched */}
      <rect
        x={railLeftPx}
        y={railTopPx - mmToPx(35)}
        width={fixingPx}
        height={mmToPx(80)}
        fill="url(#hatch)"
        opacity={0.25}
      />
      {/* Fixing margin right - hatched */}
      <rect
        x={railLeftPx + fixingPx + usablePx}
        y={railTopPx - mmToPx(35)}
        width={fixingPx}
        height={mmToPx(80)}
        fill="url(#hatch)"
        opacity={0.25}
      />

      {/* Grid: linhas menores a cada 1P, maiores a cada 3P */}
      {Array.from(
        { length: Math.floor(rail.usableWidthMm / DIN_MODULE_1P_MM) + 1 },
        (_, i) => {
          const xMm = i * DIN_MODULE_1P_MM;
          const isMajor = i % 3 === 0;
          return (
            <line
              key={i}
              x1={usableOffsetXPx + mmToPx(xMm)}
              y1={railTopPx - mmToPx(35)}
              x2={usableOffsetXPx + mmToPx(xMm)}
              y2={railTopPx + mmToPx(45)}
              stroke={isMajor ? '#ccc' : '#e8e8e8'}
              strokeWidth={isMajor ? 0.3 : 0.15}
            />
          );
        },
      )}

      {/* DIN rail bar */}
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
        { length: Math.floor(railBarWidthPx / mmToPx(20)) },
        (_, i) => (
          <rect
            key={i}
            x={railBarLeftPx + mmToPx(5) + i * mmToPx(20)}
            y={railTopPx + mmToPx(2)}
            width={mmToPx(10)}
            height={mmToPx(6)}
            rx={0.2}
            fill="#90a4ae"
          />
        ),
      )}

      {/* Drop zone highlight */}
      {isOver && (
        <rect
          x={usableOffsetXPx}
          y={railTopPx - mmToPx(35)}
          width={usablePx}
          height={mmToPx(80)}
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
          <line
            x1={ghostX}
            y1={ghostY - 2}
            x2={ghostX}
            y2={ghostY + ghostH + 2}
            stroke={ghostPreview.valid ? ghostPreview.color : '#f44336'}
            strokeWidth={0.4}
            opacity={0.6}
          />
          <text
            x={ghostX + ghostW / 2}
            y={ghostY - 3}
            textAnchor="middle"
            fill={ghostPreview.valid ? '#333' : '#f44336'}
            fontSize={2.5}
            fontWeight={600}
            opacity={0.8}
          >
            {ghostPreview.positionMm}mm
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
