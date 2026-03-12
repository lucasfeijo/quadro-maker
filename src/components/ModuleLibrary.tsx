import React from 'react';
import { MODULE_DEFINITIONS, isExternalModule } from '../data/modules';
import { ModuleCategory, PanelIODirection, PanelIOType, PanelEdge } from '../types';
import { useDraggable } from '@dnd-kit/core';
import { usePanelStore } from '../store/panelStore';
import { ModuleIcon } from './ModuleIcon';
import { findDefaultPositionPercent } from '../utils/panelIO';

const CATEGORY_LABELS: Partial<Record<ModuleCategory, string>> = {
  breaker: 'Disjuntores',
  dr: 'DRs',
  dps: 'DPS',
  contactor: 'Contatores',
  relay: 'Relés',
  timer: 'Temporizadores',
  terminal: 'Bornes',
  ats: 'Switches ATS',
};

const CATEGORY_ORDER: ModuleCategory[] = [
  'breaker',
  'dr',
  'dps',
  'ats',
  'contactor',
  'relay',
  'timer',
  'terminal',
];

const IO_ITEMS: {
  direction: PanelIODirection;
  type: PanelIOType;
  defaultEdge: PanelEdge;
  label: string;
  color: string;
  abbr: string;
}[] = [
  { direction: 'input', type: 'phase', defaultEdge: 'top', label: 'Entrada Fase', color: '#d32f2f', abbr: 'F' },
  { direction: 'input', type: 'neutral', defaultEdge: 'top', label: 'Entrada Neutro', color: '#1565c0', abbr: 'N' },
  { direction: 'input', type: 'ground', defaultEdge: 'top', label: 'Entrada Terra', color: '#2e7d32', abbr: 'PE' },
  { direction: 'input', type: 'dc_pos', defaultEdge: 'top', label: 'Entrada DC+', color: '#c62828', abbr: 'DC+' },
  { direction: 'input', type: 'dc_neg', defaultEdge: 'top', label: 'Entrada DC-', color: '#1a237e', abbr: 'DC-' },
  { direction: 'input', type: 'signal', defaultEdge: 'left', label: 'Entrada Sinal', color: '#f57c00', abbr: 'SIG' },
  { direction: 'output', type: 'phase', defaultEdge: 'bottom', label: 'Saída Fase', color: '#d32f2f', abbr: 'F' },
  { direction: 'output', type: 'neutral', defaultEdge: 'bottom', label: 'Saída Neutro', color: '#1565c0', abbr: 'N' },
  { direction: 'output', type: 'ground', defaultEdge: 'bottom', label: 'Saída Terra', color: '#2e7d32', abbr: 'PE' },
  { direction: 'output', type: 'dc_pos', defaultEdge: 'bottom', label: 'Saída DC+', color: '#c62828', abbr: 'DC+' },
  { direction: 'output', type: 'dc_neg', defaultEdge: 'bottom', label: 'Saída DC-', color: '#1a237e', abbr: 'DC-' },
  { direction: 'output', type: 'signal', defaultEdge: 'right', label: 'Saída Sinal', color: '#f57c00', abbr: 'SIG' },
];

function DraggableModule({ moduleId, name, color, widthCm, icon, imageUrl }: {
  moduleId: string;
  name: string;
  color: string;
  widthCm: number;
  icon?: string;
  imageUrl?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${moduleId}`,
    data: { type: 'new-module', moduleId },
  });
  const displayMode = usePanelStore((s) => s.displayMode);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="library-item"
      style={{
        opacity: isDragging ? 0.4 : 1,
        borderLeftColor: color,
      }}
    >
      <div className="library-item-icon" style={{ background: color, borderRadius: 4, padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ModuleIcon icon={icon} imageUrl={imageUrl} displayMode={displayMode} size={20} color="#fff" />
      </div>
      <div className="library-item-info">
        <span className="library-item-name">{name}</span>
        <span className="library-item-size">{widthCm}cm</span>
      </div>
    </div>
  );
}

function IOItem({ direction, type, defaultEdge, label, color, abbr }: typeof IO_ITEMS[number]) {
  const panelIOs = usePanelStore((s) => s.panelIOs);
  const addPanelIO = usePanelStore((s) => s.addPanelIO);

  const handleClick = () => {
    const sameEdge = panelIOs.filter((io) => io.edge === defaultEdge);
    const pos = findDefaultPositionPercent(sameEdge.map((io) => io.positionPercent));
    addPanelIO(direction, type, defaultEdge, pos);
  };

  return (
    <div className="library-item io-item" style={{ borderLeftColor: color }} onClick={handleClick}>
      <div
        className="library-item-icon"
        style={{ background: color, borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}
      >
        {abbr}
      </div>
      <div className="library-item-info">
        <span className="library-item-name">{label}</span>
        <span className="library-item-size">{direction === 'input' ? 'Borda superior' : 'Borda inferior'}</span>
      </div>
    </div>
  );
}

const EXTERNAL_MODULES = MODULE_DEFINITIONS.filter((m) => isExternalModule(m.id));

function ExternalDeviceItem({ moduleId, name, color }: { moduleId: string; name: string; color: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-ext-${moduleId}`,
    data: { type: 'new-external-device', moduleId },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="library-item io-item"
      style={{ borderLeftColor: color, opacity: isDragging ? 0.4 : 1 }}
    >
      <div
        className="library-item-icon"
        style={{ background: color, borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}
      >
        {moduleId.startsWith('switch') ? 'SW' : 'BTN'}
      </div>
      <div className="library-item-info">
        <span className="library-item-name">{name}</span>
        <span className="library-item-size">Arraste para fora do quadro</span>
      </div>
    </div>
  );
}

export const ModuleLibrary: React.FC = () => {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    modules: MODULE_DEFINITIONS.filter((m) => m.category === cat && !isExternalModule(m.id)),
  })).filter((g) => g.modules.length > 0);

  return (
    <div className="module-library">
      <h3>Módulos</h3>
      {grouped.map((group) => (
        <div key={group.category} className="library-group">
          <div className="library-group-label">{group.label}</div>
          {group.modules.map((mod) => (
            <DraggableModule
              key={mod.id}
              moduleId={mod.id}
              name={mod.name}
              color={mod.color}
              widthCm={mod.widthCm}
              icon={mod.icon}
              imageUrl={mod.imageUrl}
            />
          ))}
        </div>
      ))}

      <h3 style={{ marginTop: 20 }}>Entradas & Saídas</h3>
      <div className="library-group">
        <div className="library-group-label">Entradas</div>
        {IO_ITEMS.filter((i) => i.direction === 'input').map((item) => (
          <IOItem key={`${item.direction}-${item.type}`} {...item} />
        ))}
      </div>
      <div className="library-group">
        <div className="library-group-label">Saídas</div>
        {IO_ITEMS.filter((i) => i.direction === 'output').map((item) => (
          <IOItem key={`${item.direction}-${item.type}`} {...item} />
        ))}
      </div>

      <h3 style={{ marginTop: 20 }}>Dispositivos Externos</h3>
      <div className="library-group">
        {EXTERNAL_MODULES.map((mod) => (
          <ExternalDeviceItem key={mod.id} moduleId={mod.id} name={mod.name} color={mod.color} />
        ))}
      </div>
    </div>
  );
};
