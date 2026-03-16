import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { usePanelStore } from '../store/panelStore';
import { getModuleById } from '../data/modules';
import { simulate, getNextMode, getModeInfo, SIM_MODES, getDefaultMode } from '../engine/circuit';
import type { ManualOverride, ModeTimestamps } from '../engine/circuit';
import type { ComponentState } from '../types';

const IO_TYPE_LABELS: Record<string, string> = {
  phase: 'Fase',
  neutral: 'Neutro',
  ground: 'Terra',
  dc_pos: 'DC+',
  dc_neg: 'DC-',
  signal: 'Sinal',
};

const IO_COLORS: Record<string, string> = {
  phase: '#d32f2f',
  neutral: '#1565c0',
  ground: '#2e7d32',
  dc_pos: '#c62828',
  dc_neg: '#1a237e',
  signal: '#f57c00',
};

const ALERT_ICONS: Record<string, string> = {
  tripped: '⚠',
  'no-ground': '⏚',
  overload: '!',
  'short-circuit': '!',
  info: 'ℹ',
};

interface SimulationOverlayProps {
  onEnergizedWiresChange?: (wires: Set<string>, states: ComponentState[]) => void;
  onSimModeChange?: (handler: (instanceId: string, newMode: string) => void) => void;
}

export const SimulationOverlay: React.FC<SimulationOverlayProps> = ({ onEnergizedWiresChange, onSimModeChange }) => {
  const rows = usePanelStore((s) => s.rows);
  const wires = usePanelStore((s) => s.wires);
  const panelIOs = usePanelStore((s) => s.panelIOs);
  const externalDevices = usePanelStore((s) => s.externalDevices);

  const [overrides, setOverrides] = useState<Map<string, ManualOverride>>(new Map());
  const [tick, setTick] = useState(0);
  const modeTimestampsRef = useRef<ModeTimestamps>(new Map());

  const setMode = useCallback((instanceId: string, newMode: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(instanceId) ?? {};
      next.set(instanceId, { ...existing, mode: newMode });
      return next;
    });
  }, []);

  React.useEffect(() => {
    onSimModeChange?.(setMode);
  }, [onSimModeChange, setMode]);

  const cycleMode = useCallback((instanceId: string, category: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(instanceId);
      const currentMode = existing?.mode ?? getDefaultMode(category);
      const nextMode = getNextMode(category, currentMode);
      next.set(instanceId, { ...existing, mode: nextMode });
      return next;
    });
  }, []);

  const toggleModule = useCallback((instanceId: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      const current = next.get(instanceId);
      if (current?.on !== undefined) {
        next.set(instanceId, { ...current, on: !current.on });
      } else {
        const extDev = externalDevices.find((d) => d.instanceId === instanceId);
        const def = extDev ? getModuleById(extDev.moduleId) : null;
        const defaultOn = def?.category === 'switch' ? false : true;
        next.set(instanceId, { ...current, on: !defaultOn });
      }
      return next;
    });
  }, [externalDevices]);

  const resetAll = useCallback(() => {
    setOverrides(new Map());
    modeTimestampsRef.current = new Map();
  }, []);

  // Periodic tick for timer-based behaviors (1s interval)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const nowMs = Date.now();

  const result = useMemo(() => {
    const r = simulate(rows, wires, panelIOs, externalDevices, overrides, modeTimestampsRef.current, nowMs);

    // Update mode timestamps: track when each instance entered its current mode
    const ts = modeTimestampsRef.current;
    for (const st of r.states) {
      const existing = ts.get(st.instanceId);
      if (!existing || existing.mode !== st.mode) {
        ts.set(st.instanceId, { mode: st.mode, enteredAt: nowMs });
      }
    }

    onEnergizedWiresChange?.(r.energizedWires, r.states);
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, wires, panelIOs, externalDevices, overrides, onEnergizedWiresChange, tick]);

  const allModules = rows.flatMap((r) => r.modules);

  if (allModules.length === 0 && panelIOs.length === 0 && externalDevices.length === 0) {
    return (
      <div className="sim-overlay">
        <div className="sim-overlay-header">
          <h3>Simulação</h3>
        </div>
        <p className="sim-overlay-empty">Nenhum módulo no painel.</p>
      </div>
    );
  }

  const extDevIds = new Set(externalDevices.map((d) => d.instanceId));
  const moduleStates = result.states.filter((s) => !s.instanceId.startsWith('panel-io:') && !extDevIds.has(s.instanceId));
  const ioStates = result.states.filter((s) => s.instanceId.startsWith('panel-io:'));
  const extStates = result.states.filter((s) => extDevIds.has(s.instanceId));

  return (
    <div className="sim-overlay">
      <div className="sim-overlay-header">
        <h3>Simulação</h3>
        <button className="toolbar-btn sim-reset-btn" onClick={resetAll}>Resetar</button>
      </div>

      {result.alerts.length > 0 && (
        <div className="sim-overlay-alerts">
          {result.alerts.map((alert, i) => (
            <div key={i} className={`sim-alert-mini sim-alert-${alert.type}`}>
              <span>{ALERT_ICONS[alert.type] ?? 'ℹ'}</span>
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sim-overlay-stats">
        <span>{allModules.length} mod</span>
        <span>{wires.length} fios</span>
        <span>{result.energizedWires.size} energ.</span>
      </div>

      {ioStates.length > 0 && (
        <>
          <div className="sim-section-label">Entradas / Saídas</div>
          <div className="sim-overlay-list">
            {ioStates.map((state) => {
              const ioId = state.instanceId.replace('panel-io:', '');
              const io = panelIOs.find((i) => i.id === ioId);
              if (!io) return null;
              const color = IO_COLORS[io.type] ?? '#999';
              const energized = state.voltageV > 0;
              return (
                <div
                  key={state.instanceId}
                  className={`sim-item ${state.on ? (energized ? 'sim-item-on' : 'sim-item-on') : 'sim-item-off'}`}
                  onClick={() => toggleModule(state.instanceId)}
                  title="Clique para ligar/desligar"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sim-item-color" style={{ background: state.on ? color : '#555' }} />
                  <span className="sim-item-name">
                    {io.label || `${io.direction === 'input' ? 'E' : 'S'} ${IO_TYPE_LABELS[io.type] ?? io.type}`}
                  </span>
                  <span className="sim-item-status">
                    {state.on ? (energized ? `${state.voltageV.toFixed(0)}V` : 'ON') : 'OFF'}
                  </span>
                  <span className="sim-item-metrics">
                    {state.currentA.toFixed(1)}A
                    {io.direction === 'input' && io.maxCurrentA ? ` / ${io.maxCurrentA}A` : ''}
                    {io.direction === 'output' && io.consumptionA ? ` (${io.consumptionA}A)` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {moduleStates.length > 0 && (
        <>
          <div className="sim-section-label">Módulos</div>
          <div className="sim-overlay-list">
            {moduleStates.map((state) => {
              const mod = allModules.find((m) => m.instanceId === state.instanceId);
              if (!mod) return null;
              const def = getModuleById(mod.moduleId);
              if (!def) return null;
              const modeInfo = getModeInfo(def.category, state.mode);
              const modes = SIM_MODES[def.category];
              const hasModes = modes && modes.length > 1;

              return (
                <div
                  key={state.instanceId}
                  className={`sim-item ${state.tripped ? 'sim-item-tripped' : state.on ? 'sim-item-on' : 'sim-item-off'}`}
                  onClick={() => hasModes ? cycleMode(state.instanceId, def.category) : toggleModule(state.instanceId)}
                  title={hasModes ? `Clique para trocar estado (${modes.map((m) => m.label).join(' → ')})` : 'Clique para ligar/desligar'}
                >
                  <span className="sim-item-color" style={{ background: modeInfo?.color ?? def.color }} />
                  <span className="sim-item-name">{mod.label || def.name}</span>
                  <span className="sim-item-status" style={{ color: modeInfo?.color }}>
                    {modeInfo?.label ?? (state.on ? 'ON' : 'OFF')}
                  </span>
                  <span className="sim-item-metrics">
                    {state.voltageV.toFixed(0)}V {state.currentA.toFixed(1)}A
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {extStates.length > 0 && (
        <>
          <div className="sim-section-label">Dispositivos Externos</div>
          <div className="sim-overlay-list">
            {extStates.map((state) => {
              const dev = externalDevices.find((d) => d.instanceId === state.instanceId);
              if (!dev) return null;
              const def = getModuleById(dev.moduleId);
              if (!def) return null;
              const modeInfo = getModeInfo(def.category, state.mode);
              const modes = SIM_MODES[def.category];
              const hasModes = modes && modes.length > 1;

              return (
                <div
                  key={state.instanceId}
                  className={`sim-item ${state.on ? 'sim-item-on' : 'sim-item-off'}`}
                  onClick={() => hasModes ? cycleMode(state.instanceId, def.category) : toggleModule(state.instanceId)}
                  title={hasModes ? `Clique para trocar (${modes.map((m) => m.label).join(' → ')})` : 'Clique para ligar/desligar'}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sim-item-color" style={{ background: modeInfo?.color ?? '#555' }} />
                  <span className="sim-item-name">
                    {dev.label || def.name}
                  </span>
                  <span className="sim-item-status" style={{ color: modeInfo?.color }}>
                    {modeInfo?.label ?? (state.on ? 'ON' : 'OFF')}
                  </span>
                  <span className="sim-item-metrics">
                    {state.voltageV.toFixed(0)}V {state.currentA.toFixed(1)}A
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
