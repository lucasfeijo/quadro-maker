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
  hideDropHighlight?: boolean;
  onPortClick?: (instanceId: string, portId: string) => void;
  onPortMouseDown?: (instanceId: string, portId: string) => void;
  onPortMouseUp?: (instanceId: string, portId: string) => void;
  onPortHover?: (instanceId: string, portId: string) => void;
  onPortLeave?: () => void;
  simStates?: ComponentState[];
  onSimModeChange?: (instanceId: string, newMode: string) => void;
}

const RAIL_HEIGHT_MM = 35;
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
  hideDropHighlight = false,
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

      {/* Top lip shadow (top 5mm casts shadow below) */}
      <rect
        x={railBarLeftPx}
        y={railTopPx + mmToPx(5)}
        width={railBarWidthPx}
        height={mmToPx(3)}
        fill="url(#rail-top-shadow)"
        style={{ pointerEvents: 'none' }}
      />

      {/* Bottom lip glare (bottom 5mm, glare on top edge) */}
      <rect
        x={railBarLeftPx}
        y={railTopPx + railHeightPx - mmToPx(5) - mmToPx(2)}
        width={railBarWidthPx}
        height={mmToPx(2)}
        fill="url(#rail-bottom-glare)"
        style={{ pointerEvents: 'none' }}
      />

      {/* Rail slots (hot-dog shaped, 18mm × 6mm, spaced 25mm center-to-center, starting at -9mm) */}
      {(() => {
        const slotW = mmToPx(18);
        const slotH = mmToPx(6);
        const slotSpacing = mmToPx(18 + 7); // 18mm slot + 7mm gap = 25mm pitch
        const slotStartX = railBarLeftPx + mmToPx(-9);
        const slotY = railTopPx + (railHeightPx - slotH) / 2;
        const slotRx = slotH / 2; // full round ends
        const count = Math.ceil((railBarWidthPx + mmToPx(9)) / slotSpacing) + 1;
        return (
          <g>
            <clipPath id={`rail-clip-${rail.id}`}>
              <rect x={railBarLeftPx + 0.3} y={railTopPx + 0.3} width={railBarWidthPx - 0.6} height={railHeightPx - 0.6} rx={0.3} />
            </clipPath>
            <g clipPath={`url(#rail-clip-${rail.id})`}>
              {Array.from({ length: count }, (_, i) => {
                const sx = slotStartX + i * slotSpacing;
                return (
                  <rect
                    key={i}
                    x={sx}
                    y={slotY}
                    width={slotW}
                    height={slotH}
                    rx={slotRx}
                    fill="#90a4ae"
                    stroke="#7d949e"
                    strokeWidth={0.2}
                  />
                );
              })}
            </g>
          </g>
        );
      })()}

      {/* Drop zone highlight */}
      {isOver && !hideDropHighlight && (
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
