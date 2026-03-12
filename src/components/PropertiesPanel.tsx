import React from 'react';
import { usePanelStore } from '../store/panelStore';
import { getModuleById } from '../data/modules';
import { getComponentById } from '../data/components';
import type { ComponentSpec } from '../data/components';
import type { PlacedModule, PanelIOType } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  breaker: 'Disjuntor',
  dr: 'Dispositivo DR',
  dps: 'DPS',
  contactor: 'Contator',
  relay: 'Relé',
  timer: 'Temporizador',
  terminal: 'Borne',
  ats: 'ATS',
  switch: 'Interruptor',
  button: 'Botão Pulsador',
};

const GAUGE_OPTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50];
const COLOR_OPTIONS = [
  { value: '#333', label: 'Preto (Fase)' },
  { value: '#8b4513', label: 'Marrom (Fase)' },
  { value: '#d32f2f', label: 'Vermelho (Fase)' },
  { value: '#2196f3', label: 'Azul (Neutro)' },
  { value: '#4caf50', label: 'Verde/Amarelo (Terra)' },
  { value: '#ff9800', label: 'Laranja' },
  { value: '#9c27b0', label: 'Roxo' },
];

const IO_TYPE_OPTIONS: { value: PanelIOType; label: string }[] = [
  { value: 'phase', label: 'Fase' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'ground', label: 'Terra' },
  { value: 'dc_pos', label: 'DC+' },
  { value: 'dc_neg', label: 'DC-' },
  { value: 'signal', label: 'Sinal' },
];

const PORT_TYPE_LABELS: Record<string, string> = {
  phase: 'Fase',
  neutral: 'Neutro',
  ground: 'Terra',
  any: 'Genérico',
};

function ComponentInfoSection({ spec }: { spec: ComponentSpec }) {
  return (
    <>
      {spec.description && (
        <div className="prop-section" style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Funcionamento</div>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{spec.description}</div>
        </div>
      )}

      {spec.ports.length > 0 && (
        <div className="prop-section" style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Portas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {spec.ports.map((port) => {
              const desc = spec.portDescriptions?.[port.id];
              return (
                <div key={port.id} style={{ fontSize: 11, lineHeight: 1.4 }}>
                  <span style={{
                    display: 'inline-block',
                    fontWeight: 600,
                    color: '#333',
                    background: port.side === 'top' ? '#e3f2fd' : '#fce4ec',
                    padding: '1px 5px',
                    borderRadius: 3,
                    marginRight: 4,
                    minWidth: 32,
                    textAlign: 'center',
                    fontSize: 10,
                  }}>
                    {port.label}
                  </span>
                  <span style={{ color: '#888', fontSize: 10 }}>
                    ({port.side === 'top' ? '↓ cima' : '↑ baixo'} · {PORT_TYPE_LABELS[port.type] ?? port.type})
                  </span>
                  {desc && (
                    <div style={{ color: '#666', marginLeft: 4, marginTop: 1 }}>{desc}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {spec.modes.length > 1 && (
        <div className="prop-section" style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Estados</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {spec.modes.map((mode) => (
              <div key={mode.id} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: mode.color,
                  flexShrink: 0,
                }} />
                <span style={{ fontWeight: 600, color: '#333' }}>{mode.label}</span>
                <span style={{ color: '#888' }}>
                  — {mode.routes.length > 0
                    ? mode.routes.map((r) => `${r.from} → ${r.to}`).join(', ')
                    : 'sem condução'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

interface Props {
  selectedModuleId: string | null;
}

export const PropertiesPanel: React.FC<Props> = ({ selectedModuleId }) => {
  const rows = usePanelStore((s) => s.rows);
  const wires = usePanelStore((s) => s.wires);
  const panelIOs = usePanelStore((s) => s.panelIOs);
  const externalDevices = usePanelStore((s) => s.externalDevices);
  const selectedWireId = usePanelStore((s) => s.selectedWireId);
  const selectedIOId = usePanelStore((s) => s.selectedIOId);
  const updateWireProps = usePanelStore((s) => s.updateWireProps);
  const removeWire = usePanelStore((s) => s.removeWire);
  const clearWireWaypoints = usePanelStore((s) => s.clearWireWaypoints);
  const updatePanelIO = usePanelStore((s) => s.updatePanelIO);
  const removePanelIO = usePanelStore((s) => s.removePanelIO);
  const removeExternalDevice = usePanelStore((s) => s.removeExternalDevice);
  const updateExternalDeviceLabel = usePanelStore((s) => s.updateExternalDeviceLabel);

  const selectedWire = selectedWireId ? wires.find((w) => w.id === selectedWireId) : null;
  const selectedIO = selectedIOId ? panelIOs.find((io) => io.id === selectedIOId) : null;

  const getModuleName = (instanceId: string) => {
    if (instanceId.startsWith('panel-io:')) {
      const ioId = instanceId.replace('panel-io:', '');
      const io = panelIOs.find((i) => i.id === ioId);
      return io?.label ?? 'E/S';
    }
    const extDev = externalDevices.find((d) => d.instanceId === instanceId);
    if (extDev) {
      const def = getModuleById(extDev.moduleId);
      return extDev.label || def?.name || extDev.moduleId;
    }
    for (const row of rows) {
      const mod = row.modules.find((m) => m.instanceId === instanceId);
      if (mod) {
        const def = getModuleById(mod.moduleId);
        return mod.label || def?.name || mod.moduleId;
      }
    }
    return instanceId.slice(0, 8);
  };

  if (selectedWire) {
    return (
      <div className="properties-panel">
        <h3>Fio</h3>
        <div className="prop-section">
          <div className="prop-row">
            <span className="prop-label">Origem</span>
            <span className="prop-value">{getModuleName(selectedWire.sourceInstanceId)} : {selectedWire.sourcePortId}</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Destino</span>
            <span className="prop-value">{getModuleName(selectedWire.targetInstanceId)} : {selectedWire.targetPortId}</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Bitola</span>
            <select
              className="prop-select"
              value={selectedWire.wireGaugeMm2 ?? ''}
              onChange={(e) => updateWireProps(selectedWire.id, { wireGaugeMm2: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">--</option>
              {GAUGE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g} mm²</option>
              ))}
            </select>
          </div>
          <div className="prop-row">
            <span className="prop-label">Cor</span>
            <select
              className="prop-select"
              value={selectedWire.wireColor ?? ''}
              onChange={(e) => updateWireProps(selectedWire.id, { wireColor: e.target.value || undefined })}
            >
              <option value="">Auto</option>
              {COLOR_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="prop-row">
            <span className="prop-label">Rótulo</span>
            <input
              className="prop-input"
              value={selectedWire.label ?? ''}
              placeholder="--"
              onChange={(e) => updateWireProps(selectedWire.id, { label: e.target.value || undefined })}
            />
          </div>
          {(selectedWire.waypoints?.length ?? 0) > 0 && (
            <div className="prop-row">
              <span className="prop-label">Vértices</span>
              <span className="prop-value">{selectedWire.waypoints!.length}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(selectedWire.waypoints?.length ?? 0) > 0 && (
            <button className="toolbar-btn" onClick={() => clearWireWaypoints(selectedWire.id)}>
              Limpar Vértices
            </button>
          )}
          <button className="toolbar-btn danger-action" onClick={() => { if (confirm('Remover fio?')) removeWire(selectedWire.id); }}>
            Remover Fio
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
          Dica: Dê duplo-clique no fio para adicionar vértices. Clique-direito num vértice para removê-lo.
        </div>
      </div>
    );
  }

  if (selectedIO) {
    const ioInstanceId = `panel-io:${selectedIO.id}`;
    const ioWires = wires.filter(
      (w) => w.sourceInstanceId === ioInstanceId || w.targetInstanceId === ioInstanceId,
    );
    const isInput = selectedIO.direction === 'input';
    return (
      <div className="properties-panel">
        <h3>{isInput ? 'Entrada' : 'Saída'} do Quadro</h3>
        <div className="prop-section">
          <div className="prop-row">
            <span className="prop-label">Rótulo</span>
            <input
              className="prop-input"
              value={selectedIO.label}
              onChange={(e) => updatePanelIO(selectedIO.id, { label: e.target.value })}
            />
          </div>
          <div className="prop-row">
            <span className="prop-label">Tipo</span>
            <select
              className="prop-select"
              value={selectedIO.type}
              onChange={(e) => updatePanelIO(selectedIO.id, { type: e.target.value as PanelIOType })}
            >
              {IO_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="prop-row">
            <span className="prop-label">Direção</span>
            <span className="prop-value">{isInput ? 'Entrada' : 'Saída'}</span>
          </div>

          {isInput && (
            <>
              <div className="prop-row">
                <span className="prop-label">Tensão (V)</span>
                <input
                  className="prop-input"
                  type="number"
                  min={0}
                  step={1}
                  value={selectedIO.voltageV ?? 220}
                  onChange={(e) => updatePanelIO(selectedIO.id, { voltageV: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="prop-row">
                <span className="prop-label">Corrente máx (A)</span>
                <input
                  className="prop-input"
                  type="number"
                  min={0}
                  step={0.1}
                  value={selectedIO.maxCurrentA ?? 63}
                  onChange={(e) => updatePanelIO(selectedIO.id, { maxCurrentA: Number(e.target.value) || 0 })}
                />
              </div>
            </>
          )}

          {!isInput && (
            <div className="prop-row">
              <span className="prop-label">Consumo (A)</span>
              <input
                className="prop-input"
                type="number"
                min={0}
                step={0.1}
                value={selectedIO.consumptionA ?? 0}
                onChange={(e) => updatePanelIO(selectedIO.id, { consumptionA: Number(e.target.value) || 0 })}
              />
            </div>
          )}

          <div className="prop-row">
            <span className="prop-label">Fios</span>
            <span className="prop-value">{ioWires.length}</span>
          </div>
        </div>
        <button className="toolbar-btn danger-action" onClick={() => { if (confirm(`Remover ${isInput ? 'entrada' : 'saída'}?`)) removePanelIO(selectedIO.id); }}>
          Remover {isInput ? 'Entrada' : 'Saída'}
        </button>
      </div>
    );
  }

  if (!selectedModuleId) return null;

  const selectedExtDevice = externalDevices.find((d) => d.instanceId === selectedModuleId);
  if (selectedExtDevice) {
    const extDef = getModuleById(selectedExtDevice.moduleId);
    if (!extDef) return null;
    const extSpec = getComponentById(selectedExtDevice.moduleId);
    const extWires = wires.filter(
      (w) => w.sourceInstanceId === selectedModuleId || w.targetInstanceId === selectedModuleId,
    );
    return (
      <div className="properties-panel">
        <h3>Dispositivo Externo</h3>
        <div className="prop-module-header">
          <span className="prop-color-dot" style={{ background: extDef.color }} />
          <span className="prop-module-name">{extDef.name}</span>
        </div>
        <div className="prop-section">
          <div className="prop-row">
            <span className="prop-label">Categoria</span>
            <span className="prop-value">{CATEGORY_LABELS[extDef.category] ?? extDef.category}</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Rótulo</span>
            <input
              className="prop-input"
              value={selectedExtDevice.label ?? ''}
              placeholder={extDef.name}
              onChange={(e) => updateExternalDeviceLabel(selectedModuleId, e.target.value)}
            />
          </div>
          <div className="prop-row">
            <span className="prop-label">Fios</span>
            <span className="prop-value">{extWires.length}</span>
          </div>
        </div>
        {extSpec && <ComponentInfoSection spec={extSpec} />}
        <button className="toolbar-btn danger-action" style={{ marginTop: 8 }} onClick={() => { if (confirm(`Remover ${extDef.name}?`)) removeExternalDevice(selectedModuleId); }}>
          Remover Dispositivo
        </button>
      </div>
    );
  }

  let placed: PlacedModule | undefined;
  let rowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const found = rows[i].modules.find((m) => m.instanceId === selectedModuleId);
    if (found) { placed = found; rowIndex = i; break; }
  }
  if (!placed) return null;

  const def = getModuleById(placed.moduleId);
  if (!def) return null;

  const spec = getComponentById(placed.moduleId);

  const moduleWires = wires.filter(
    (w) => w.sourceInstanceId === selectedModuleId || w.targetInstanceId === selectedModuleId,
  );

  return (
    <div className="properties-panel">
      <h3>Propriedades</h3>
      <div className="prop-module-header">
        <span className="prop-color-dot" style={{ background: def.color }} />
        <span className="prop-module-name">{def.name}</span>
      </div>
      <div className="prop-section">
        <div className="prop-row">
          <span className="prop-label">Categoria</span>
          <span className="prop-value">{CATEGORY_LABELS[def.category] ?? def.category}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Largura</span>
          <span className="prop-value">{def.widthCm} cm</span>
        </div>
        {def.poles != null && (
          <div className="prop-row">
            <span className="prop-label">Polos</span>
            <span className="prop-value">{def.poles}</span>
          </div>
        )}
        <div className="prop-row">
          <span className="prop-label">Trilho</span>
          <span className="prop-value">Linha {rowIndex + 1}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Posição</span>
          <span className="prop-value">{placed.positionCm.toFixed(1)} cm</span>
        </div>
        {placed.label && (
          <div className="prop-row">
            <span className="prop-label">Rótulo</span>
            <span className="prop-value">{placed.label}</span>
          </div>
        )}
        <div className="prop-row">
          <span className="prop-label">Fios</span>
          <span className="prop-value">{moduleWires.length}</span>
        </div>
      </div>
      {spec && <ComponentInfoSection spec={spec} />}
      <div className="prop-hint" style={{ marginTop: 8 }}>
        Dica: Clique duplo no módulo para editar o rótulo.
        Use o modo Fiação para conectar portas.
      </div>
    </div>
  );
};
