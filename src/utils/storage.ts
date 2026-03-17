import { nanoid } from 'nanoid';
import { PanelState, SavedProject } from '../types';

const STORAGE_KEY = 'quadro-maker:projects';

function readAll(): SavedProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedProject[];
  } catch {
    return [];
  }
}

function writeAll(projects: SavedProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function listProjects(): SavedProject[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveProject(state: PanelState, existingId?: string): string {
  const projects = readAll();
  const id = existingId ?? nanoid();
  const idx = projects.findIndex((p) => p.id === id);
  const entry: SavedProject = {
    id,
    name: state.name,
    state,
    updatedAt: Date.now(),
  };
  if (idx >= 0) {
    projects[idx] = entry;
  } else {
    projects.push(entry);
  }
  writeAll(projects);
  return id;
}

export function loadProject(id: string): PanelState | null {
  const projects = readAll();
  const proj = projects.find((p) => p.id === id);
  return proj?.state ?? null;
}

export function deleteProject(id: string) {
  const projects = readAll().filter((p) => p.id !== id);
  writeAll(projects);
}

export function exportProject(id: string) {
  const proj = readAll().find((p) => p.id === id);
  if (!proj) return;
  const json = JSON.stringify(proj, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${proj.name.replace(/[^a-zA-Z0-9À-ú _-]/g, '')}.quadro.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCurrentState(state: PanelState) {
  const entry: SavedProject = {
    id: nanoid(),
    name: state.name,
    state,
    updatedAt: Date.now(),
  };
  const json = JSON.stringify(entry, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.name.replace(/[^a-zA-Z0-9À-ú _-]/g, '')}.quadro.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseAndSaveProject(jsonString: string): SavedProject | null {
  try {
    const data = JSON.parse(jsonString) as SavedProject;
    if (!data.state || !data.name) return null;
    const id = nanoid();
    const entry: SavedProject = { ...data, id, updatedAt: Date.now() };
    const projects = readAll();
    projects.push(entry);
    writeAll(projects);
    return entry;
  } catch {
    return null;
  }
}

export function importProject(file: File): Promise<SavedProject | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(parseAndSaveProject(reader.result as string));
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

export function importFromJsonString(jsonString: string): SavedProject | null {
  return parseAndSaveProject(jsonString);
}
