import React from 'react';
import { usePanelStore } from '../store/panelStore';
import { getModuleById } from '../data/modules';
import { getComponentById } from '../data/components';
import type { ComponentSpec, PropertySpec } from '../data/components';
import type { PlacedModule, PanelIOType, BusbarType, TextAnnotation } from '../types';
import { FONT_OPTIONS } from './TextAnnotationLayer';

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
  { value: '#ffffff', label: 'Branco' },
  { value: '#607d8b', label: 'Cinza' },
  { value: '#e91e63', label: 'Rosa' },
  { value: '#00bcd4', label: 'Ciano' },
  { value: '#ffeb3b', label: 'Amarelo' },
];

const IO_TYPE_OPTIONS: { value: PanelIOType; label: string }[] = [
  { value: 'phase', label: 'Fase' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'ground', label: 'Terra' },
  { value: 'dc_pos', label: 'DC+' },
  { value: 'dc_neg', label: 'DC-' },
  { value: 'signal', label: 'Sinal' },
];

const IO_TYPE_COLORS: Record<PanelIOType, string> = {
  phase: '#d32f2f',
  neutral: '#1565c0',
  ground: '#2e7d32',
  dc_pos: '#c62828',
  dc_neg: '#1a237e',
  signal: '#f57c00',
};

const BUSBAR_TYPE_OPTIONS: { value: BusbarType; label: string }[] = [
  { value: 'phase', label: 'Fase' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'ground', label: 'Terra' },
];

const BUSBAR_TYPE_COLORS: Record<BusbarType, string> = {
  phase: '#d32f2f',
  neutral: '#1565c0',
  ground: '#2e7d32',
};

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

function PropertyEditorSection({
  spec,
  instanceId,
  instanceProps,
  onUpdate,
}: {
  spec: ComponentSpec;
  instanceId: string;
  instanceProps?: Record<string, number | string>;
  onUpdate: (instanceId: string, key: string, value: number | string) => void;
}) {
  if (!spec.properties || spec.properties.length === 0) return null;

  return (
    <div className="prop-section" style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Configurações</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {spec.properties.map((prop) => {
          const currentValue = instanceProps?.[prop.key] ?? prop.defaultValue;
          return (
            <div key={prop.key} className="prop-row">
              <span className="prop-label">{prop.label}</span>
              {prop.type === 'color' && prop.options ? (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <select
                    className="prop-input"
                    style={{ flex: 1 }}
                    value={prop.options.some(o => String(o.value) === String(currentValue)) ? String(currentValue) : '__custom__'}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') return;
                      onUpdate(instanceId, prop.key, e.target.value);
                    }}
                  >
                    {prop.options.map((opt) => (
                      <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                    ))}
                    {!prop.options.some(o => String(o.value) === String(currentValue)) && (
                      <option value="__custom__">Personalizada</option>
                    )}
                  </select>
                  <input
                    type="color"
                    value={String(currentValue)}
                    onChange={(e) => onUpdate(instanceId, prop.key, e.target.value)}
                    style={{ width: 28, height: 28, padding: 0, border: '1px solid #555', borderRadius: 4, cursor: 'pointer', background: 'none' }}
                    title="Cor personalizada"
                  />
                </div>
              ) : prop.type === 'select' && prop.options ? (
                <select
                  className="prop-input"
                  value={String(currentValue)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const numVal = Number(raw);
                    onUpdate(instanceId, prop.key, isNaN(numVal) ? raw : numVal);
                  }}
                >
                  {prop.options.map((opt) => (
                    <option key={String(opt.value)} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="prop-input"
                  type="number"
                  step="any"
                  value={currentValue}
                  onChange={(e) => onUpdate(instanceId, prop.key, Number(e.target.value))}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
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
  const busbars = usePanelStore((s) => s.busbars);
  const selectedWireId = usePanelStore((s) => s.selectedWireId);
  const selectedIOId = usePanelStore((s) => s.selectedIOId);
  const selectedBusbarId = usePanelStore((s) => s.selectedBusbarId);
  const updateWireProps = usePanelStore((s) => s.updateWireProps);
  const removeWire = usePanelStore((s) => s.removeWire);
  const clearWireWaypoints = usePanelStore((s) => s.clearWireWaypoints);
  const updatePanelIO = usePanelStore((s) => s.updatePanelIO);
  const removePanelIO = usePanelStore((s) => s.removePanelIO);
  const removeExternalDevice = usePanelStore((s) => s.removeExternalDevice);
  const updateExternalDeviceLabel = usePanelStore((s) => s.updateExternalDeviceLabel);
  const updateInstanceProperty = usePanelStore((s) => s.updateInstanceProperty);
  const updateLabel = usePanelStore((s) => s.updateLabel);
  const updateBusbarLabel = usePanelStore((s) => s.updateBusbarLabel);
  const updateBusbarType = usePanelStore((s) => s.updateBusbarType);
  const updateBusbarColor = usePanelStore((s) => s.updateBusbarColor);
  const resizeBusbar = usePanelStore((s) => s.resizeBusbar);
  const removeBusbar = usePanelStore((s) => s.removeBusbar);
  const addBusbarConnectionPoint = usePanelStore((s) => s.addBusbarConnectionPoint);
  const removeBusbarConnectionPoint = usePanelStore((s) => s.removeBusbarConnectionPoint);
  const textAnnotations = usePanelStore((s) => s.textAnnotations);
  const selectedAnnotationId = usePanelStore((s) => s.selectedAnnotationId);
  const updateTextAnnotation = usePanelStore((s) => s.updateTextAnnotation);
  const removeTextAnnotation = usePanelStore((s) => s.removeTextAnnotation);

  const selectedWire = selectedWireId ? wires.find((w) => w.id === selectedWireId) : null;
  const selectedIO = selectedIOId ? panelIOs.find((io) => io.id === selectedIOId) : null;
  const selectedBusbar = selectedBusbarId ? busbars.find((b) => b.id === selectedBusbarId) : null;
  const selectedAnnotation = selectedAnnotationId ? textAnnotations.find((a) => a.id === selectedAnnotationId) : null;

  const getModuleName = (instanceId: string) => {
    if (instanceId.startsWith('panel-io:')) {
      const ioId = instanceId.replace('panel-io:', '');
      const io = panelIOs.find((i) => i.id === ioId);
      return io?.label ?? 'E/S';
    }
    if (instanceId.startsWith('busbar:')) {
      const bId = instanceId.replace('busbar:', '');
      const bar = busbars.find((b) => b.id === bId);
      return bar?.label || 'Barramento';
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

  if (selectedAnnotation) {
    return (
      <div className="properties-panel">
        <h3>Legenda / Texto</h3>
        <div className="prop-module-header">
          <span className="prop-color-dot" style={{ background: selectedAnnotation.color }} />
          <span className="prop-module-name">{selectedAnnotation.text.slice(0, 30) || 'Texto'}</span>
        </div>
        <div className="prop-section">
          <div className="prop-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <span className="prop-label">Texto</span>
            <textarea
              className="prop-input"
              rows={3}
              value={selectedAnnotation.text}
              onChange={(e) => updateTextAnnotation(selectedAnnotation.id, { text: e.target.value })}
              style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 12, lineHeight: 1.4 }}
            />
          </div>
          <div className="prop-row">
            <span className="prop-label">Tamanho</span>
            <input
              className="prop-input"
              type="number"
              min={6}
              max={72}
              step={1}
              value={selectedAnnotation.fontSize}
              onChange={(e) => updateTextAnnotation(selectedAnnotation.id, { fontSize: Number(e.target.value) || 14 })}
            />
          </div>
          <div className="prop-row">
            <span className="prop-label">Fonte</span>
            <select
              className="prop-select"
              value={FONT_OPTIONS.some(f => f.value === selectedAnnotation.fontFamily) ? selectedAnnotation.fontFamily : selectedAnnotation.fontFamily}
              onChange={(e) => updateTextAnnotation(selectedAnnotation.id, { fontFamily: e.target.value })}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="prop-row">
            <span className="prop-label">Cor</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <select
                className="prop-select"
                style={{ flex: 1 }}
                value={COLOR_OPTIONS.some(c => c.value === selectedAnnotation.color) ? selectedAnnotation.color : '__custom__'}
                onChange={(e) => {
                  if (e.target.value === '__custom__') return;
                  updateTextAnnotation(selectedAnnotation.id, { color: e.target.value });
                }}
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
                {!COLOR_OPTIONS.some(c => c.value === selectedAnnotation.color) && (
                  <option value="__custom__">Personalizada</option>
                )}
              </select>
              <input
                type="color"
                value={selectedAnnotation.color}
                onChange={(e) => updateTextAnnotation(selectedAnnotation.id, { color: e.target.value })}
                style={{ width: 28, height: 28, padding: 0, border: '1px solid #555', borderRadius: 4, cursor: 'pointer', background: 'none' }}
                title="Cor personalizada"
              />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-label">Estilo</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className={`toolbar-btn${selectedAnnotation.bold ? ' active' : ''}`}
                style={{ fontWeight: 700, minWidth: 32, background: selectedAnnotation.bold ? '#e3f2fd' : undefined }}
                onClick={() => updateTextAnnotation(selectedAnnotation.id, { bold: !selectedAnnotation.bold })}
              >
                B
              </button>
              <button
                className={`toolbar-btn${selectedAnnotation.italic ? ' active' : ''}`}
                style={{ fontStyle: 'italic', minWidth: 32, background: selectedAnnotation.italic ? '#e3f2fd' : undefined }}
                onClick={() => updateTextAnnotation(selectedAnnotation.id, { italic: !selectedAnnotation.italic })}
              >
                I
              </button>
            </div>
          </div>
        </div>
        <button
          className="toolbar-btn danger-action"
          style={{ marginTop: 8 }}
          onClick={() => { if (confirm('Remover legenda?')) removeTextAnnotation(selectedAnnotation.id); }}
        >
          Remover Legenda
        </button>
      </div>
    );
  }

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
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <select
                className="prop-select"
                style={{ flex: 1 }}
                value={COLOR_OPTIONS.some(c => c.value === selectedWire.wireColor) ? (selectedWire.wireColor ?? '') : (selectedWire.wireColor ? '__custom__' : '')}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__custom__') return;
                  updateWireProps(selectedWire.id, { wireColor: v || undefined });
                }}
              >
                <option value="">Auto</option>
                {COLOR_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
                {selectedWire.wireColor && !COLOR_OPTIONS.some(c => c.value === selectedWire.wireColor) && (
                  <option value="__custom__">Personalizada</option>
                )}
              </select>
              <input
                type="color"
                value={selectedWire.wireColor || '#333333'}
                onChange={(e) => updateWireProps(selectedWire.id, { wireColor: e.target.value })}
                style={{ width: 28, height: 28, padding: 0, border: '1px solid #555', borderRadius: 4, cursor: 'pointer', background: 'none' }}
                title="Cor personalizada"
              />
            </div>
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
              onChange={(e) => updatePanelIO(selectedIO.id, { type: e.target.value as PanelIOType, customColor: undefined })}
            >
              {IO_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="prop-row">
            <span className="prop-label">Cor</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <select
                className="prop-select"
                style={{ flex: 1 }}
                value={selectedIO.customColor ? '__custom__' : selectedIO.type}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__custom__') return;
                  updatePanelIO(selectedIO.id, { customColor: undefined });
                }}
              >
                {IO_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label} (padrão)</option>
                ))}
                {selectedIO.customColor && (
                  <option value="__custom__">Personalizada</option>
                )}
              </select>
              <input
                type="color"
                value={selectedIO.customColor ?? IO_TYPE_COLORS[selectedIO.type]}
                onChange={(e) => updatePanelIO(selectedIO.id, { customColor: e.target.value })}
                style={{ width: 28, height: 28, padding: 0, border: '1px solid #555', borderRadius: 4, cursor: 'pointer', background: 'none' }}
                title="Cor personalizada"
              />
            </div>
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

  if (selectedBusbar) {
    const busbarInstanceId = `busbar:${selectedBusbar.id}`;
    const busbarWires = wires.filter(
      (w) => w.sourceInstanceId === busbarInstanceId || w.targetInstanceId === busbarInstanceId,
    );
    return (
      <div className="properties-panel">
        <h3>Barramento</h3>
        <div className="prop-module-header">
          <span className="prop-color-dot" style={{ background: selectedBusbar.customColor ?? BUSBAR_TYPE_COLORS[selectedBusbar.type] }} />
          <span className="prop-module-name">{selectedBusbar.label || BUSBAR_TYPE_OPTIONS.find((o) => o.value === selectedBusbar.type)?.label}</span>
        </div>
        <div className="prop-section">
          <div className="prop-row">
            <span className="prop-label">Rótulo</span>
            <input
              className="prop-input"
              value={selectedBusbar.label}
              placeholder={BUSBAR_TYPE_OPTIONS.find((o) => o.value === selectedBusbar.type)?.label}
              onChange={(e) => updateBusbarLabel(selectedBusbar.id, e.target.value)}
            />
          </div>
          <div className="prop-row">
            <span className="prop-label">Tipo</span>
            <select
              className="prop-select"
              value={selectedBusbar.type}
              onChange={(e) => updateBusbarType(selectedBusbar.id, e.target.value as BusbarType)}
            >
              {BUSBAR_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="prop-row">
            <span className="prop-label">Cor</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <select
                className="prop-select"
                style={{ flex: 1 }}
                value={selectedBusbar.customColor ? '__custom__' : selectedBusbar.type}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__custom__') return;
                  updateBusbarColor(selectedBusbar.id, undefined);
                  updateBusbarType(selectedBusbar.id, v as BusbarType);
                }}
              >
                {BUSBAR_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label} ({BUSBAR_TYPE_COLORS[o.value]})</option>
                ))}
                {selectedBusbar.customColor && (
                  <option value="__custom__">Personalizada</option>
                )}
              </select>
              <input
                type="color"
                value={selectedBusbar.customColor ?? BUSBAR_TYPE_COLORS[selectedBusbar.type]}
                onChange={(e) => updateBusbarColor(selectedBusbar.id, e.target.value)}
                style={{ width: 28, height: 28, padding: 0, border: '1px solid #555', borderRadius: 4, cursor: 'pointer', background: 'none' }}
                title="Cor personalizada"
              />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-label">Largura (px)</span>
            <input
              className="prop-input"
              type="number"
              min={20}
              step={5}
              value={Math.round(selectedBusbar.widthPx)}
              onChange={(e) => resizeBusbar(selectedBusbar.id, Number(e.target.value) || 20)}
            />
          </div>
          <div className="prop-row">
            <span className="prop-label">Fios</span>
            <span className="prop-value">{busbarWires.length}</span>
          </div>
        </div>
        <div className="prop-section" style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Pontos de conexão ({selectedBusbar.connectionPoints.length})</span>
            <button
              className="toolbar-btn"
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={() => addBusbarConnectionPoint(selectedBusbar.id)}
            >
              + Adicionar
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {selectedBusbar.connectionPoints.map((pt) => {
              const ptConnected = wires.some(
                (w) =>
                  (w.sourceInstanceId === busbarInstanceId && w.sourcePortId === pt.id) ||
                  (w.targetInstanceId === busbarInstanceId && w.targetPortId === pt.id),
              );
              return (
                <div key={pt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: ptConnected ? BUSBAR_TYPE_COLORS[selectedBusbar.type] : '#ccc',
                    flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, color: '#555' }}>
                    {pt.id.slice(0, 6)} — {Math.round(pt.offsetPercent)}%
                  </span>
                  <button
                    className="toolbar-btn danger-action"
                    style={{ fontSize: 10, padding: '1px 5px' }}
                    onClick={() => {
                      if (ptConnected) {
                        if (!confirm('Este ponto tem fios conectados. Remover mesmo assim?')) return;
                      }
                      removeBusbarConnectionPoint(selectedBusbar.id, pt.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <button
          className="toolbar-btn danger-action"
          style={{ marginTop: 8 }}
          onClick={() => { if (confirm('Remover barramento?')) removeBusbar(selectedBusbar.id); }}
        >
          Remover Barramento
        </button>
        <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
          Dica: Dê duplo-clique no barramento para adicionar pontos de conexão.
        </div>
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
        {extSpec && (
          <PropertyEditorSection
            spec={extSpec}
            instanceId={selectedModuleId}
            instanceProps={selectedExtDevice.properties}
            onUpdate={updateInstanceProperty}
          />
        )}
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
          <span className="prop-value">{Math.round(def.widthCm * 10)} mm</span>
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
        <div className="prop-row">
          <span className="prop-label">Rótulo</span>
          <input
            className="prop-input"
            value={placed.label ?? ''}
            placeholder={def.name}
            onChange={(e) => {
              const row = rows.find((r) => r.modules.some((m) => m.instanceId === selectedModuleId));
              if (row) updateLabel(row.id, selectedModuleId, e.target.value);
            }}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Fios</span>
          <span className="prop-value">{moduleWires.length}</span>
        </div>
      </div>
      {spec && (
        <PropertyEditorSection
          spec={spec}
          instanceId={selectedModuleId}
          instanceProps={placed.properties}
          onUpdate={updateInstanceProperty}
        />
      )}
      {spec && <ComponentInfoSection spec={spec} />}
      <div className="prop-hint" style={{ marginTop: 8 }}>
        Use o modo Fiação para conectar portas.
      </div>
    </div>
  );
};
