// --- Enclosure Library (real panels) ---

export type MountingHole = {
  xCm: number;
  yCm: number;
  diameterMm: number;
};

export type RailDefinition = {
  id: string;
  xCm: number;
  yCm: number;
  widthCm: number;
  usableWidthCm: number;
  fixingMarginCm: number;
};

export type EnclosureDefinition = {
  id: string;
  brand: string;
  model: string;
  description: string;
  exteriorWidthCm: number;
  exteriorHeightCm: number;
  interiorWidthCm: number;
  interiorHeightCm: number;
  rails: RailDefinition[];
  mountingHoles: MountingHole[];
};

// --- DIN Modules ---

export type ModuleCategory =
  | 'breaker'
  | 'dr'
  | 'dps'
  | 'contactor'
  | 'relay'
  | 'timer'
  | 'terminal'
  | 'ats';

export type ModuleDefinition = {
  id: string;
  name: string;
  widthCm: number;
  category: ModuleCategory;
  poles?: number;
  color: string;
};

// --- Panel State ---

export type PlacedModule = {
  instanceId: string;
  moduleId: string;
  positionCm: number;
  label?: string;
};

export type PanelRow = {
  id: string;
  modules: PlacedModule[];
};

export type PanelState = {
  name: string;
  enclosureId: string | null;
  widthUnits: number;
  rowCount: number;
  rows: PanelRow[];
};

// --- Resolved layout for rendering ---

export type ResolvedRail = {
  id: string;
  xCm: number;
  yCm: number;
  widthCm: number;
  usableWidthCm: number;
  fixingMarginCm: number;
};

export type ResolvedLayout = {
  exteriorWidthCm: number;
  exteriorHeightCm: number;
  interiorWidthCm: number;
  interiorHeightCm: number;
  interiorOffsetXCm: number;
  interiorOffsetYCm: number;
  rails: ResolvedRail[];
  mountingHoles: MountingHole[];
  isEnclosure: boolean;
};

// --- Drag ghost preview ---

export type GhostPreview = {
  rowId: string;
  positionCm: number;
  widthCm: number;
  color: string;
  valid: boolean;
};

// --- Save/Load ---

export type SavedProject = {
  id: string;
  name: string;
  state: PanelState;
  updatedAt: number;
};
