import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePanelStore } from '../store/panelStore';
import { EnclosureSelector } from './EnclosureSelector';
import { CustomPanelPreview } from './CustomPanelPreview';
import { listProjects, loadProject, deleteProject, importProject, importFromJsonString } from '../utils/storage';
import { SavedProject } from '../types';
import { DIN_MODULE_1P_MM } from '../data/enclosures';
import { resolveCustomLayout } from '../utils/panelLayout';

export const PanelConfig: React.FC = () => {
  const navigate = useNavigate();
  const store = usePanelStore();
  const [tab, setTab] = useState<'custom' | 'enclosure' | 'load'>('enclosure');
  const [widthUnits, setWidthUnits] = useState(12);
  const [rowCount, setRowCount] = useState(1);
  const [exteriorWidthMm, setExteriorWidthMm] = useState<number | undefined>(undefined);
  const [exteriorHeightMm, setExteriorHeightMm] = useState<number | undefined>(undefined);
  const [railYOverrides, setRailYOverrides] = useState<Record<string, number>>({});
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [pasteJson, setPasteJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [pasteCollapsed, setPasteCollapsed] = useState(true);

  // Auto-computed (no dimension overrides) layout for min bounds
  const defaultLayout = useMemo(
    () => resolveCustomLayout(widthUnits, rowCount),
    [widthUnits, rowCount],
  );

  // Active layout with overrides
  const previewLayout = useMemo(
    () => resolveCustomLayout(widthUnits, rowCount, exteriorWidthMm, exteriorHeightMm, railYOverrides),
    [widthUnits, rowCount, exteriorWidthMm, exteriorHeightMm, railYOverrides],
  );

  const handleWidthChange = useCallback((v: number) => {
    setWidthUnits(v);
  }, []);

  const handleRowCountChange = useCallback((v: number) => {
    setRowCount(v);
    setRailYOverrides({});
  }, []);

  const handleResizeExterior = useCallback((w: number, h: number) => {
    setExteriorWidthMm(w);
    setExteriorHeightMm(h);
  }, []);

  const handleRailYChange = useCallback((railId: string, yMm: number) => {
    setRailYOverrides(prev => ({ ...prev, [railId]: yMm }));
  }, []);

  const handleRailYReset = useCallback((railId: string) => {
    setRailYOverrides(prev => {
      const next = { ...prev };
      delete next[railId];
      return next;
    });
  }, []);

  const handleCustomStart = () => {
    const hasOverrides = exteriorWidthMm != null || exteriorHeightMm != null || Object.keys(railYOverrides).length > 0;
    store.configureCustom(widthUnits, rowCount, hasOverrides ? {
      exteriorWidthMm,
      exteriorHeightMm,
      railYOverridesMm: Object.keys(railYOverrides).length > 0 ? railYOverrides : undefined,
    } : undefined);
    navigate('/project/new');
  };

  const handleEnclosureSelect = (enclosureId: string) => {
    store.configureFromEnclosure(enclosureId);
    navigate('/project/new');
  };

  const handleLoadTab = () => {
    setSavedProjects(listProjects());
    setTab('load');
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleLoad = (id: string) => {
    const state = loadProject(id);
    if (state) {
      store.loadState(state);
      store.markAsSaved();
      navigate(`/project/${id}`);
    }
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      deleteProject(id);
      setConfirmDeleteId(null);
      setSavedProjects(listProjects());
    } else {
      setConfirmDeleteId(id);
    }
  };

  const handleImportFile = async () => {
    setImportError(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.quadro.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const entry = await importProject(file);
      if (entry) {
        setSavedProjects(listProjects());
        store.loadState(entry.state);
        store.markAsSaved();
        navigate(`/project/${entry.id}`);
      } else {
        setImportError('Arquivo inválido. Verifique o formato do JSON.');
      }
    };
    input.click();
  };

  const handleImportPaste = () => {
    setImportError(null);
    const trimmed = pasteJson.trim();
    if (!trimmed) {
      setImportError('Cole o JSON do projeto na área acima.');
      return;
    }
    const entry = importFromJsonString(trimmed);
    if (entry) {
      setSavedProjects(listProjects());
      setPasteJson('');
      store.loadState(entry.state);
      store.markAsSaved();
      navigate(`/project/${entry.id}`);
    } else {
      setImportError('JSON inválido. Verifique o formato do projeto.');
    }
  };

  return (
    <div className="setup-screen">
      <div className="setup-header">
        <h1>Quadro Maker</h1>
        <p>Diagramador de Quadros Elétricos DIN</p>
      </div>

      <div className="setup-tabs">
        <button
          className={`tab ${tab === 'enclosure' ? 'active' : ''}`}
          onClick={() => setTab('enclosure')}
        >
          Quadros da Library
        </button>
        <button
          className={`tab ${tab === 'custom' ? 'active' : ''}`}
          onClick={() => setTab('custom')}
        >
          Quadro Personalizado
        </button>
        <button
          className={`tab ${tab === 'load' ? 'active' : ''}`}
          onClick={handleLoadTab}
        >
          Carregar Projeto
        </button>
      </div>

      <div className="setup-content">
        {tab === 'custom' && (
          <div className="custom-config">
            <div className="custom-config-controls">
              <div className="config-field">
                <label>Largura (disjuntores unipolares):</label>
                <select
                  value={widthUnits}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                >
                  {[4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 30, 36].map((n) => (
                    <option key={n} value={n}>
                      {n} unidades ({n * DIN_MODULE_1P_MM}mm)
                    </option>
                  ))}
                </select>
              </div>

              <div className="config-field">
                <label>Trilhos DIN: {rowCount}</label>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={1}
                  value={rowCount}
                  onChange={(e) => handleRowCountChange(Number(e.target.value))}
                  className="row-slider"
                />
                <div className="slider-ticks">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <span key={n} className={n === rowCount ? 'active' : ''}>{n}</span>
                  ))}
                </div>
              </div>

              <div className="config-field config-dimensions">
                <label>Dimensões exteriores (mm):</label>
                <div className="dimension-inputs">
                  <div className="dim-input-group">
                    <input
                      type="number"
                      min={defaultLayout.exteriorWidthMm}
                      max={1000}
                      step={10}
                      value={exteriorWidthMm ?? ''}
                      placeholder={String(defaultLayout.exteriorWidthMm)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setExteriorWidthMm(v === '' ? undefined : Math.max(defaultLayout.exteriorWidthMm, Number(v)));
                      }}
                    />
                    <span className="dim-label">largura</span>
                  </div>
                  <span className="dim-separator">×</span>
                  <div className="dim-input-group">
                    <input
                      type="number"
                      min={defaultLayout.exteriorHeightMm}
                      max={1000}
                      step={10}
                      value={exteriorHeightMm ?? ''}
                      placeholder={String(defaultLayout.exteriorHeightMm)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setExteriorHeightMm(v === '' ? undefined : Math.max(defaultLayout.exteriorHeightMm, Number(v)));
                      }}
                    />
                    <span className="dim-label">altura</span>
                  </div>
                </div>
              </div>

              <div className="config-summary">
                <p>
                  Trilho DIN: {widthUnits * DIN_MODULE_1P_MM}mm utilizável + {Math.round(previewLayout.rails[0]?.fixingMarginMm ?? 30)}mm
                  fixação cada lado
                </p>
              </div>
              <button className="start-btn" onClick={handleCustomStart}>
                Criar Quadro
              </button>
            </div>

            <div className="custom-config-preview">
              <CustomPanelPreview
                layout={previewLayout}
                defaultLayout={defaultLayout}
                railYOverrides={railYOverrides}
                onResizeExterior={handleResizeExterior}
                onRailYChange={handleRailYChange}
                onRailYReset={handleRailYReset}
              />
            </div>
          </div>
        )}

        {tab === 'enclosure' && (
          <EnclosureSelector onSelect={handleEnclosureSelect} />
        )}

        {tab === 'load' && (
          <div className="load-list">
            <div className="import-json-section">
              <h3>Importar Projeto</h3>
              <p className="import-desc">Importe um projeto a partir de um arquivo ou cole o JSON abaixo.</p>
              <div className="import-actions">
                <button type="button" className="start-btn small" onClick={handleImportFile}>
                  Selecionar arquivo
                </button>
                <button type="button" className="secondary-btn small" onClick={() => setPasteCollapsed((c) => !c)}>
                  {pasteCollapsed ? 'Colar JSON' : 'Colapsar'}
                </button>
              </div>
              {!pasteCollapsed && (
              <div className="import-paste">
                <textarea
                  placeholder='Cole o JSON do projeto aqui (ex.: {"name":"Meu Projeto","state":{...}})'
                  value={pasteJson}
                  onChange={(e) => setPasteJson(e.target.value)}
                  rows={4}
                />
                <button type="button" className="start-btn small" onClick={handleImportPaste}>
                  Importar do texto
                </button>
              </div>
              )}
              {importError && <p className="import-error">{importError}</p>}
            </div>
            <h3 className="projects-list-title">Projetos salvos</h3>
            {savedProjects.length === 0 ? (
              <p className="empty-msg">Nenhum projeto salvo.</p>
            ) : (
              <ul className="project-list setup-project-list">
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
                          <button
                            className="start-btn small"
                            onClick={() => handleLoad(p.id)}
                          >
                            Abrir
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
          </div>
        )}
      </div>
    </div>
  );
};
