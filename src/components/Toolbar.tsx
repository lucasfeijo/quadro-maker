import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePanelStore } from '../store/panelStore';
import { saveProject, listProjects, loadProject, deleteProject, exportProject, exportCurrentState } from '../utils/storage';
import { SavedProject } from '../types';
import { getModuleById } from '../data/modules';
import { resolveLayout } from '../utils/panelLayout';
import { PanelConfigurator } from './PanelConfigurator';
import { computeWireLengthMm, resolveWireColor } from '../utils/wireLength';
import { mmToPx } from '../utils/geometry';

type OpenMenu = 'arquivo' | 'simular' | 'visualizar' | null;

interface ToolbarProps {
  viewMode: 'panel' | 'schematic';
  onViewModeChange: (mode: 'panel' | 'schematic') => void;
  simActive: boolean;
  onSimToggle: () => void;
  onExportImage?: () => void;
  onCopyImage?: () => void;
  onSelectModule?: (id: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  onViewModeChange,
  simActive,
  onSimToggle,
  onExportImage,
  onCopyImage,
  onSelectModule,
}) => {
  const { id: projectIdFromUrl } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = usePanelStore();
  const projectId = projectIdFromUrl && projectIdFromUrl !== 'new' ? projectIdFromUrl : null;
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleBackToMenu = () => {
    if (store.getIsDirty()) {
      setShowLeaveConfirmModal(true);
    } else {
      store.goToSetup();
      navigate('/');
    }
  };

  const confirmLeaveToMenu = () => {
    store.goToSetup();
    navigate('/');
    setShowLeaveConfirmModal(false);
  };

  useEffect(() => {
    if (openMenu === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  const closeMenu = () => setOpenMenu(null);

  const handleSave = () => {
    const id = saveProject(
      {
        name: store.name,
        enclosureId: store.enclosureId,
        widthUnits: store.widthUnits,
        rowCount: store.rowCount,
        exteriorWidthMm: store.exteriorWidthMm,
        exteriorHeightMm: store.exteriorHeightMm,
        rows: store.rows,
        wires: store.wires,
        panelIOs: store.panelIOs,
        externalDevices: store.externalDevices,
        textAnnotations: store.textAnnotations,
      },
      projectId ?? undefined,
    );
    store.markAsSaved();
    navigate(`/project/${id}`, { replace: projectIdFromUrl === 'new' });
    closeMenu();
  };

  const handleOpenSaveAs = () => {
    setSaveAsName(store.name);
    setShowSaveAsModal(true);
    closeMenu();
  };

  const handleConfirmSaveAs = () => {
    const name = saveAsName.trim();
    if (!name) return;
    const id = saveProject(
      {
        name,
        enclosureId: store.enclosureId,
        widthUnits: store.widthUnits,
        rowCount: store.rowCount,
        exteriorWidthMm: store.exteriorWidthMm,
        exteriorHeightMm: store.exteriorHeightMm,
        rows: store.rows,
        wires: store.wires,
        panelIOs: store.panelIOs,
        externalDevices: store.externalDevices,
        textAnnotations: store.textAnnotations,
      },
      undefined,
    );
    store.setName(name);
    store.markAsSaved();
    setShowSaveAsModal(false);
    navigate(`/project/${id}`);
  };

  const handleOpenLoad = () => {
    setSavedProjects(listProjects());
    setShowLoadModal(true);
    closeMenu();
  };

  const handleLoad = (id: string) => {
    const state = loadProject(id);
    if (state) {
      store.loadState(state);
      store.markAsSaved();
      navigate(`/project/${id}`);
    }
    setShowLoadModal(false);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      deleteProject(id);
      setConfirmDeleteId(null);
      if (projectId === id) navigate('/');
      setSavedProjects(listProjects());
    } else {
      setConfirmDeleteId(id);
    }
  };

  const getJsonString = () => {
    const entry = {
      id: '',
      name: store.name,
      state: {
        name: store.name,
        enclosureId: store.enclosureId,
        widthUnits: store.widthUnits,
        rowCount: store.rowCount,
        exteriorWidthMm: store.exteriorWidthMm,
        exteriorHeightMm: store.exteriorHeightMm,
        rows: store.rows,
        wires: store.wires,
        panelIOs: store.panelIOs,
        externalDevices: store.externalDevices,
        textAnnotations: store.textAnnotations,
      },
      updatedAt: Date.now(),
    };
    return JSON.stringify(entry, null, 2);
  };

  const handleExportJson = () => {
    exportCurrentState({
      name: store.name,
      enclosureId: store.enclosureId,
      widthUnits: store.widthUnits,
      rowCount: store.rowCount,
      exteriorWidthMm: store.exteriorWidthMm,
      exteriorHeightMm: store.exteriorHeightMm,
      rows: store.rows,
      wires: store.wires,
      panelIOs: store.panelIOs,
      externalDevices: store.externalDevices,
      textAnnotations: store.textAnnotations,
    });
    closeMenu();
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(getJsonString());
    } catch { /* ignore */ }
    closeMenu();
  };

  const handleExportImage = () => {
    onExportImage?.();
    closeMenu();
  };

  const handleCopyImage = () => {
    onCopyImage?.();
    closeMenu();
  };

  const handleExportPdf = () => {
    // no-op: placeholder para implementação futura
    closeMenu();
  };

  const handleOpenOptions = () => {
    setShowOptionsModal(true);
  };

  const handleApplyOptions = (config: {
    widthUnits: number;
    rowCount: number;
    exteriorWidthMm?: number;
    exteriorHeightMm?: number;
    railYOverrides: Record<string, number>;
    barOverhangMm?: number;
  }) => {
    store.resizePanel(config.widthUnits, config.rowCount);
    if (config.exteriorWidthMm != null && config.exteriorHeightMm != null) {
      store.setPanelDimensions(config.exteriorWidthMm, config.exteriorHeightMm);
    }
    const hasRailOverrides = Object.keys(config.railYOverrides).length > 0;
    // Update rail Y overrides and bar overhang via set
    usePanelStore.setState({
      railYOverridesMm: hasRailOverrides ? config.railYOverrides : undefined,
      barOverhangMm: config.barOverhangMm,
    });
    setShowOptionsModal(false);
  };

  const handleSimToggle = () => {
    onSimToggle();
    closeMenu();
  };

  const handleViewChange = (mode: 'panel' | 'schematic') => {
    onViewModeChange(mode);
    closeMenu();
  };

  return (
    <div className="toolbar" ref={menuRef}>
      <button className="toolbar-btn back-btn" onClick={handleBackToMenu}>
        ← Menu
      </button>
      <input
        className="toolbar-name"
        value={store.name}
        onChange={(e) => store.setName(e.target.value)}
      />
      <div className="toolbar-actions">
        <div className="toolbar-dropdown">
          <button
            className="toolbar-btn"
            onClick={() => setOpenMenu(openMenu === 'arquivo' ? null : 'arquivo')}
          >
            Projeto
          </button>
          {openMenu === 'arquivo' && (
            <div className="toolbar-dropdown-menu">
              <button className="toolbar-dropdown-item" onClick={handleOpenLoad}>
                Carregar
              </button>
              <button className="toolbar-dropdown-item" onClick={handleSave}>
                Salvar
              </button>
              <button className="toolbar-dropdown-item" onClick={handleOpenSaveAs}>
                Salvar como
              </button>
              <div className="toolbar-dropdown-divider" />
              <div className="toolbar-dropdown-item-row">
                <button className="toolbar-dropdown-item" onClick={handleExportJson}>
                  Exportar JSON
                </button>
                <button className="toolbar-dropdown-clip-btn" onClick={handleCopyJson} title="Copiar JSON para clipboard">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                </button>
              </div>
              <div className="toolbar-dropdown-item-row">
                <button className="toolbar-dropdown-item" onClick={handleExportImage} disabled={!onExportImage}>
                  Exportar imagem
                </button>
                <button className="toolbar-dropdown-clip-btn" onClick={handleCopyImage} disabled={!onCopyImage} title="Copiar imagem para clipboard">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                </button>
              </div>
              <button className="toolbar-dropdown-item" onClick={handleExportPdf} title="Em breve">
                Exportar PDF
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-dropdown">
          <button
            className={`toolbar-btn ${simActive ? 'toolbar-btn-sim-active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'simular' ? null : 'simular')}
          >
            {simActive ? 'Simulando' : 'Simular'}
          </button>
          {openMenu === 'simular' && (
            <div className="toolbar-dropdown-menu">
              <button className="toolbar-dropdown-item" onClick={handleSimToggle}>
                {simActive ? 'Parar simulação' : 'Começar simulação'}
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-dropdown">
          <button
            className="toolbar-btn"
            onClick={() => setOpenMenu(openMenu === 'visualizar' ? null : 'visualizar')}
          >
            Visualizar
          </button>
          {openMenu === 'visualizar' && (
            <div className="toolbar-dropdown-menu">
              <button
                className={`toolbar-dropdown-item ${viewMode === 'panel' ? 'toolbar-dropdown-item-active' : ''}`}
                onClick={() => handleViewChange('panel')}
              >
                Painel
              </button>
              <button
                className={`toolbar-dropdown-item ${viewMode === 'schematic' ? 'toolbar-dropdown-item-active' : ''}`}
                onClick={() => handleViewChange('schematic')}
              >
                Unifilar
              </button>
              <div className="toolbar-dropdown-divider" />
              <button
                className="toolbar-dropdown-item"
                onClick={() => { setShowReportModal(true); closeMenu(); }}
              >
                Relatório
              </button>
            </div>
          )}
        </div>

        <button className="toolbar-btn" onClick={handleOpenOptions} title="Opções do quadro">
          Opções
        </button>
      </div>

      {showSaveAsModal && (
        <div className="modal-overlay" onClick={() => setShowSaveAsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Salvar como</h3>
            <div className="options-field">
              <label>Nome do projeto:</label>
              <input
                type="text"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmSaveAs()}
                placeholder="Nome do projeto"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="toolbar-btn" style={{ flex: 1 }} onClick={handleConfirmSaveAs} disabled={!saveAsName.trim()}>
                Salvar
              </button>
              <button className="toolbar-btn" style={{ flex: 1 }} onClick={() => setShowSaveAsModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showOptionsModal && (
        <div className="modal-overlay" onClick={() => setShowOptionsModal(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h3>Opções do Quadro</h3>
            {store.enclosureId && (
              <p style={{ color: '#aaa', fontSize: 12, marginBottom: 12 }}>
                Quadro de caixa: redimensionar converte para personalizado.
              </p>
            )}
            <PanelConfigurator
              initialWidthUnits={store.widthUnits}
              initialRowCount={store.rowCount}
              initialExteriorWidthMm={store.exteriorWidthMm}
              initialExteriorHeightMm={store.exteriorHeightMm}
              initialRailYOverrides={store.railYOverridesMm}
              initialBarOverhangMm={store.barOverhangMm}
              onApply={handleApplyOptions}
              applyLabel="Aplicar"
            />
            <button className="toolbar-btn" style={{ marginTop: 8, width: '100%' }} onClick={() => setShowOptionsModal(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showLeaveConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowLeaveConfirmModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Alterações não salvas</h3>
            <p>Você tem alterações que não foram salvas. Deseja sair e descartar o progresso?</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="toolbar-btn" style={{ flex: 1 }} onClick={confirmLeaveToMenu}>
                Sair sem salvar
              </button>
              <button className="toolbar-btn" style={{ flex: 1 }} onClick={() => setShowLeaveConfirmModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (() => {
        const CATEGORY_LABELS: Record<string, string> = {
          breaker: 'Disjuntor', dr: 'Dispositivo DR', dps: 'DPS', contactor: 'Contator',
          relay: 'Relé', timer: 'Temporizador', terminal: 'Borne', ats: 'ATS',
          switch: 'Interruptor', button: 'Botão Pulsador',
        };
        const COLOR_LABELS: Record<string, string> = {
          '#333': 'Preto (Fase)', '#8b4513': 'Marrom (Fase)', '#d32f2f': 'Vermelho (Fase)', '#2196f3': 'Azul (Neutro)',
          '#4caf50': 'Verde (Terra)', '#ff9800': 'Laranja', '#9c27b0': 'Roxo', '#ffffff': 'Branco',
          '#607d8b': 'Cinza', '#e91e63': 'Rosa', '#00bcd4': 'Ciano', '#ffeb3b': 'Amarelo',
        };

        const layout = resolveLayout({
          enclosureId: store.enclosureId,
          widthUnits: store.widthUnits,
          rowCount: store.rowCount,
          rows: store.rows,
          exteriorWidthMm: store.exteriorWidthMm,
          exteriorHeightMm: store.exteriorHeightMm,
          railYOverridesMm: store.railYOverridesMm,
          barOverhangMm: store.barOverhangMm,
        });
        const wireLengthCtx = {
          rows: store.rows,
          rails: layout.rails,
          panelIOs: store.panelIOs,
          externalDevices: store.externalDevices,
          interiorOffsetXPx: mmToPx(layout.interiorOffsetXMm),
          interiorOffsetYPx: mmToPx(layout.interiorOffsetYMm),
          svgWidth: mmToPx(layout.exteriorWidthMm),
          svgHeight: mmToPx(layout.exteriorHeightMm),
        };

        const allModules: { instanceId: string; name: string; label: string; category: string; row: number }[] = [];
        store.rows.forEach((row, rowIdx) => {
          row.modules.forEach((mod) => {
            const def = getModuleById(mod.moduleId);
            allModules.push({
              instanceId: mod.instanceId,
              name: def?.name ?? mod.moduleId,
              label: mod.label ?? '',
              category: def ? (CATEGORY_LABELS[def.category] ?? def.category) : '',
              row: rowIdx + 1,
            });
          });
        });

        const getModuleName = (instanceId: string): string => {
          if (instanceId.startsWith('panel-io:')) {
            const ioId = instanceId.replace('panel-io:', '');
            const io = store.panelIOs.find((i) => i.id === ioId);
            return io?.label ?? 'E/S';
          }
          const extDev = store.externalDevices.find((d) => d.instanceId === instanceId);
          if (extDev) {
            const def = getModuleById(extDev.moduleId);
            return extDev.label || def?.name || extDev.moduleId;
          }
          for (const row of store.rows) {
            const mod = row.modules.find((m) => m.instanceId === instanceId);
            if (mod) {
              const def = getModuleById(mod.moduleId);
              return mod.label || def?.name || mod.moduleId;
            }
          }
          return instanceId.slice(0, 8);
        };

        const wireRows = store.wires.map((w) => {
          const lengthMm = computeWireLengthMm(w, wireLengthCtx);
          const hasWaypoints = (w.waypoints?.length ?? 0) > 0;
          const resolvedColor = resolveWireColor(w, wireLengthCtx);
          const colorLabel = COLOR_LABELS[resolvedColor] ?? resolvedColor;
          return {
            wireId: w.id,
            source: `${getModuleName(w.sourceInstanceId)} : ${w.sourcePortId}`,
            target: `${getModuleName(w.targetInstanceId)} : ${w.targetPortId}`,
            gauge: w.wireGaugeMm2 != null ? `${w.wireGaugeMm2} mm²` : '—',
            gaugeRaw: w.wireGaugeMm2 ?? null,
            colorHex: resolvedColor,
            colorLabel,
            lengthMm,
            hasWaypoints,
            label: w.label ?? '',
          };
        });

        const totalLengthMm = wireRows.reduce((acc, r) => acc + (r.lengthMm ?? 0), 0);

        // Somatório por cor + bitola (para saber quanto comprar de cada fio)
        const byColorGauge = new Map<string, { colorHex: string; colorLabel: string; gaugeLabel: string; totalMm: number }>();
        for (const r of wireRows) {
          const key = `${r.colorHex}|${r.gauge}`;
          const entry = byColorGauge.get(key) ?? { colorHex: r.colorHex, colorLabel: r.colorLabel, gaugeLabel: r.gauge, totalMm: 0 };
          entry.totalMm += r.lengthMm ?? 0;
          byColorGauge.set(key, entry);
        }

        const fmtLen = (mm: number) => `${(mm / 1000).toFixed(2)} m`;

        return (
          <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
            <div className="modal report-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Relatório — {store.name}</h3>

              <div className="report-section">
                <h4>Módulos ({allModules.length})</h4>
                {allModules.length === 0 ? (
                  <p className="empty-msg">Nenhum módulo colocado.</p>
                ) : (
                  <div className="report-table-wrapper">
                    <table className="report-table">
                      <thead>
                        <tr><th>Nome</th><th>Rótulo</th><th>Categoria</th><th>Trilho</th></tr>
                      </thead>
                      <tbody>
                        {allModules.map((m, i) => (
                          <tr key={i} style={{ cursor: 'pointer' }} onClick={() => { onSelectModule?.(m.instanceId); setShowReportModal(false); }}>
                            <td>{m.name}</td>
                            <td>{m.label || '—'}</td>
                            <td>{m.category}</td>
                            <td>Linha {m.row}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="report-section">
                <h4>Fios ({wireRows.length})</h4>
                {wireRows.length === 0 ? (
                  <p className="empty-msg">Nenhum fio conectado.</p>
                ) : (
                  <div className="report-table-wrapper">
                    <table className="report-table">
                      <thead>
                        <tr><th>Origem</th><th>Destino</th><th>Rótulo</th><th>Bitola</th><th>Cor</th><th>Comprimento</th></tr>
                      </thead>
                      <tbody>
                        {wireRows.map((r, i) => (
                          <tr key={i} style={{ cursor: 'pointer' }} onClick={() => { store.selectWire(r.wireId); setShowReportModal(false); }}>
                            <td>{r.source}</td>
                            <td>{r.target}</td>
                            <td>{r.label || '—'}</td>
                            <td>{r.gauge}</td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: r.colorHex, border: '1px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
                                {r.colorLabel}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {r.lengthMm != null
                                ? `${r.hasWaypoints ? '' : '≈ '}${(r.lengthMm / 1000).toFixed(2)} m`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {wireRows.length > 0 && (
                <div className="report-section">
                  <h4>Fios por bitola e cor</h4>
                  <div className="report-table-wrapper">
                    <table className="report-table">
                      <thead>
                        <tr><th>Bitola</th><th>Cor</th><th style={{ textAlign: 'right' }}>Comprimento</th></tr>
                      </thead>
                      <tbody>
                        {[...byColorGauge.values()].map((entry, i) => (
                          <tr key={i}>
                            <td>{entry.gaugeLabel}</td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: entry.colorHex, border: '1px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
                                {entry.colorLabel}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>{fmtLen(entry.totalMm)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2} style={{ fontWeight: 600 }}>Total Geral</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtLen(totalLengthMm)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              <button className="toolbar-btn" style={{ marginTop: 12 }} onClick={() => setShowReportModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        );
      })()}

      {showLoadModal && (
        <div className="modal-overlay" onClick={() => setShowLoadModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Projetos Salvos</h3>
            {savedProjects.length === 0 ? (
              <p className="empty-msg">Nenhum projeto salvo.</p>
            ) : (
              <ul className="project-list">
                {savedProjects.map((p) => (
                  <li key={p.id}>
                    <div className="project-info">
                      <strong>{p.name}</strong>
                      <span className="project-date">
                        {new Date(p.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div className="project-actions">
                      {confirmDeleteId === p.id ? (
                        <>
                          <span className="confirm-delete-label">Excluir?</span>
                          <button className="confirm-yes-btn" onClick={() => handleDelete(p.id)}>
                            Sim
                          </button>
                          <button className="confirm-no-btn" onClick={() => setConfirmDeleteId(null)}>
                            Não
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleLoad(p.id)}>Abrir</button>
                          <button onClick={() => exportProject(p.id)} title="Exportar">
                            ↓
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(p.id)}
                            title="Excluir"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              className="toolbar-btn"
              onClick={() => { setShowLoadModal(false); setConfirmDeleteId(null); }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
