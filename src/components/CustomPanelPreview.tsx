import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ResolvedLayout, ResolvedRail } from '../types';
import { DIN_MODULE_1P_MM } from '../data/enclosures';

const RAIL_HEIGHT_MM = 35;
const RAIL_BAR_END_INSET_MM = 15;
const HANDLE_SIZE_MM = 8;
const SNAP_THRESHOLD_MM = 5;
const MIN_RAIL_GAP_MM = 40;
const PADDING_MM = 25;
const MAX_EXTERIOR_MM = 1000;

interface Props {
  layout: ResolvedLayout;
  defaultLayout: ResolvedLayout;
  railYOverrides: Record<string, number>;
  onResizeExterior: (widthMm: number, heightMm: number) => void;
  onRailYChange: (railId: string, yMm: number) => void;
  onRailYReset: (railId: string) => void;
}

function screenToSvgMm(svgEl: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

function RailVisual({ rail, intX, intY, opacity = 1, clipPrefix = '' }: {
  rail: ResolvedRail;
  intX: number;
  intY: number;
  opacity?: number;
  clipPrefix?: string;
}) {
  const railLeft = intX + rail.xMm;
  const railTop = intY + rail.yMm;
  const railWidth = rail.widthMm;
  const fixing = rail.fixingMarginMm;
  const usableOffset = railLeft + fixing;
  const railBarInset = RAIL_BAR_END_INSET_MM;
  const railBarLeft = railLeft + railBarInset;
  const railBarWidth = railWidth - railBarInset * 2;
  const railCenter = railTop + RAIL_HEIGHT_MM / 2;

  const slotW = 18;
  const slotH = 6;
  const slotSpacing = 25;
  const slotStartX = railBarLeft - 9;
  const slotY = railTop + (RAIL_HEIGHT_MM - slotH) / 2;
  const slotRx = slotH / 2;
  const slotCount = Math.ceil((railBarWidth + 9) / slotSpacing) + 1;
  const clipId = `${clipPrefix}preview-rail-clip-${rail.id}`;

  return (
    <g opacity={opacity}>
      {/* 1P/3P grid lines */}
      {Array.from(
        { length: Math.floor(rail.usableWidthMm / DIN_MODULE_1P_MM) + 1 },
        (_, i) => {
          const xMm = i * DIN_MODULE_1P_MM;
          const isMajor = i % 3 === 0;
          return (
            <line
              key={i}
              x1={usableOffset + xMm}
              y1={railCenter - 40}
              x2={usableOffset + xMm}
              y2={railCenter + 40}
              stroke={isMajor ? '#ccc' : '#e8e8e8'}
              strokeWidth={isMajor ? 0.3 : 0.15}
            />
          );
        },
      )}
      {/* Rail bar */}
      <rect
        x={railBarLeft}
        y={railTop}
        width={railBarWidth}
        height={RAIL_HEIGHT_MM}
        rx={0.3}
        fill="#b0bec5"
        stroke="#78909c"
        strokeWidth={0.3}
      />
      {/* Top lip shadow */}
      <rect
        x={railBarLeft}
        y={railTop + 5}
        width={railBarWidth}
        height={3}
        fill="url(#preview-rail-top-shadow)"
        style={{ pointerEvents: 'none' }}
      />
      {/* Bottom lip glare */}
      <rect
        x={railBarLeft}
        y={railTop + RAIL_HEIGHT_MM - 5 - 2}
        width={railBarWidth}
        height={2}
        fill="url(#preview-rail-bottom-glare)"
        style={{ pointerEvents: 'none' }}
      />
      {/* Rail slots */}
      <defs>
        <clipPath id={clipId}>
          <rect x={railBarLeft + 0.3} y={railTop + 0.3} width={railBarWidth - 0.6} height={RAIL_HEIGHT_MM - 0.6} rx={0.3} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {Array.from({ length: slotCount }, (_, i) => (
          <rect
            key={i}
            x={slotStartX + i * slotSpacing}
            y={slotY}
            width={slotW}
            height={slotH}
            rx={slotRx}
            fill="#90a4ae"
            stroke="#7d949e"
            strokeWidth={0.2}
          />
        ))}
      </g>
    </g>
  );
}

export const CustomPanelPreview: React.FC<Props> = ({
  layout,
  defaultLayout,
  railYOverrides,
  onResizeExterior,
  onRailYChange,
  onRailYReset,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const [draggingEdge, setDraggingEdge] = useState<{
    axis: 'x' | 'y';
    startClientX: number;
    startClientY: number;
    startWidth: number;
    startHeight: number;
    pxPerMm: number; // frozen scale at drag start
  } | null>(null);
  const [draggingRail, setDraggingRail] = useState<{
    railId: string;
    startMouseY: number;
    startYMm: number;
  } | null>(null);
  const shiftHeldRef = useRef(false);
  const [shiftHeld, setShiftHeld] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      shiftHeldRef.current = e.shiftKey;
      setShiftHeld(e.shiftKey);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

  const { exteriorWidthMm: W, exteriorHeightMm: H, interiorOffsetXMm: intX, interiorOffsetYMm: intY, interiorWidthMm: intW, interiorHeightMm: intH } = layout;

  const vbX = -PADDING_MM;
  const vbY = -PADDING_MM;
  const vbW = W + PADDING_MM * 2;
  const vbH = H + PADDING_MM * 2;

  // Default rail Y positions for snap targets
  const defaultRailY: Record<string, number> = {};
  for (const r of defaultLayout.rails) {
    defaultRailY[r.id] = r.yMm;
  }

  const getMm = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    return screenToSvgMm(svgRef.current, e.clientX, e.clientY);
  }, []);

  // --- Edge drag ---
  const handleEdgeDown = useCallback((axis: 'x' | 'y', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Freeze the px-per-mm scale at drag start so resizing the viewBox doesn't cause feedback
    let pxPerMm = 1;
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const currentVbW = W + PADDING_MM * 2;
      const currentVbH = H + PADDING_MM * 2;
      // preserveAspectRatio="xMidYMid meet" → uniform scale = min of both axes
      pxPerMm = Math.min(rect.width / currentVbW, rect.height / currentVbH);
    }
    setDraggingEdge({ axis, startClientX: e.clientX, startClientY: e.clientY, startWidth: W, startHeight: H, pxPerMm });
  }, [W, H]);

  // --- Rail drag ---
  const handleRailDown = useCallback((railId: string, currentY: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const pt = getMm(e);
    setDraggingRail({ railId, startMouseY: pt.y, startYMm: currentY });
  }, [getMm]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingEdge) {
      const { axis, startClientX, startClientY, startWidth, startHeight, pxPerMm } = draggingEdge;
      if (axis === 'x') {
        const deltaPx = e.clientX - startClientX;
        const deltaMm = deltaPx / pxPerMm;
        const newW = Math.min(MAX_EXTERIOR_MM, Math.max(defaultLayout.exteriorWidthMm, Math.round(startWidth + deltaMm * 2)));
        onResizeExterior(newW, layout.exteriorHeightMm);
      } else {
        const deltaPx = e.clientY - startClientY;
        const deltaMm = deltaPx / pxPerMm;
        const newH = Math.min(MAX_EXTERIOR_MM, Math.max(defaultLayout.exteriorHeightMm, Math.round(startHeight + deltaMm * 2)));
        onResizeExterior(layout.exteriorWidthMm, newH);
      }
      return;
    }

    if (draggingRail) {
      const pt = getMm(e);
      const { railId, startMouseY, startYMm } = draggingRail;
      const deltaY = pt.y - startMouseY;
      let newY = startYMm + deltaY;

      // Clamp within interior
      newY = Math.max(0, Math.min(intH - RAIL_HEIGHT_MM, newY));

      // Clamp to not overlap other rails
      const otherRails = layout.rails.filter(r => r.id !== railId);
      for (const other of otherRails) {
        const otherY = railYOverrides[other.id] ?? defaultRailY[other.id] ?? other.yMm;
        if (newY < otherY && newY + RAIL_HEIGHT_MM + MIN_RAIL_GAP_MM > otherY) {
          newY = otherY - RAIL_HEIGHT_MM - MIN_RAIL_GAP_MM;
        }
        if (newY > otherY && otherY + RAIL_HEIGHT_MM + MIN_RAIL_GAP_MM > newY) {
          newY = otherY + RAIL_HEIGHT_MM + MIN_RAIL_GAP_MM;
        }
      }
      newY = Math.max(0, Math.min(intH - RAIL_HEIGHT_MM, newY));

      // Snap to default position
      const defY = defaultRailY[railId];
      if (!shiftHeldRef.current && defY != null && Math.abs(newY - defY) < SNAP_THRESHOLD_MM) {
        onRailYChange(railId, defY);
      } else {
        onRailYChange(railId, Math.round(newY));
      }
      return;
    }
  }, [draggingEdge, draggingRail, getMm, layout, defaultLayout, intH, railYOverrides, defaultRailY, onResizeExterior, onRailYChange]);

  const handleMouseUp = useCallback(() => {
    if (draggingRail) {
      const { railId } = draggingRail;
      const defY = defaultRailY[railId];
      const overrideY = railYOverrides[railId];
      if (defY != null && overrideY != null && Math.abs(overrideY - defY) < 0.5) {
        onRailYReset(railId);
      }
    }
    setDraggingEdge(null);
    setDraggingRail(null);
  }, [draggingRail, defaultRailY, railYOverrides, onRailYReset]);

  const isDragging = draggingEdge != null || draggingRail != null;
  const edgeHighlight = '#42a5f5';

  return (
    <div className="custom-panel-preview">
      <svg
        ref={svgRef}
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={isDragging ? handleMouseMove : undefined}
        onMouseUp={isDragging ? handleMouseUp : undefined}
        onMouseLeave={isDragging ? handleMouseUp : undefined}
        style={{ cursor: draggingEdge ? (draggingEdge.axis === 'x' ? 'ew-resize' : 'ns-resize') : draggingRail ? 'ns-resize' : undefined }}
      >
        <defs>
          <linearGradient id="preview-rail-top-shadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="preview-rail-bottom-glare" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Full-area drag capture rect */}
        {isDragging && (
          <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="transparent" style={{ pointerEvents: 'all' }} />
        )}

        {/* Exterior shell */}
        <rect x={0} y={0} width={W} height={H} rx={2} fill="#f5f5f5" stroke="#999" strokeWidth={1.5} />

        {/* Interior area */}
        <rect x={intX} y={intY} width={intW} height={intH} fill="#fafafa" />

        {/* Dimension labels */}
        <text
          x={W / 2} y={-6}
          textAnchor="middle" dominantBaseline="auto"
          fill="#607d8b" fontSize={8} fontWeight={600}
        >
          {W}mm
        </text>
        <text
          x={-6} y={H / 2}
          textAnchor="middle" dominantBaseline="middle"
          fill="#607d8b" fontSize={8} fontWeight={600}
          transform={`rotate(-90, ${-6}, ${H / 2})`}
        >
          {H}mm
        </text>

        {/* Rails */}
        {layout.rails.map((rail) => {
          const isBeingDragged = draggingRail?.railId === rail.id;
          const defY = defaultRailY[rail.id];

          return (
            <g key={rail.id}>
              {/* Ghost at default position when dragging */}
              {isBeingDragged && defY != null && (
                <RailVisual
                  rail={{ ...rail, yMm: defY }}
                  intX={intX}
                  intY={intY}
                  opacity={0.15}
                  clipPrefix="ghost-"
                />
              )}

              {/* Red center axis when snapped to default */}
              {isBeingDragged && defY != null && Math.abs(rail.yMm - defY) < 0.5 && (
                <line
                  x1={intX}
                  y1={intY + defY + RAIL_HEIGHT_MM / 2}
                  x2={intX + intW}
                  y2={intY + defY + RAIL_HEIGHT_MM / 2}
                  stroke="#e53935"
                  strokeWidth={0.8}
                  opacity={0.7}
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Actual rail */}
              <RailVisual
                rail={rail}
                intX={intX}
                intY={intY}
                opacity={isBeingDragged ? 0.7 : 1}
              />

              {/* Drag handle */}
              <rect
                x={intX + rail.xMm}
                y={intY + rail.yMm - 4}
                width={rail.widthMm}
                height={RAIL_HEIGHT_MM + 8}
                fill="transparent"
                style={{ cursor: 'ns-resize', pointerEvents: 'all' }}
                onMouseDown={(e) => handleRailDown(rail.id, rail.yMm, e)}
              />
            </g>
          );
        })}

        {/* Edge handles - top/bottom (ns-resize) */}
        {(['top', 'bottom'] as const).map((edge) => {
          const y = edge === 'top' ? -HANDLE_SIZE_MM / 2 : H - HANDLE_SIZE_MM / 2;
          const isHovered = hoverEdge === edge;
          return (
            <g key={edge}>
              {(isHovered || draggingEdge?.axis === 'y') && (
                <line
                  x1={0} y1={edge === 'top' ? 0 : H}
                  x2={W} y2={edge === 'top' ? 0 : H}
                  stroke={edgeHighlight} strokeWidth={2} opacity={0.6}
                />
              )}
              <rect
                x={-HANDLE_SIZE_MM}
                y={y}
                width={W + HANDLE_SIZE_MM * 2}
                height={HANDLE_SIZE_MM}
                fill="transparent"
                style={{ cursor: 'ns-resize' }}
                onMouseEnter={() => setHoverEdge(edge)}
                onMouseLeave={() => setHoverEdge(null)}
                onMouseDown={(e) => handleEdgeDown('y', e)}
              />
            </g>
          );
        })}

        {/* Edge handles - left/right (ew-resize) */}
        {(['left', 'right'] as const).map((edge) => {
          const x = edge === 'left' ? -HANDLE_SIZE_MM / 2 : W - HANDLE_SIZE_MM / 2;
          const isHovered = hoverEdge === edge;
          return (
            <g key={edge}>
              {(isHovered || draggingEdge?.axis === 'x') && (
                <line
                  x1={edge === 'left' ? 0 : W} y1={0}
                  x2={edge === 'left' ? 0 : W} y2={H}
                  stroke={edgeHighlight} strokeWidth={2} opacity={0.6}
                />
              )}
              <rect
                x={x}
                y={-HANDLE_SIZE_MM}
                width={HANDLE_SIZE_MM}
                height={H + HANDLE_SIZE_MM * 2}
                fill="transparent"
                style={{ cursor: 'ew-resize' }}
                onMouseEnter={() => setHoverEdge(edge)}
                onMouseLeave={() => setHoverEdge(null)}
                onMouseDown={(e) => handleEdgeDown('x', e)}
              />
            </g>
          );
        })}

        {/* Shift-snap tooltip — only during rail drag without shift */}
        {draggingRail && !shiftHeld && (
          <text
            x={W / 2}
            y={H + PADDING_MM - 4}
            textAnchor="middle"
            dominantBaseline="auto"
            fill="#999"
            fontSize={6}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            Segure Shift para desativar snap
          </text>
        )}
      </svg>
    </div>
  );
};
