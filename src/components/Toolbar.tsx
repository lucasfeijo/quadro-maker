import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePanelStore } from '../store/panelStore';
import { saveProject, listProjects, loadProject, deleteProject, exportProject, exportCurrentState, importProject } from '../utils/storage';
import { SavedProject } from '../types';
import { DIN_MODULE_1P_MM } from '../data/enclosures';

interface ToolbarProps {
  viewMode: 'panel' | 'schematic';
  onViewModeChange: (mode: 'panel' | 'schematic') => void;
  simActive: boolean;
  onSimToggle: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ viewMode, onViewModeChange, simActive, onSimToggle }) => {
  const { id: projectIdFromUrl } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = usePanelStore();
  const projectId = projectIdFromUrl && projectIdFromUrl !== 'new' ? projectIdFromUrl : null;
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [optWidth, setOptWidth] = useState(store.widthUnits);
  const [optRows, setOptRows] = useState(store.rowCount);
  const [optWireSnap, setOptWireSnap] = useState(store.wireSnapAlignment);

  const handleSave = () => {
    const id = saveProject(
      {
        name: store.name,
        enclosureId: store.enclosureId,
        widthUnits: store.widthUnits,
        rowCount: store.rowCount,
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
  };

  const handleOpenLoad = () => {
    setSavedProjects(listProjects());
    setShowLoadModal(true);
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

  const handleExportCurrent = () => {
    exportCurrentState({
      name: store.name,
      enclosureId: store.enclosureId,
      widthUnits: store.widthUnits,
      rowCount: store.rowCount,
      rows: store.rows,
      wires: store.wires,
      panelIOs: store.panelIOs,
      externalDevices: store.externalDevices,
      textAnnotations: store.textAnnotations,
    });
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.quadro.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const entry = await importProject(file);
      if (entry) {
        store.loadState(entry.state);
        store.markAsSaved();
        navigate(`/project/${entry.id}`);
        setShowLoadModal(false);
      } else {
        alert('Arquivo inválido.');
      }
    };
    input.click();
  };

  const handleOpenOptions = () => {
    setOptWidth(store.widthUnits);
    setOptRows(store.rowCount);
    setOptWireSnap(store.wireSnapAlignment);
    setShowOptionsModal(true);
  };

  const handleApplyOptions = () => {
    store.resizePanel(optWidth, optRows);
    store.setWireSnapAlignment(optWireSnap);
    setShowOptionsModal(false);
  };

  return (
    <div className="toolbar">
      <button className="toolbar-btn back-btn" onClick={() => { store.goToSetup(); navigate('/'); }}>
        ← Voltar
      </button>
      <input
        className="toolbar-name"
        value={store.name}
        onChange={(e) => store.setName(e.target.value)}
      />
      <div className="toolbar-actions">
        <button
          className="toolbar-btn"
          onClick={() =>
            store.setDisplayMode(store.displayMode === 'icon' ? 'image' : 'icon')
          }
          title="Alternar entre ícones esquemáticos e fotos"
        >
          {store.displayMode === 'icon' ? '🔧 Ícones' : '📷 Fotos'}
        </button>
        <div className="toolbar-view-toggle">
          <button
            className={`toolbar-btn ${viewMode === 'panel' ? 'toolbar-btn-active' : ''}`}
            onClick={() => onViewModeChange('panel')}
          >
            Painel
          </button>
          <button
            className={`toolbar-btn ${viewMode === 'schematic' ? 'toolbar-btn-active' : ''}`}
            onClick={() => onViewModeChange('schematic')}
          >
            Unifilar
          </button>
        </div>
        <button
          className={`toolbar-btn ${simActive ? 'toolbar-btn-sim-active' : ''}`}
          onClick={onSimToggle}
          title="Ligar/desligar simulação"
        >
          {simActive ? '⚡ Simulando' : '⚡ Simular'}
        </button>
        <button className="toolbar-btn" onClick={handleOpenOptions} title="Opções do quadro">
          Opções
        </button>
        <button className="toolbar-btn" onClick={handleSave}>
          Salvar
        </button>
        <button className="toolbar-btn" onClick={handleOpenLoad}>
          Carregar
        </button>
        <button className="toolbar-btn" onClick={handleExportCurrent} title="Exportar projeto atual como arquivo">
          Exportar
        </button>
        <button className="toolbar-btn" onClick={handleImport} title="Importar projeto de arquivo">
          Importar
        </button>
      </div>

      {showOptionsModal && (
        <div className="modal-overlay" onClick={() => setShowOptionsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Opções do Quadro</h3>
            {store.enclosureId && (
              <p style={{ color: '#aaa', fontSize: 12, marginBottom: 12 }}>
                Quadro de caixa: redimensionar converte para personalizado.
              </p>
            )}
            <div className="options-field">
              <label>Largura (unipolares):</label>
              <select value={optWidth} onChange={(e) => setOptWidth(Number(e.target.value))}>
                {[6, 8, 10, 12, 16, 18, 20, 24, 30, 36, 44, 56].map((n) => (
                  <option key={n} value={n}>
                    {n} unidades ({n * DIN_MODULE_1P_MM}mm)
                  </option>
                ))}
              </select>
            </div>
            <div className="options-field">
              <label>Fileiras:</label>
              <select value={optRows} onChange={(e) => setOptRows(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} fileira{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="options-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="opt-wire-snap"
                checked={optWireSnap}
                onChange={(e) => setOptWireSnap(e.target.checked)}
              />
              <label htmlFor="opt-wire-snap" style={{ marginBottom: 0 }}>
                Alinhamento Manhattan nos fios (trava H/V ao arrastar vértices)
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="toolbar-btn" style={{ flex: 1 }} onClick={handleApplyOptions}>
                Aplicar
              </button>
              <button className="toolbar-btn" style={{ flex: 1 }} onClick={() => setShowOptionsModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
