import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePanelStore } from '../store/panelStore';
import { EnclosureSelector } from './EnclosureSelector';
import { PanelConfigurator } from './PanelConfigurator';
import { listProjects, loadProject, deleteProject, importProject, importFromJsonString } from '../utils/storage';
import { SavedProject } from '../types';

export const PanelConfig: React.FC = () => {
  const navigate = useNavigate();
  const store = usePanelStore();
  const [tab, setTab] = useState<'custom' | 'enclosure' | 'load'>('enclosure');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [pasteJson, setPasteJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [pasteCollapsed, setPasteCollapsed] = useState(true);

  const handleCustomApply = useCallback((config: {
    widthUnits: number;
    rowCount: number;
    exteriorWidthMm?: number;
    exteriorHeightMm?: number;
    railYOverrides: Record<string, number>;
    barOverhangMm?: number;
  }) => {
    const hasOverrides = config.exteriorWidthMm != null || config.exteriorHeightMm != null || Object.keys(config.railYOverrides).length > 0 || config.barOverhangMm != null;
    store.configureCustom(config.widthUnits, config.rowCount, hasOverrides ? {
      exteriorWidthMm: config.exteriorWidthMm,
      exteriorHeightMm: config.exteriorHeightMm,
      railYOverridesMm: Object.keys(config.railYOverrides).length > 0 ? config.railYOverrides : undefined,
      barOverhangMm: config.barOverhangMm,
    } : undefined);
    navigate('/project/new');
  }, [store, navigate]);

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
          <PanelConfigurator
            initialWidthUnits={12}
            initialRowCount={1}
            onApply={handleCustomApply}
            applyLabel="Criar Quadro"
          />
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
