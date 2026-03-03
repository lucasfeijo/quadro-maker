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
