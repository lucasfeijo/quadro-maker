import React, { useState, useMemo, useCallback } from 'react';
import { getModuleById, isExternalModule, isDualMount } from '../data/modules';
import { LIBRARY_GROUPS, IO_ITEM_MAP, IO_GROUP_MAP } from '../data/libraryConfig';
import { PanelIODirection, PanelEdge } from '../types';
import { useDraggable } from '@dnd-kit/core';
import { usePanelStore } from '../store/panelStore';
import { ModuleIcon } from './ModuleIcon';

const IO_ITEMS: {
  direction: PanelIODirection;
  type: 'phase' | 'neutral' | 'ground' | 'dc_pos' | 'dc_neg' | 'signal';
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

const IO_GROUP_ITEMS: {
  direction: PanelIODirection;
  types: ('phase' | 'neutral' | 'ground')[];
  defaultEdge: PanelEdge;
  label: string;
  abbr: string;
  color: string;
}[] = [
  { direction: 'input', types: ['phase', 'neutral', 'ground'], defaultEdge: 'top', label: 'Entrada F+N+T', abbr: 'F+N+PE', color: '#5d4037' },
  { direction: 'input', types: ['phase', 'neutral'], defaultEdge: 'top', label: 'Entrada F+N', abbr: 'F+N', color: '#37474f' },
  { direction: 'output', types: ['phase', 'neutral', 'ground'], defaultEdge: 'bottom', label: 'Saída F+N+T', abbr: 'F+N+PE', color: '#5d4037' },
  { direction: 'output', types: ['phase', 'neutral'], defaultEdge: 'bottom', label: 'Saída F+N', abbr: 'F+N', color: '#37474f' },
];

function DinTag() {
  return (
    <span className="library-item-tag" title="Montagem em trilho DIN: encaixa no trilho do quadro.">
      DIN
    </span>
  );
}

function ScrewTag() {
  return (
    <span className="library-item-tag" title="Montagem por parafuso: posicionamento livre no painel ou fora do quadro.">
      🔩
    </span>
  );
}

function DraggableModule({ moduleId, name, color, widthMm, icon, imageUrl }: {
  moduleId: string;
  name: string;
  color: string;
  widthMm: number;
  icon?: string;
  imageUrl?: string;
}) {
  const dualMount = isDualMount(moduleId);
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
        <span className="library-item-meta">
          <span className="library-item-size">{widthMm}mm</span>
          <DinTag />
          {dualMount && <ScrewTag />}
        </span>
      </div>
    </div>
  );
}

function IOItem({ direction, type, defaultEdge, label, color, abbr }: typeof IO_ITEMS[number]) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-io-${direction}-${type}`,
    data: { type: 'new-panel-io', direction, ioType: type, defaultEdge },
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
        {abbr}
      </div>
      <div className="library-item-info">
        <span className="library-item-name">{label}</span>
        <span className="library-item-size">Arraste para o painel</span>
      </div>
    </div>
  );
}

function IOGroupItem({ direction, types, defaultEdge, label, abbr, color }: typeof IO_GROUP_ITEMS[number]) {
  const groupId = `library-io-group-${direction}-${types.join('-')}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: groupId,
    data: { type: 'new-panel-io-group', direction, ioTypes: types, defaultEdge, defaultColor: color },
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
        style={{ background: color, borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}
      >
        {abbr}
      </div>
      <div className="library-item-info">
        <span className="library-item-name">{label}</span>
        <span className="library-item-size">{types.length} pontos · Arraste para o painel</span>
      </div>
    </div>
  );
}

function TextAnnotationItem() {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: 'library-text-annotation',
    data: { type: 'new-text-annotation' },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="library-item io-item"
      style={{ borderLeftColor: '#546e7a', opacity: isDragging ? 0.4 : 1 }}
    >
      <div
        className="library-item-icon"
        style={{ background: '#546e7a', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}
      >
        T
      </div>
      <div className="library-item-info">
        <span className="library-item-name">Legenda / Texto</span>
        <span className="library-item-size">Arraste para o painel</span>
      </div>
    </div>
  );
}

function ExternalDeviceItem({ moduleId, name, color }: { moduleId: string; name: string; color: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-ext-${moduleId}`,
    data: { type: 'new-external-device', moduleId },
  });

  const iconLabel = moduleId.startsWith('switch') ? 'SW' : moduleId === 'led' ? 'LED' : moduleId.startsWith('busbar-screw') ? 'B' : 'BTN';

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
        {iconLabel}
      </div>
      <div className="library-item-info">
        <span className="library-item-name">{name}</span>
        <span className="library-item-meta">
          <span className="library-item-size">{moduleId.startsWith('busbar-screw') ? 'Arraste para o painel' : 'Arraste para fora do quadro'}</span>
          <ScrewTag />
        </span>
      </div>
    </div>
  );
}

function CollapsibleGroup({ label, defaultOpen, children, visible }: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  visible: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  if (!visible) return null;
  return (
    <div className="library-group" style={{ marginBottom: open ? 16 : 8 }}>
      <div
        className="library-group-label"
        onClick={() => setOpen((v) => !v)}
        style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <span style={{
          display: 'inline-block',
          width: 0,
          height: 0,
          borderLeft: open ? '4px solid transparent' : '5px solid currentColor',
          borderRight: open ? '4px solid transparent' : 'none',
          borderTop: open ? '5px solid currentColor' : '4px solid transparent',
          borderBottom: open ? 'none' : '4px solid transparent',
          transition: 'all 0.15s',
          flexShrink: 0,
        }} />
        {label}
      </div>
      {open && children}
    </div>
  );
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function getIOItem(direction: PanelIODirection, type: string) {
  return IO_ITEMS.find((i) => i.direction === direction && i.type === type);
}

function getIOGroupItem(direction: PanelIODirection, types: string[]) {
  const typesKey = types.join(',');
  return IO_GROUP_ITEMS.find(
    (g) => g.direction === direction && g.types.join(',') === typesKey,
  );
}

export const ModuleLibrary: React.FC = () => {
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const q = normalize(filter.trim());

  const matchesFilter = useCallback((text: string) => {
    if (!q) return true;
    return normalize(text).includes(q);
  }, [q]);

  type ResolvedItem =
    | { type: 'io'; item: (typeof IO_ITEMS)[number] }
    | { type: 'io-group'; item: (typeof IO_GROUP_ITEMS)[number] }
    | { type: 'module'; mod: NonNullable<ReturnType<typeof getModuleById>> };

  const activeGroup = LIBRARY_GROUPS[activeTab];
  const filteredSubgroups = useMemo(() => {
    if (!activeGroup) return [] as Array<{ id: string; label: string; resolved: ResolvedItem[] }>;
    return activeGroup.subgroups
      .map((sg) => {
        const resolved: ResolvedItem[] = [];
        for (const modId of sg.modules) {
          const ioSpec = IO_ITEM_MAP[modId];
          const ioGroupSpec = IO_GROUP_MAP[modId];
          const mod = getModuleById(modId);

          if (ioSpec) {
            const item = getIOItem(ioSpec.direction, ioSpec.type);
            if (item && matchesFilter(item.label)) resolved.push({ type: 'io', item });
            continue;
          }
          if (ioGroupSpec) {
            const item = getIOGroupItem(ioGroupSpec.direction, ioGroupSpec.types);
            if (item && matchesFilter(item.label)) resolved.push({ type: 'io-group', item });
            continue;
          }
          if (mod && (matchesFilter(mod.name) || matchesFilter(sg.label))) {
            resolved.push({ type: 'module', mod });
          }
        }
        return { ...sg, resolved };
      })
      .filter((sg) => sg.resolved.length > 0);
  }, [activeGroup, q, matchesFilter]);

  const showAnnotations = !q || ['legenda', 'texto', 'anotação', 'annotation', 'label'].some((w) => q.includes(normalize(w)));
  const hasAnnotations = activeGroup?.id === 'connection_interface' && showAnnotations;

  return (
    <div className="module-library">
      <div className="library-filter-sticky">
        <input
          type="text"
          className="library-filter-input"
          placeholder="Filtrar componentes..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="library-tabs">
          {LIBRARY_GROUPS.map((g, i) => (
            <button
              key={g.id}
              type="button"
              className={`library-tab ${activeTab === i ? 'active' : ''}`}
              onClick={() => setActiveTab(i)}
              style={
                activeTab === i
                  ? { background: g.color, color: '#fff' }
                  : undefined
              }
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {filteredSubgroups.map((sg) => (
        <CollapsibleGroup key={sg.id} label={sg.label} visible defaultOpen>
          {sg.resolved.map((r) => {
            if (r.type === 'io') {
              return <IOItem key={`io-${r.item.direction}-${r.item.type}`} {...r.item} />;
            }
            if (r.type === 'io-group') {
              return <IOGroupItem key={`iog-${r.item.direction}-${r.item.types.join('-')}`} {...r.item} />;
            }
            if (r.type === 'module') {
              const mod = r.mod;
              if (isExternalModule(mod.id)) {
                return <ExternalDeviceItem key={mod.id} moduleId={mod.id} name={mod.name} color={mod.color} />;
              }
              /* Dual-mount e DIN: usa DraggableModule (new-module) para permitir drop no trilho ou como externo */
              return (
                <DraggableModule
                  key={mod.id}
                  moduleId={mod.id}
                  name={mod.name}
                  color={mod.color}
                  widthMm={mod.widthMm}
                  icon={mod.icon}
                  imageUrl={mod.imageUrl}
                />
              );
            }
            return null;
          })}
        </CollapsibleGroup>
      ))}

      {hasAnnotations && (
        <CollapsibleGroup label="Anotações" visible defaultOpen>
          <TextAnnotationItem />
        </CollapsibleGroup>
      )}

      {filteredSubgroups.length === 0 && !hasAnnotations && (
        <div style={{ color: '#888', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
          Nenhum componente encontrado.
        </div>
      )}
    </div>
  );
};
