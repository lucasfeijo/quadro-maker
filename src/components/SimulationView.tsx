import React, { useMemo, useState, useCallback } from 'react';
import { usePanelStore } from '../store/panelStore';
import { getModuleById } from '../data/modules';
import { simulate, SimAlert } from '../engine/circuit';
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
};

export const SimulationView: React.FC = () => {
  const rows = usePanelStore((s) => s.rows);
  const wires = usePanelStore((s) => s.wires);
  const busbars = usePanelStore((s) => s.busbars);

  const [overrides, setOverrides] = useState<Map<string, { on: boolean }>>(new Map());

  const toggleModule = useCallback((instanceId: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      const current = next.get(instanceId);
      next.set(instanceId, { on: !(current?.on ?? true) });
      return next;
    });
  }, []);

  const resetAll = useCallback(() => setOverrides(new Map()), []);

  const result = useMemo(
    () => simulate(rows, wires, busbars, overrides),
    [rows, wires, busbars, overrides],
  );

  const allModules = rows.flatMap((r) => r.modules);

  if (allModules.length === 0) {
    return (
      <div className="simulation-empty">
        <p>Nenhum módulo no painel. Adicione módulos para simular.</p>
      </div>
    );
  }

  return (
    <div className="simulation-view">
      <div className="sim-header">
        <h2>Simulação de Circuito</h2>
        <button className="toolbar-btn" onClick={resetAll}>Resetar</button>
      </div>

      {result.alerts.length > 0 && (
        <div className="sim-alerts">
          {result.alerts.map((alert, i) => (
            <div key={i} className={`sim-alert sim-alert-${alert.type}`}>
              <span className="sim-alert-icon">
                {alert.type === 'tripped' ? '⚠️' : alert.type === 'no-ground' ? '🔌' : '❗'}
              </span>
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sim-stats">
        <div className="sim-stat">
          <span className="sim-stat-label">Módulos</span>
          <span className="sim-stat-value">{allModules.length}</span>
        </div>
        <div className="sim-stat">
          <span className="sim-stat-label">Fios</span>
          <span className="sim-stat-value">{wires.length}</span>
        </div>
        <div className="sim-stat">
          <span className="sim-stat-label">Energizados</span>
          <span className="sim-stat-value">{result.energizedWires.size}</span>
        </div>
        <div className="sim-stat">
          <span className="sim-stat-label">Alertas</span>
          <span className="sim-stat-value">{result.alerts.length}</span>
        </div>
      </div>

      <div className="sim-grid">
        {result.states.map((state) => {
          const mod = allModules.find((m) => m.instanceId === state.instanceId);
          if (!mod) return null;
          const def = getModuleById(mod.moduleId);
          if (!def) return null;

          return (
            <div
              key={state.instanceId}
              className={`sim-card ${state.tripped ? 'sim-card-tripped' : state.on ? 'sim-card-on' : 'sim-card-off'}`}
              onClick={() => toggleModule(state.instanceId)}
            >
              <div className="sim-card-header">
                <span className="sim-card-color" style={{ background: def.color }} />
                <span className="sim-card-name">{mod.label || def.name}</span>
                <span className="sim-card-type">{CATEGORY_LABELS[def.category]}</span>
              </div>
              <div className="sim-card-body">
                <div className="sim-card-status">
                  {state.tripped ? 'DISPARADO' : state.on ? 'LIGADO' : 'DESLIGADO'}
                </div>
                <div className="sim-card-metrics">
                  <span>{state.voltageV.toFixed(0)}V</span>
                  <span>{state.currentA.toFixed(1)}A</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
