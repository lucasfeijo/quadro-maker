import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePanelStore } from '../store/panelStore';
import { saveProject, listProjects, loadProject, deleteProject, exportProject, exportCurrentState } from '../utils/storage';
import { SavedProject } from '../types';
import { DIN_MODULE_1P_MM, getEnclosureById } from '../data/enclosures';

function getExteriorDimensions(
  enclosureId: string | null,
  widthUnits: number,
  rowCount: number
): { widthMm: number; heightMm: number } {
  if (enclosureId) {
    const enc = getEnclosureById(enclosureId);
    if (enc) return { widthMm: enc.exteriorWidthMm, heightMm: enc.exteriorHeightMm };
  }
  return {
    widthMm: widthUnits * DIN_MODULE_1P_MM + 120,
    heightMm: 110 + 130 * rowCount,
  };
}

type OpenMenu = 'arquivo' | 'simular' | 'visualizar' | null;

interface ToolbarProps {
  viewMode: 'panel' | 'schematic';
  onViewModeChange: (mode: 'panel' | 'schematic') => void;
  simActive: boolean;
  onSimToggle: () => void;
  onExportImage?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  onViewModeChange,
  simActive,
  onSimToggle,
  onExportImage,
}) => {
  const { id: projectIdFromUrl } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = usePanelStore();
  const projectId = projectIdFromUrl && projectIdFromUrl !== 'new' ? projectIdFromUrl : null;
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [optWidth, setOptWidth] = useState(store.widthUnits);
  const [optRows, setOptRows] = useState(store.rowCount);
  const [optWidthMm, setOptWidthMm] = useState(0);
  const [optHeightMm, setOptHeightMm] = useState(0);
  const [optWireSnap, setOptWireSnap] = useState(store.wireSnapAlignment);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
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

  const handleExportJson = () => {
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
    closeMenu();
  };

  const handleExportImage = () => {
    onExportImage?.();
    closeMenu();
  };

  const handleExportPdf = () => {
    // no-op: placeholder para implementação futura
    closeMenu();
  };

  const handleOpenOptions = () => {
    setOptWidth(store.widthUnits);
    setOptRows(store.rowCount);
    const dims = getExteriorDimensions(store.enclosureId, store.widthUnits, store.rowCount);
    setOptWidthMm(dims.widthMm);
    setOptHeightMm(dims.heightMm);
    setOptWireSnap(store.wireSnapAlignment);
    setShowOptionsModal(true);
  };

  const handleApplyOptions = () => {
    store.resizePanel(optWidth, optRows);
    store.setWireSnapAlignment(optWireSnap);
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
              <button className="toolbar-dropdown-item" onClick={handleExportJson}>
                Exportar JSON
              </button>
              <button className="toolbar-dropdown-item" onClick={handleExportImage} disabled={!onExportImage}>
                Exportar imagem
              </button>
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Opções do Quadro</h3>
            {store.enclosureId && (
              <p style={{ color: '#aaa', fontSize: 12, marginBottom: 12 }}>
                Quadro de caixa: redimensionar converte para personalizado.
              </p>
            )}
            <div className="options-field" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <label>Dimensões do quadro (exterior):</label>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min={180}
                    max={1800}
                    step={10}
                    value={optWidthMm}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v) || v <= 0) return;
                      setOptWidthMm(v);
                      const wu = Math.round((v - 120) / DIN_MODULE_1P_MM);
                      setOptWidth(Math.max(6, Math.min(56, wu)));
                    }}
                    placeholder="Largura mm"
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 11, color: '#888' }}>mm ×</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min={240}
                    max={1000}
                    step={10}
                    value={optHeightMm}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v) || v <= 0) return;
                      setOptHeightMm(v);
                      const rc = Math.round((v - 110) / 130);
                      setOptRows(Math.max(1, Math.min(6, rc)));
                    }}
                    placeholder="Altura mm"
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 11, color: '#888' }}>mm</span>
                </div>
              </div>
            </div>
            <div className="options-field">
              <label>Largura (unipolares):</label>
              <select
                value={optWidth}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setOptWidth(n);
                  setOptWidthMm(getExteriorDimensions(null, n, optRows).widthMm);
                }}
              >
                {[6, 8, 10, 12, 16, 18, 20, 24, 30, 36, 44, 56].map((n) => (
                  <option key={n} value={n}>
                    {n} unidades ({n * DIN_MODULE_1P_MM}mm)
                  </option>
                ))}
              </select>
            </div>
            <div className="options-field">
              <label>Fileiras:</label>
              <select
                value={optRows}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setOptRows(n);
                  setOptHeightMm(getExteriorDimensions(null, optWidth, n).heightMm);
                }}
              >
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
