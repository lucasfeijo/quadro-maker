import React from 'react';
import { usePanelStore } from '../store/panelStore';
import { getModuleById } from '../data/modules';
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

interface Props {
  selectedModuleId: string | null;
}

export const PropertiesPanel: React.FC<Props> = ({ selectedModuleId }) => {
  const rows = usePanelStore((s) => s.rows);
  const wires = usePanelStore((s) => s.wires);
  const panelIOs = usePanelStore((s) => s.panelIOs);
  const selectedWireId = usePanelStore((s) => s.selectedWireId);
  const selectedIOId = usePanelStore((s) => s.selectedIOId);
  const updateWireProps = usePanelStore((s) => s.updateWireProps);
  const removeWire = usePanelStore((s) => s.removeWire);
  const updatePanelIO = usePanelStore((s) => s.updatePanelIO);
  const removePanelIO = usePanelStore((s) => s.removePanelIO);

  const selectedWire = selectedWireId ? wires.find((w) => w.id === selectedWireId) : null;
  const selectedIO = selectedIOId ? panelIOs.find((io) => io.id === selectedIOId) : null;

  const getModuleName = (instanceId: string) => {
    if (instanceId.startsWith('panel-io:')) {
      const ioId = instanceId.replace('panel-io:', '');
      const io = panelIOs.find((i) => i.id === ioId);
      return io?.label ?? 'E/S';
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
        </div>
        <button className="toolbar-btn danger-action" onClick={() => removeWire(selectedWire.id)}>
          Remover Fio
        </button>
      </div>
    );
  }

  if (selectedIO) {
    const ioInstanceId = `panel-io:${selectedIO.id}`;
    const ioWires = wires.filter(
      (w) => w.sourceInstanceId === ioInstanceId || w.targetInstanceId === ioInstanceId,
    );
    return (
      <div className="properties-panel">
        <h3>{selectedIO.direction === 'input' ? 'Entrada' : 'Saída'} do Quadro</h3>
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
            <span className="prop-value">{selectedIO.direction === 'input' ? 'Entrada' : 'Saída'}</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Fios</span>
            <span className="prop-value">{ioWires.length}</span>
          </div>
        </div>
        <button className="toolbar-btn danger-action" onClick={() => removePanelIO(selectedIO.id)}>
          Remover {selectedIO.direction === 'input' ? 'Entrada' : 'Saída'}
        </button>
      </div>
    );
  }

  if (!selectedModuleId) return null;

  let placed: PlacedModule | undefined;
  let rowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const found = rows[i].modules.find((m) => m.instanceId === selectedModuleId);
    if (found) { placed = found; rowIndex = i; break; }
  }
  if (!placed) return null;

  const def = getModuleById(placed.moduleId);
  if (!def) return null;

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
          <span className="prop-label">Portas</span>
          <span className="prop-value">{def.ports.length}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Fios</span>
          <span className="prop-value">{moduleWires.length}</span>
        </div>
      </div>
      <div className="prop-hint">
        Dica: Clique duplo no módulo para editar o rótulo.
        Use o modo Fiação para conectar portas.
      </div>
    </div>
  );
};
