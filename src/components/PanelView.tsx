import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { usePanelStore } from '../store/panelStore';
import { resolveLayout } from '../utils/panelLayout';
import { cmToPx } from '../utils/geometry';
import { DinRail } from './DinRail';
import type { GhostPreview } from '../types';

interface PanelViewProps {
  ghostPreview: GhostPreview | null;
}

export const PanelView: React.FC<PanelViewProps> = ({ ghostPreview }) => {
  const state = usePanelStore();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  const layout = useMemo(
    () =>
      resolveLayout({
        name: state.name,
        enclosureId: state.enclosureId,
        widthUnits: state.widthUnits,
        rowCount: state.rowCount,
        rows: state.rows,
      }),
    [state.enclosureId, state.widthUnits, state.rowCount, state.rows, state.name],
  );

  const svgWidth = cmToPx(layout.exteriorWidthCm);
  const svgHeight = cmToPx(layout.exteriorHeightCm);
  const intX = cmToPx(layout.interiorOffsetXCm);
  const intY = cmToPx(layout.interiorOffsetYCm);
  const intW = cmToPx(layout.interiorWidthCm);
  const intH = cmToPx(layout.interiorHeightCm);

  const handleClearSelection = useCallback(() => setSelectedModule(null), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedModule) {
        for (const row of state.rows) {
          const mod = row.modules.find(
            (m) => m.instanceId === selectedModule,
          );
          if (mod) {
            state.removeModule(row.id, mod.instanceId);
            setSelectedModule(null);
            break;
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedModule, state]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => Math.min(4, Math.max(0.3, z - e.deltaY * 0.002)));
    }
  }, []);

  const padding = 20;
  const viewBox = `${-padding} ${-padding} ${svgWidth + padding * 2} ${svgHeight + padding * 2}`;

  return (
    <div
      ref={containerRef}
      className="panel-view-container"
      onClick={handleClearSelection}
      onWheel={handleWheel}
    >
      <div className="zoom-controls">
        <button onClick={() => setZoom((z) => Math.min(4, z + 0.2))}>+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}>-</button>
      </div>
      <svg
        width={svgWidth * zoom}
        height={svgHeight * zoom}
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', margin: 'auto' }}
      >
        <defs>
          <pattern
            id="hatch"
            width="3"
            height="3"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="3" stroke="#999" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Exterior shell */}
        <rect
          x={0}
          y={0}
          width={svgWidth}
          height={svgHeight}
          rx={2}
          fill={layout.isEnclosure ? '#e0e0e0' : '#f5f5f5'}
          stroke="#999"
          strokeWidth={0.5}
        />

        {/* Interior area */}
        <rect
          x={intX}
          y={intY}
          width={intW}
          height={intH}
          fill="#fafafa"
          stroke="#bbb"
          strokeWidth={0.3}
        />

        {/* Mounting holes */}
        {layout.mountingHoles.map((hole, i) => (
          <circle
            key={i}
            cx={intX + cmToPx(hole.xCm)}
            cy={intY + cmToPx(hole.yCm)}
            r={hole.diameterMm / 2}
            fill="none"
            stroke="#999"
            strokeWidth={0.3}
          />
        ))}

        {/* DIN Rails */}
        {layout.rails.map((rail, i) => {
          const row = state.rows[i];
          if (!row) return null;
          return (
            <DinRail
              key={rail.id}
              rail={rail}
              row={row}
              interiorOffsetXPx={intX}
              interiorOffsetYPx={intY}
              selectedModule={selectedModule}
              onSelectModule={setSelectedModule}
              ghostPreview={
                ghostPreview?.rowId === row.id ? ghostPreview : null
              }
            />
          );
        })}
      </svg>
    </div>
  );
};
