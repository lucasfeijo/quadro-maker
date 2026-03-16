// --- Enclosure Library (real panels) ---

export type MountingHole = {
  xMm: number;
  yMm: number;
  diameterMm: number;
};

export type RailDefinition = {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  usableWidthMm: number;
  fixingMarginMm: number;
};

export type EnclosureDefinition = {
  id: string;
  brand: string;
  model: string;
  description: string;
  exteriorWidthMm: number;
  exteriorHeightMm: number;
  interiorWidthMm: number;
  interiorHeightMm: number;
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
  offsetXMm: number;
  type: PortType;
  maxCurrentA?: number;
};

export type ModuleDefinition = {
  id: string;
  name: string;
  widthMm: number;
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
  customColor?: string;
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
  properties?: Record<string, number | string>;
};

// --- Busbars (barramentos) ---

export type BusbarType = 'phase' | 'neutral' | 'ground';

export type BusbarConnectionPoint = {
  id: string;
  offsetPercent: number; // 0–100 along bar length
};

export type Busbar = {
  id: string;
  x: number;
  y: number;
  widthPx: number;
  type: BusbarType;
  label?: string;
  customColor?: string;
  connectionPoints: BusbarConnectionPoint[];
};

// --- Text Annotations ---

export type TextAnnotation = {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
};

// --- Panel State ---

export type PlacedModule = {
  instanceId: string;
  moduleId: string;
  positionMm: number;
  label?: string;
  properties?: Record<string, number | string>;
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
  busbars: Busbar[];
  textAnnotations: TextAnnotation[];
};

// --- Resolved layout for rendering ---

export type ResolvedRail = {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  usableWidthMm: number;
  fixingMarginMm: number;
};

export type ResolvedLayout = {
  exteriorWidthMm: number;
  exteriorHeightMm: number;
  interiorWidthMm: number;
  interiorHeightMm: number;
  interiorOffsetXMm: number;
  interiorOffsetYMm: number;
  rails: ResolvedRail[];
  mountingHoles: MountingHole[];
  isEnclosure: boolean;
};

// --- Drag ghost preview ---

export type GhostPreview = {
  rowId: string;
  positionMm: number;
  widthMm: number;
  color: string;
  valid: boolean;
  instanceId?: string;
};

// --- Save/Load ---

export type SavedProject = {
  id: string;
  name: string;
  state: PanelState;
  updatedAt: number;
};
