import React, { useState } from 'react';
import { usePanelStore } from '../store/panelStore';
import { saveProject, listProjects, loadProject, deleteProject } from '../utils/storage';
import { SavedProject } from '../types';

interface ToolbarProps {
  viewMode: 'panel' | 'schematic';
  onViewModeChange: (mode: 'panel' | 'schematic') => void;
  simActive: boolean;
  onSimToggle: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ viewMode, onViewModeChange, simActive, onSimToggle }) => {
  const store = usePanelStore();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);

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
      },
      projectId ?? undefined,
    );
    setProjectId(id);
  };

  const handleOpenLoad = () => {
    setSavedProjects(listProjects());
    setShowLoadModal(true);
  };

  const handleLoad = (id: string) => {
    const state = loadProject(id);
    if (state) {
      store.loadState(state);
      setProjectId(id);
    }
    setShowLoadModal(false);
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    setSavedProjects(listProjects());
  };

  return (
    <div className="toolbar">
      <button className="toolbar-btn back-btn" onClick={store.goToSetup}>
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
        <button className="toolbar-btn" onClick={handleSave}>
          Salvar
        </button>
        <button className="toolbar-btn" onClick={handleOpenLoad}>
          Carregar
        </button>
      </div>

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
                        {new Date(p.updatedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="project-actions">
                      <button onClick={() => handleLoad(p.id)}>Abrir</button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(p.id)}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              className="toolbar-btn"
              onClick={() => setShowLoadModal(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
