import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePanelStore } from '../store/panelStore';
import { EnclosureSelector } from './EnclosureSelector';
import { listProjects, loadProject, deleteProject } from '../utils/storage';
import { SavedProject } from '../types';
import { DIN_MODULE_1P_MM } from '../data/enclosures';

export const PanelConfig: React.FC = () => {
  const navigate = useNavigate();
  const store = usePanelStore();
  const [tab, setTab] = useState<'custom' | 'enclosure' | 'load'>('enclosure');
  const [widthUnits, setWidthUnits] = useState(12);
  const [rowCount, setRowCount] = useState(1);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);

  const handleCustomStart = () => {
    store.configureCustom(widthUnits, rowCount);
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
            <div className="config-field">
              <label>Largura (disjuntores unipolares):</label>
              <select
                value={widthUnits}
                onChange={(e) => setWidthUnits(Number(e.target.value))}
              >
                {[6, 8, 10, 12, 16, 18, 20, 24, 30, 36].map((n) => (
                  <option key={n} value={n}>
                    {n} unidades ({n * DIN_MODULE_1P_MM}mm)
                  </option>
                ))}
              </select>
            </div>
            <div className="config-field">
              <label>Número de fileiras:</label>
              <select
                value={rowCount}
                onChange={(e) => setRowCount(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} fileira{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="config-summary">
              <p>
                Trilho DIN: {widthUnits * DIN_MODULE_1P_MM}mm utilizável + 30mm
                fixação cada lado = {widthUnits * DIN_MODULE_1P_MM + 60}mm total
              </p>
              <p>Subunidade mínima: {DIN_MODULE_1P_MM}mm (snap grid)</p>
            </div>
            <button className="start-btn" onClick={handleCustomStart}>
              Criar Quadro
            </button>
          </div>
        )}

        {tab === 'enclosure' && (
          <EnclosureSelector onSelect={handleEnclosureSelect} />
        )}

        {tab === 'load' && (
          <div className="load-list">
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
