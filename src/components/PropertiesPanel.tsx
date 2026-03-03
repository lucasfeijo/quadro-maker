import React from 'react';
import { usePanelStore } from '../store/panelStore';
import { getModuleById } from '../data/modules';
import type { PlacedModule } from '../types';

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

interface Props {
  selectedModuleId: string;
}

export const PropertiesPanel: React.FC<Props> = ({ selectedModuleId }) => {
  const rows = usePanelStore((s) => s.rows);

  let placed: PlacedModule | undefined;
  let rowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const found = rows[i].modules.find(
      (m) => m.instanceId === selectedModuleId,
    );
    if (found) {
      placed = found;
      rowIndex = i;
      break;
    }
  }

  if (!placed) return null;

  const def = getModuleById(placed.moduleId);
  if (!def) return null;

  return (
    <div className="properties-panel">
      <h3>Propriedades</h3>

      <div className="prop-module-header">
        <span
          className="prop-color-dot"
          style={{ background: def.color }}
        />
        <span className="prop-module-name">{def.name}</span>
      </div>

      <div className="prop-section">
        <div className="prop-row">
          <span className="prop-label">Categoria</span>
          <span className="prop-value">
            {CATEGORY_LABELS[def.category] ?? def.category}
          </span>
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
      </div>

      <div className="prop-hint">
        Dica: Clique duplo no módulo para editar o rótulo
      </div>
    </div>
  );
};
