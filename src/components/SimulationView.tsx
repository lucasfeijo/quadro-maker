import React, { useMemo, useState, useCallback } from 'react';
import { usePanelStore } from '../store/panelStore';
import { getModuleById } from '../data/modules';
import { simulate } from '../engine/circuit';
import type { ComponentState } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  breaker: 'Disjuntor',
  dr: 'DR',
  dps: 'DPS',
  contactor: 'Contator',
  relay: 'Relé',
  timer: 'Temporizador',
  terminal: 'Borne',
  ats: 'ATS',
  switch: 'Interruptor',
  button: 'Botão',
};

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
}

export const SimulationOverlay: React.FC<SimulationOverlayProps> = ({ onEnergizedWiresChange }) => {
  const rows = usePanelStore((s) => s.rows);
  const wires = usePanelStore((s) => s.wires);
  const panelIOs = usePanelStore((s) => s.panelIOs);
  const externalDevices = usePanelStore((s) => s.externalDevices);

  const [overrides, setOverrides] = useState<Map<string, { on: boolean }>>(new Map());

  const toggleModule = useCallback((instanceId: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      const current = next.get(instanceId);
      if (current !== undefined) {
        next.set(instanceId, { on: !current.on });
      } else {
        const extDev = externalDevices.find((d) => d.instanceId === instanceId);
        const def = extDev ? getModuleById(extDev.moduleId) : null;
        const defaultOn = def?.category === 'switch' ? false : true;
        next.set(instanceId, { on: !defaultOn });
      }
      return next;
    });
  }, [externalDevices]);

  const resetAll = useCallback(() => setOverrides(new Map()), []);

  const result = useMemo(() => {
    const r = simulate(rows, wires, panelIOs, externalDevices, overrides);
    onEnergizedWiresChange?.(r.energizedWires, r.states);
    return r;
  }, [rows, wires, panelIOs, externalDevices, overrides, onEnergizedWiresChange]);

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

              return (
                <div
                  key={state.instanceId}
                  className={`sim-item ${state.tripped ? 'sim-item-tripped' : state.on ? 'sim-item-on' : 'sim-item-off'}`}
                  onClick={() => toggleModule(state.instanceId)}
                  title="Clique para ligar/desligar"
                >
                  <span className="sim-item-color" style={{ background: def.color }} />
                  <span className="sim-item-name">{mod.label || def.name}</span>
                  <span className="sim-item-status">
                    {state.tripped ? 'DISP' : state.on ? 'ON' : 'OFF'}
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
              const isSwitch = def.category === 'switch';
              const isButton = def.category === 'button';

              return (
                <div
                  key={state.instanceId}
                  className={`sim-item ${state.on ? 'sim-item-on' : 'sim-item-off'}`}
                  onClick={() => toggleModule(state.instanceId)}
                  title={isSwitch ? 'Clique para ligar/desligar interruptor' : isButton ? 'Clique para pressionar botão' : 'Clique para ligar/desligar'}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="sim-item-color" style={{ background: state.on ? def.color : '#555' }} />
                  <span className="sim-item-name">
                    {state.on ? '🟢 ' : '🔴 '}
                    {dev.label || def.name}
                  </span>
                  <span className="sim-item-status">
                    {state.on ? 'ON' : 'OFF'}
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
