import React, { useState, useMemo, useCallback } from 'react';
import { MODULE_DEFINITIONS, getModuleById, isExternalModule } from '../data/modules';
import { ModuleCategory, PanelIODirection, PanelIOType, PanelEdge } from '../types';
import { useDraggable } from '@dnd-kit/core';
import { usePanelStore } from '../store/panelStore';
import { ModuleIcon } from './ModuleIcon';

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

const IO_GROUP_ITEMS: {
  direction: PanelIODirection;
  types: PanelIOType[];
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

function DraggableModule({ moduleId, name, color, widthMm, icon, imageUrl }: {
  moduleId: string;
  name: string;
  color: string;
  widthMm: number;
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
        <span className="library-item-size">{widthMm}mm</span>
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

const EXTERNAL_MODULES = MODULE_DEFINITIONS.filter((m) => isExternalModule(m.id));

const BUSBAR_RAIL_IDS = ['busbar-rail-8p-phase', 'busbar-rail-8p-neutral', 'busbar-rail-8p-ground'];
const BUSBAR_SCREW_IDS = ['busbar-screw-8p-phase', 'busbar-screw-8p-neutral', 'busbar-screw-8p-ground'];
const BUSBAR_MODULE_IDS = [...BUSBAR_RAIL_IDS, ...BUSBAR_SCREW_IDS];

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
        <span className="library-item-size">{moduleId.startsWith('busbar-screw') ? 'Arraste para o painel' : 'Arraste para fora do quadro'}</span>
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

export const ModuleLibrary: React.FC = () => {
  const [filter, setFilter] = useState('');
  const q = normalize(filter.trim());

  const matchesFilter = useCallback((text: string) => {
    if (!q) return true;
    return normalize(text).includes(q);
  }, [q]);

  const grouped = useMemo(() =>
    CATEGORY_ORDER.map((cat) => {
      const label = CATEGORY_LABELS[cat] ?? cat;
      const modules = MODULE_DEFINITIONS.filter(
        (m) => m.category === cat && !isExternalModule(m.id) && !BUSBAR_MODULE_IDS.includes(m.id),
      );
      const filtered = q
        ? modules.filter((m) => matchesFilter(m.name) || matchesFilter(label))
        : modules;
      return { category: cat, label, modules: filtered };
    }).filter((g) => g.modules.length > 0),
    [q, matchesFilter],
  );

  const filteredInputIO = useMemo(
    () => IO_ITEMS.filter((i) => i.direction === 'input' && matchesFilter(i.label)),
    [matchesFilter],
  );
  const filteredOutputIO = useMemo(
    () => IO_ITEMS.filter((i) => i.direction === 'output' && matchesFilter(i.label)),
    [matchesFilter],
  );
  const filteredInputGroups = useMemo(
    () => IO_GROUP_ITEMS.filter((g) => g.direction === 'input' && matchesFilter(g.label)),
    [matchesFilter],
  );
  const filteredOutputGroups = useMemo(
    () => IO_GROUP_ITEMS.filter((g) => g.direction === 'output' && matchesFilter(g.label)),
    [matchesFilter],
  );
  const filteredExternal = useMemo(
    () => EXTERNAL_MODULES.filter((m) => matchesFilter(m.name) && !BUSBAR_SCREW_IDS.includes(m.id)),
    [matchesFilter],
  );

  const filteredBusbarRail = useMemo(
    () => BUSBAR_RAIL_IDS.map((id) => getModuleById(id)).filter(Boolean).filter((m) => matchesFilter(m!.name)),
    [matchesFilter],
  );
  const filteredBusbarScrew = useMemo(
    () => BUSBAR_SCREW_IDS.map((id) => getModuleById(id)).filter(Boolean).filter((m) => matchesFilter(m!.name)),
    [matchesFilter],
  );
  const hasBusbars = filteredBusbarRail.length > 0 || filteredBusbarScrew.length > 0;

  const hasIO = filteredInputIO.length > 0 || filteredOutputIO.length > 0 || filteredInputGroups.length > 0 || filteredOutputGroups.length > 0;
  const hasExternal = filteredExternal.length > 0;

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
      </div>

      {grouped.length > 0 && <h3 style={{ marginTop: 4 }}>Módulos</h3>}
      {grouped.map((group) => (
        <CollapsibleGroup key={group.category} label={group.label} visible defaultOpen>
          {group.modules.map((mod) => (
            <DraggableModule
              key={mod.id}
              moduleId={mod.id}
              name={mod.name}
              color={mod.color}
              widthMm={mod.widthMm}
              icon={mod.icon}
              imageUrl={mod.imageUrl}
            />
          ))}
        </CollapsibleGroup>
      ))}

      {hasIO && <h3 style={{ marginTop: 20 }}>Entradas & Saídas</h3>}
      <CollapsibleGroup label="Entradas" visible={filteredInputIO.length > 0 || filteredInputGroups.length > 0} defaultOpen>
        {filteredInputGroups.map((item) => (
          <IOGroupItem key={`${item.direction}-${item.types.join('-')}`} {...item} />
        ))}
        {filteredInputIO.map((item) => (
          <IOItem key={`${item.direction}-${item.type}`} {...item} />
        ))}
      </CollapsibleGroup>
      <CollapsibleGroup label="Saídas" visible={filteredOutputIO.length > 0 || filteredOutputGroups.length > 0} defaultOpen>
        {filteredOutputGroups.map((item) => (
          <IOGroupItem key={`${item.direction}-${item.types.join('-')}`} {...item} />
        ))}
        {filteredOutputIO.map((item) => (
          <IOItem key={`${item.direction}-${item.type}`} {...item} />
        ))}
      </CollapsibleGroup>

      {hasBusbars && <h3 style={{ marginTop: 20 }}>Barramentos</h3>}
      <CollapsibleGroup label="Barramentos" visible={hasBusbars} defaultOpen>
        {filteredBusbarRail.map((mod) => (
          <DraggableModule
            key={mod!.id}
            moduleId={mod!.id}
            name={mod!.name}
            color={mod!.color}
            widthMm={mod!.widthMm}
            icon={mod!.icon}
            imageUrl={mod!.imageUrl}
          />
        ))}
        {filteredBusbarScrew.map((mod) => (
          <ExternalDeviceItem key={mod!.id} moduleId={mod!.id} name={mod!.name} color={mod!.color} />
        ))}
      </CollapsibleGroup>

      {hasExternal && <h3 style={{ marginTop: 20 }}>Dispositivos Externos</h3>}
      <CollapsibleGroup label="Dispositivos" visible={hasExternal} defaultOpen>
        {filteredExternal.map((mod) => (
          <ExternalDeviceItem key={mod.id} moduleId={mod.id} name={mod.name} color={mod.color} />
        ))}
      </CollapsibleGroup>

      {(() => {
        const showAnnotations = !q || 'legenda texto anotação annotation label'.toLowerCase().includes(q.toLowerCase()) || 'legenda'.includes(q.toLowerCase()) || 'texto'.includes(q.toLowerCase()) || 'anotação'.includes(q.toLowerCase());
        return showAnnotations ? (
          <>
            <h3 style={{ marginTop: 20 }}>Anotações</h3>
            <CollapsibleGroup label="Anotações" visible defaultOpen>
              <TextAnnotationItem />
            </CollapsibleGroup>
          </>
        ) : null;
      })()}

      {q && grouped.length === 0 && !hasIO && !hasExternal && !hasBusbars && (
        <div style={{ color: '#888', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
          Nenhum componente encontrado.
        </div>
      )}
    </div>
  );
};
