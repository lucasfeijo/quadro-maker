import type { ModuleDefinition, PortDefinition } from '../../types';

export interface InternalRoute {
  from: string;
  to: string;
}

export interface ModeSpec {
  id: string;
  label: string;
  color: string;
  routes: InternalRoute[];
}

export interface PropertySpec {
  key: string;
  label: string;
  type: 'number' | 'select' | 'color';
  options?: Array<{ value: number | string; label: string }>;
  defaultValue: number | string;
}

// ---- Behavior system ----

export interface BehaviorContext {
  /** Check if a specific port on this instance received energy this pass */
  isPortEnergized: (portId: string) => boolean;
  /** Current simulation mode of this instance */
  currentMode: string;
  /** Whether the user manually set the mode (should generally be respected) */
  isManualOverride: boolean;
  /** Actual current flowing through the component (A) */
  currentA: number;
  /** Configured nominal current for protection devices (A) */
  nominalCurrentA: number;
  /** Voltage at the component (V) */
  voltageV: number;
  /** How long (ms) the component has been in its current mode. Tracked externally. */
  elapsedInModeMs: number;
  /** Per-instance property values set by the user (falls back to spec defaults) */
  getProperty: (key: string) => number | string | undefined;
}

export interface BehaviorResult {
  /** New mode to switch to (omit to keep current) */
  mode?: string;
  /** Mark the component as tripped */
  tripped?: boolean;
  /** Alerts to emit */
  alerts?: Array<{ type: 'overload' | 'short-circuit' | 'tripped' | 'info'; message: string }>;
}

export type ComponentBehavior = (ctx: BehaviorContext) => BehaviorResult | void;

// ---- Component Spec ----

export interface ComponentSpec extends ModuleDefinition {
  modes: ModeSpec[];
  defaultMode: string;
  properties?: PropertySpec[];
  nominalCurrentA?: number;
  description?: string;
  portDescriptions?: Record<string, string>;
  /** Custom behavior function called each simulation pass */
  behavior?: ComponentBehavior;
  /** Encaixa no trilho DIN (snap em trilhos) */
  din_mounted?: boolean;
  /** Posicionamento livre por parafusos (x, y arbitrários) */
  screw_mounted?: boolean;
}

// ---- Helpers ----

export function makePorts(
  poles: number,
  widthMm: number,
  labels: string[],
  types: PortDefinition['type'][],
): PortDefinition[] {
  const ports: PortDefinition[] = [];
  const spacing = widthMm / (poles + 1);
  for (let i = 0; i < poles; i++) {
    const offset = spacing * (i + 1);
    const label = labels[i] ?? `P${i + 1}`;
    const pType = types[i] ?? 'phase';
    ports.push({ id: `in-${label}`, label, side: 'top', offsetXMm: offset, type: pType });
    ports.push({ id: `out-${label}`, label, side: 'bottom', offsetXMm: offset, type: pType });
  }
  return ports;
}

export function makeRoutes(labels: string[]): InternalRoute[] {
  return labels.map((l) => ({ from: `in-${l}`, to: `out-${l}` }));
}

/**
 * Cria portas distribuídas verticalmente (para barramentos estreitos).
 * Largura fixa 10mm; uma única coluna de bornes centralizados e equidistantes.
 * Cada borne aceita conexões por qualquer lado (modelado como um único ponto).
 */
export function makePortsVertical(
  count: number,
  heightMm: number,
  labels: string[],
  types: PortDefinition['type'][],
): PortDefinition[] {
  const ports: PortDefinition[] = [];
  const spacing = heightMm / (count + 1);
  const centerX = 5; // 10mm / 2 - bornes centralizados
  for (let i = 0; i < count; i++) {
    const offsetY = spacing * (i + 1);
    const label = labels[i] ?? `${i + 1}`;
    const pType = types[i] ?? 'phase';
    ports.push({
      id: label,
      label,
      side: 'right',
      offsetXMm: centerX,
      offsetYMm: offsetY,
      type: pType,
    });
  }
  return ports;
}

/**
 * Cria portas distribuídas horizontalmente (para barramentos parafuso - barra horizontal).
 * Portas no centro do corpo, espaçadas ao longo da largura.
 */
export function makePortsHorizontal(
  count: number,
  widthMm: number,
  labels: string[],
  types: PortDefinition['type'][],
): PortDefinition[] {
  const ports: PortDefinition[] = [];
  const spacing = widthMm / (count + 1);
  const centerY = 4; // altura da barra ~8mm / 2
  for (let i = 0; i < count; i++) {
    const offsetX = spacing * (i + 1);
    const label = labels[i] ?? `${i + 1}`;
    const pType = types[i] ?? 'phase';
    ports.push({
      id: label,
      label,
      side: 'top',
      offsetXMm: offsetX,
      offsetYMm: centerY,
      type: pType,
    });
  }
  return ports;
}

/** Rotas que interligam todos os bornes (barramento - todos eletricamente comuns). */
export function makeRoutesBusbar(labels: string[]): InternalRoute[] {
  const routes: InternalRoute[] = [];
  for (let i = 0; i < labels.length - 1; i++) {
    routes.push({ from: labels[i], to: labels[i + 1] });
  }
  return routes;
}

// Common behavior builders

export function coilDrivenBehavior(
  coilPort: string,
  energizedMode: string,
  defaultMode: string,
): ComponentBehavior {
  return (ctx) => {
    if (ctx.isManualOverride) return;
    const coilOn = ctx.isPortEnergized(coilPort);
    const target = coilOn ? energizedMode : defaultMode;
    if (target !== ctx.currentMode) return { mode: target };
  };
}

export function overcurrentTripBehavior(label: string): ComponentBehavior {
  return (ctx) => {
    const nominal = Number(ctx.getProperty('nominalCurrentA')) || ctx.nominalCurrentA;
    if (nominal > 0 && ctx.currentA > nominal) {
      return {
        mode: 'tripped',
        tripped: true,
        alerts: [{
          type: 'tripped',
          message: `${label} disparou: ${ctx.currentA.toFixed(1)}A > ${nominal}A`,
        }],
      };
    }
  };
}

export function sourcePriorityBehavior(
  sources: Array<{ ports: string[]; mode: string }>,
  fallbackMode: string,
): ComponentBehavior {
  return (ctx) => {
    if (ctx.isManualOverride) return;
    for (const src of sources) {
      if (src.ports.some((p) => ctx.isPortEnergized(p))) {
        if (ctx.currentMode !== src.mode) return { mode: src.mode };
        return;
      }
    }
    if (ctx.currentMode !== fallbackMode) return { mode: fallbackMode };
  };
}

/** Comportamento para relés de proteção que monitoram fases (ex: falta de fase).
 * Quando todas as fases indicadas estão energizadas → modo "on".
 * Quando alguma falta → modo "off". */
export function phaseMonitorBehavior(
  phasePorts: string[],
  okMode: string,
  faultMode: string,
): ComponentBehavior {
  return (ctx) => {
    if (ctx.isManualOverride) return;
    const allPhasesOk = phasePorts.every((p) => ctx.isPortEnergized(p));
    const target = allPhasesOk ? okMode : faultMode;
    if (target !== ctx.currentMode) {
      return {
        mode: target,
        alerts: !allPhasesOk
          ? [{ type: 'tripped' as const, message: 'Relé disparou: falta de fase detectada' }]
          : undefined,
      };
    }
  };
}
