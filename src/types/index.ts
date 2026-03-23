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
  barOverhangLeftMm: number;
  barOverhangRightMm: number;
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
export type PortSide = 'top' | 'bottom' | 'left' | 'right';

export type PortDefinition = {
  id: string;
  label: string;
  side: PortSide;
  offsetXMm: number;
  /** Quando definido, o borne é posicionado verticalmente (ex.: barramentos estreitos com bornes na lateral) */
  offsetYMm?: number;
  type: PortType;
  maxCurrentA?: number;
};

export type ModuleDefinition = {
  id: string;
  name: string;
  widthMm: number;
  heightMm?: number;
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
  /** @deprecated Use types. Kept for backward compat. */
  type?: PanelIOType;
  /** Connection types - one per port. Single IO = [type], group = [phase, neutral, ground] etc. */
  types: PanelIOType[];
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
  /** Override exterior dimensions (mm). When set, rails stay centered; when unset, computed from widthUnits/rowCount. */
  exteriorWidthMm?: number;
  exteriorHeightMm?: number;
  railYOverridesMm?: Record<string, number>;
  barOverhangMm?: number;
  rows: PanelRow[];
  wires: Wire[];
  panelIOs: PanelIO[];
  externalDevices: ExternalDevice[];
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
  barOverhangLeftMm: number;
  barOverhangRightMm: number;
};

export type ResolvedLayout = {
  widthMm: number;
  heightMm: number;
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
