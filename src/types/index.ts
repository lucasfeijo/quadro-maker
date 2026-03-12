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
  | 'ats'
  | 'switch'
  | 'button';

export type PortType = 'phase' | 'neutral' | 'ground' | 'any';
export type PortSide = 'top' | 'bottom';

export type PortDefinition = {
  id: string;
  label: string;
  side: PortSide;
  offsetXCm: number;
  type: PortType;
  maxCurrentA?: number;
};

export type ModuleDefinition = {
  id: string;
  name: string;
  widthCm: number;
  category: ModuleCategory;
  poles?: number;
  color: string;
  icon?: string;
  imageUrl?: string;
  ports: PortDefinition[];
};

export type DisplayMode = 'icon' | 'image';

// --- Wiring ---

export type WireWaypoint = {
  x: number;
  y: number;
};

export type Wire = {
  id: string;
  sourceInstanceId: string;
  sourcePortId: string;
  targetInstanceId: string;
  targetPortId: string;
  wireGaugeMm2?: number;
  wireColor?: string;
  label?: string;
  waypoints?: WireWaypoint[];
};

// --- Panel I/O (entradas e saídas do quadro) ---

export type PanelIODirection = 'input' | 'output';
export type PanelIOType = 'phase' | 'neutral' | 'ground' | 'dc_pos' | 'dc_neg' | 'signal';
export type PanelEdge = 'top' | 'bottom' | 'left' | 'right';

export type PanelIO = {
  id: string;
  label: string;
  direction: PanelIODirection;
  type: PanelIOType;
  edge: PanelEdge;
  positionPercent: number;
  voltageV?: number;
  maxCurrentA?: number;
  consumptionA?: number;
};

// --- Simulation ---

export type ComponentState = {
  instanceId: string;
  on: boolean;
  tripped: boolean;
  currentA: number;
  voltageV: number;
  mode: string;
};

// --- External Devices (fora do quadro) ---

export type ExternalDevice = {
  instanceId: string;
  moduleId: string;
  x: number;
  y: number;
  label?: string;
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
  wires: Wire[];
  panelIOs: PanelIO[];
  externalDevices: ExternalDevice[];
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
