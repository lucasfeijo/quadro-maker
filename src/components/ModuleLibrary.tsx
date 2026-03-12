import React from 'react';
import { MODULE_DEFINITIONS } from '../data/modules';
import { ModuleCategory } from '../types';
import { useDraggable } from '@dnd-kit/core';
import { usePanelStore } from '../store/panelStore';
import { ModuleIcon } from './ModuleIcon';

const CATEGORY_LABELS: Record<ModuleCategory, string> = {
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

export const ModuleLibrary: React.FC = () => {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    modules: MODULE_DEFINITIONS.filter((m) => m.category === cat),
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
    </div>
  );
};
