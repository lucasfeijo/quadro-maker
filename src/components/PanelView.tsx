import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { usePanelStore } from '../store/panelStore';
import { resolveLayout } from '../utils/panelLayout';
import { cmToPx } from '../utils/geometry';
import { getModuleById } from '../data/modules';
import { DinRail } from './DinRail';
import { WireLayer } from './WireLayer';
import { PanelIOLayer } from './PanelIOLayer';
import { ExternalDeviceLayer, getExternalDeviceBounds } from './ExternalDeviceLayer';
import type { GhostPreview, ComponentState } from '../types';

const MARGIN = 15;

interface PanelViewProps {
  ghostPreview: GhostPreview | null;
  selectedModule: string | null;
  onSelectModule: (id: string | null) => void;
  onPortClick?: (instanceId: string, portId: string) => void;
  onPortHover?: (instanceId: string, portId: string) => void;
  onPortLeave?: () => void;
  hoverTarget?: { instanceId: string; portId: string } | null;
  simActive?: boolean;
  energizedWires?: Set<string>;
  simStates?: ComponentState[];
  onSimModeChange?: (instanceId: string, newMode: string) => void;
}

export const PanelView: React.FC<PanelViewProps> = ({
  ghostPreview,
  selectedModule,
  onSelectModule,
  onPortClick,
  onPortHover,
  onPortLeave,
  hoverTarget,
  simActive,
  energizedWires,
  simStates,
  onSimModeChange,
}) => {
  const state = usePanelStore();
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

  const contentBounds = useMemo(() => {
    let minX = 0;
    let minY = 0;
    let maxX = svgWidth;
    let maxY = svgHeight;

    for (const dev of state.externalDevices) {
      const bounds = getExternalDeviceBounds(dev);
      if (bounds) {
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
      }
    }

    return {
      x: minX - MARGIN,
      y: minY - MARGIN,
      w: maxX - minX + MARGIN * 2,
      h: maxY - minY + MARGIN * 2,
    };
  }, [svgWidth, svgHeight, state.externalDevices]);

  const contentBoundsRef = useRef(contentBounds);
  contentBoundsRef.current = contentBounds;

  const fitToContainer = useCallback(() => {
    const container = containerRef.current;
    const cb = contentBoundsRef.current;
    if (!container || cb.w <= 0 || cb.h <= 0) return;
    const cssPad = 20;
    const availW = container.clientWidth - cssPad * 2;
    const availH = container.clientHeight - cssPad * 2;
    if (availW <= 0 || availH <= 0) return;
    const fitZoom = Math.min(availW / cb.w, availH / cb.h);
    setZoom(Math.min(6, Math.max(0.1, fitZoom)));
  }, []);

  useEffect(() => {
    requestAnimationFrame(fitToContainer);
    const onResize = () => fitToContainer();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fitToContainer]);

  const handleClearSelection = useCallback(() => {
    onSelectModule(null);
    state.selectWire(null);
    state.selectIO(null);
    if (state.wiringFrom) state.cancelWiring();
  }, [onSelectModule, state]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (state.wiringFrom) { state.cancelWiring(); return; }
        if (state.selectedWireId) { state.selectWire(null); return; }
        if (state.selectedIOId) { state.selectIO(null); return; }
        if (selectedModule) { onSelectModule(null); return; }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        if (state.selectedWireId) {
          if (confirm('Remover fio?')) state.removeWire(state.selectedWireId);
          return;
        }
        if (state.selectedIOId) {
          if (confirm('Remover entrada/saída?')) state.removePanelIO(state.selectedIOId);
          return;
        }
        if (selectedModule) {
          const extDev = state.externalDevices.find((d) => d.instanceId === selectedModule);
          if (extDev) {
            const def = getModuleById(extDev.moduleId);
            if (confirm(`Remover ${extDev.label || def?.name || 'dispositivo'}?`)) {
              state.removeExternalDevice(selectedModule);
              onSelectModule(null);
            }
            return;
          }
          for (const row of state.rows) {
            const mod = row.modules.find((m) => m.instanceId === selectedModule);
            if (mod) {
              const def = getModuleById(mod.moduleId);
              if (confirm(`Remover ${mod.label || def?.name || 'módulo'}?`)) {
                state.removeModule(row.id, mod.instanceId);
                onSelectModule(null);
              }
              break;
            }
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
      setZoom((z) => Math.min(6, Math.max(0.1, z - e.deltaY * 0.002)));
    }
  }, []);

  const vb = contentBounds;
  const viewBox = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;

  return (
    <div
      ref={containerRef}
      className="panel-view-container"
      onClick={handleClearSelection}
      onWheel={handleWheel}
    >
      <div className="zoom-controls">
        <button onClick={() => setZoom((z) => Math.min(6, z + 0.2))}>+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.max(0.1, z - 0.2))}>-</button>
        <button onClick={fitToContainer} title="Ajustar ao container">⊡</button>
      </div>
      <svg
        width={vb.w * zoom}
        height={vb.h * zoom}
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
          <pattern id="grid-dots" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="0.3" fill="#ccc" />
          </pattern>
        </defs>

        {/* Workspace background with dot grid */}
        <rect
          x={vb.x}
          y={vb.y}
          width={vb.w}
          height={vb.h}
          fill="url(#grid-dots)"
        />

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
              onSelectModule={onSelectModule}
              ghostPreview={
                ghostPreview?.rowId === row.id ? ghostPreview : null
              }
              onPortClick={onPortClick}
              onPortHover={onPortHover}
              onPortLeave={onPortLeave}
              simStates={simActive ? simStates : undefined}
              onSimModeChange={simActive ? onSimModeChange : undefined}
            />
          );
        })}

        {/* Wires */}
        <WireLayer
          rails={layout.rails}
          interiorOffsetXPx={intX}
          interiorOffsetYPx={intY}
          svgWidth={vb.w}
          svgHeight={vb.h}
          padding={-vb.x}
          selectedWireId={state.selectedWireId}
          onSelectWire={(id) => state.selectWire(id)}
          hoverTarget={hoverTarget}
          energizedWires={simActive ? energizedWires : undefined}
        />

        {/* Panel I/O */}
        <PanelIOLayer
          svgWidth={svgWidth}
          svgHeight={svgHeight}
          selectedIOId={state.selectedIOId}
          onSelectIO={(id) => state.selectIO(id)}
          onPortClick={onPortClick}
          onPortHover={onPortHover}
          onPortLeave={onPortLeave}
        />

        {/* External Devices */}
        <ExternalDeviceLayer
          selectedDeviceId={selectedModule}
          onSelectDevice={onSelectModule}
          onPortClick={onPortClick}
          onPortHover={onPortHover}
          onPortLeave={onPortLeave}
          simStates={simActive ? simStates : undefined}
          onSimModeChange={simActive ? onSimModeChange : undefined}
        />
      </svg>
    </div>
  );
};
