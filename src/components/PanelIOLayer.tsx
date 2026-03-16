import React, { useCallback, useEffect, useRef, useState } from 'react';
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
const IO_SNAP_TOLERANCE = 2;

interface DimensionLine {
  x1: number; y1: number;
  x2: number; y2: number;
  label: string;
}

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
  onIODragChange?: (dragging: boolean) => void;
  wireAlignTargets?: Map<string, Array<{ x: number; y: number }>>;
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
  onIODragChange,
  wireAlignTargets,
}) => {
  const panelIOs = usePanelStore((s) => s.panelIOs);
  const wiringFrom = usePanelStore((s) => s.wiringFrom);
  const wires = usePanelStore((s) => s.wires);
  const movePanelIO = usePanelStore((s) => s.movePanelIO);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [eqGuides, setEqGuides] = useState<DimensionLine[]>([]);
  const [alignGuide, setAlignGuide] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const svgElRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    onIODragChange?.(draggingId != null);
  }, [draggingId, onIODragChange]);

  const handleMouseDown = useCallback(
    (ioId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const svgEl = (e.target as Element).closest('svg') as SVGSVGElement | null;
      svgElRef.current = svgEl;
      setDraggingId(ioId);
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingId) return;
      const svgEl = svgElRef.current ?? (e.target as Element).ownerSVGElement as SVGSVGElement | null;
      if (!svgEl) return;
      const svgPt = screenToSvg(svgEl, e.clientX, e.clientY);
      const { edge, positionPercent } = closestEdge(svgPt.x, svgPt.y, svgWidth, svgHeight);

      let finalPercent = positionPercent;
      const newGuides: DimensionLine[] = [];
      let newAlignGuide: { x1: number; y1: number; x2: number; y2: number } | null = null;
      let wireAlignFired = false;

      if (!e.shiftKey) {
        const isHEdge = edge === 'top' || edge === 'bottom';
        const totalLen = isHEdge ? svgWidth : svgHeight;
        const currentPx = (positionPercent / 100) * totalLen;

        // --- Wire-straight snap (highest priority) ---
        const targets = wireAlignTargets?.get(draggingId);
        if (targets && targets.length > 0) {
          let bestWireDist = IO_SNAP_TOLERANCE + 1;
          let bestWireTarget: { x: number; y: number } | null = null;
          let bestWirePos = currentPx;

          for (const t of targets) {
            const targetPx = isHEdge ? t.x : t.y;
            const d = Math.abs(currentPx - targetPx);
            if (d < bestWireDist) {
              bestWireDist = d;
              bestWirePos = targetPx;
              bestWireTarget = t;
            }
          }

          if (bestWireTarget && bestWireDist <= IO_SNAP_TOLERANCE) {
            wireAlignFired = true;
            finalPercent = Math.max(5, Math.min(95, (bestWirePos / totalLen) * 100));
            const snappedFrac = finalPercent / 100;
            if (isHEdge) {
              const portX = snappedFrac * svgWidth;
              const portY = edge === 'top' ? 38 : svgHeight - 38;
              newAlignGuide = { x1: portX, y1: portY, x2: bestWireTarget.x, y2: bestWireTarget.y };
            } else {
              const portY = snappedFrac * svgHeight;
              const portX = edge === 'left' ? 38 : svgWidth - 38;
              newAlignGuide = { x1: portX, y1: portY, x2: bestWireTarget.x, y2: bestWireTarget.y };
            }
          }
        }

        // --- Equidistant snap (only if wire-straight didn't fire) ---
        if (!wireAlignFired) {
          const sameEdgeIOs = panelIOs.filter(io => io.id !== draggingId && io.edge === edge);
          const coords = [...new Set(sameEdgeIOs.map(io => (io.positionPercent / 100) * totalLen))].sort((a, b) => a - b);

          let bestDist = IO_SNAP_TOLERANCE + 1;
          let bestPos = currentPx;
          let bestSegs: [number, number, number] | null = null;

          for (let i = 0; i < coords.length; i++) {
            for (let j = i + 1; j < coords.length; j++) {
              const gap = coords[j] - coords[i];
              if (gap < 3) continue;
              const candidates: Array<{ pos: number; segs: [number, number, number] }> = [
                { pos: coords[i] - gap, segs: [coords[i] - gap, coords[i], coords[j]] },
                { pos: (coords[i] + coords[j]) / 2, segs: [coords[i], (coords[i] + coords[j]) / 2, coords[j]] },
                { pos: coords[j] + gap, segs: [coords[i], coords[j], coords[j] + gap] },
              ];
              for (const cand of candidates) {
                const d = Math.abs(currentPx - cand.pos);
                if (d < bestDist) {
                  bestDist = d;
                  bestPos = cand.pos;
                  bestSegs = cand.segs;
                }
              }
            }
          }

          if (bestSegs && bestDist <= IO_SNAP_TOLERANCE) {
            finalPercent = Math.max(5, Math.min(95, (bestPos / totalLen) * 100));
            const [s1, s2, s3] = bestSegs;
            const gapMm = Math.abs(s2 - s1);
            const label = gapMm % 1 < 0.05 ? `${Math.round(gapMm)} mm` : `${gapMm.toFixed(1)} mm`;

            if (isHEdge) {
              const ly = edge === 'top' ? 30 : svgHeight - 30;
              newGuides.push(
                { x1: s1, y1: ly, x2: s2, y2: ly, label },
                { x1: s2, y1: ly, x2: s3, y2: ly, label },
              );
            } else {
              const lx = edge === 'left' ? 29 : svgWidth - 29;
              newGuides.push(
                { x1: lx, y1: s1, x2: lx, y2: s2, label },
                { x1: lx, y1: s2, x2: lx, y2: s3, label },
              );
            }
          }
        }
      }

      setEqGuides(newGuides);
      setAlignGuide(newAlignGuide);
      movePanelIO(draggingId, edge, finalPercent);
    },
    [draggingId, panelIOs, svgWidth, svgHeight, movePanelIO, wireAlignTargets],
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
    setEqGuides([]);
    setAlignGuide(null);
  }, []);

  return (
    <g
      className="panel-io-layer"
      onMouseMove={draggingId ? handleMouseMove : undefined}
      onMouseUp={draggingId ? handleMouseUp : undefined}
      onMouseLeave={draggingId ? handleMouseUp : undefined}
    >
      {draggingId && (
        <rect
          x={-svgWidth} y={-svgHeight}
          width={svgWidth * 3} height={svgHeight * 3}
          fill="transparent"
          style={{ pointerEvents: 'all' }}
        />
      )}
      {panelIOs.map((io) => {
        const pos = getIOPosition(io, svgWidth, svgHeight);
        const color = io.customColor ?? IO_COLORS[io.type] ?? '#999';
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
                y={io.edge === 'bottom' ? pos.boxY + pos.boxH + 5.5 : pos.boxY - 3.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={3.8}
                fill="#333"
                fontWeight={600}
                stroke="#fff"
                strokeWidth={2.5}
                paintOrder="stroke"
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
                ? pos.boxY + pos.boxH + (io.label ? 10 : 5.5)
                : pos.boxY - (io.label ? 8 : 3.5);
              return (
                <text
                  x={pos.boxX + pos.boxW / 2}
                  y={specY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={3}
                  fill="#666"
                  fontWeight={600}
                  stroke="#fff"
                  strokeWidth={2}
                  paintOrder="stroke"
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

      {/* Wire-straight alignment guide */}
      {alignGuide && (
        <g style={{ pointerEvents: 'none' }}>
          <line
            x1={alignGuide.x1} y1={alignGuide.y1}
            x2={alignGuide.x2} y2={alignGuide.y2}
            stroke="#42a5f5" strokeWidth={0.3}
            strokeDasharray="1.5 1" opacity={0.8}
          />
          <circle
            cx={alignGuide.x2} cy={alignGuide.y2}
            r={1.2} fill="none" stroke="#42a5f5"
            strokeWidth={0.3} opacity={0.8}
          />
        </g>
      )}

      {/* Equidistant dimension lines */}
      {eqGuides.map((line, i) => {
        const ldx = line.x2 - line.x1;
        const ldy = line.y2 - line.y1;
        const lLen = Math.sqrt(ldx * ldx + ldy * ldy);
        if (lLen < 2) return null;
        const ux = ldx / lLen;
        const uy = ldy / lLen;
        const px = -uy;
        const py = ux;
        const a = 1.5;
        const midX = (line.x1 + line.x2) / 2;
        const midY = (line.y1 + line.y2) / 2;

        const arrowStart = [
          `M ${line.x1 + ux * a + px * a * 0.5} ${line.y1 + uy * a + py * a * 0.5}`,
          `L ${line.x1} ${line.y1}`,
          `L ${line.x1 + ux * a - px * a * 0.5} ${line.y1 + uy * a - py * a * 0.5}`,
        ].join(' ');
        const arrowEnd = [
          `M ${line.x2 - ux * a + px * a * 0.5} ${line.y2 - uy * a + py * a * 0.5}`,
          `L ${line.x2} ${line.y2}`,
          `L ${line.x2 - ux * a - px * a * 0.5} ${line.y2 - uy * a - py * a * 0.5}`,
        ].join(' ');

        return (
          <g key={`eq-guide-${i}`} style={{ pointerEvents: 'none' }}>
            <line
              x1={line.x1} y1={line.y1}
              x2={line.x2} y2={line.y2}
              stroke="#ff9800" strokeWidth={0.3} opacity={0.9}
            />
            <path d={arrowStart} stroke="#ff9800" strokeWidth={0.3} fill="none" opacity={0.9} />
            <path d={arrowEnd} stroke="#ff9800" strokeWidth={0.3} fill="none" opacity={0.9} />
            <text
              x={midX + px * 3} y={midY + py * 3}
              textAnchor="middle" dominantBaseline="central"
              fontSize={2.5} fontWeight={600}
              fill="#ff9800" stroke="#fff" strokeWidth={2} paintOrder="stroke"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {line.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};
