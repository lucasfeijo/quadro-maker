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
  type: 'number' | 'select';
  options?: Array<{ value: number | string; label: string }>;
  defaultValue: number | string;
}

export interface ComponentSpec extends ModuleDefinition {
  modes: ModeSpec[];
  defaultMode: string;
  properties?: PropertySpec[];
  nominalCurrentA?: number;
}

export function makePorts(
  poles: number,
  widthCm: number,
  labels: string[],
  types: PortDefinition['type'][],
): PortDefinition[] {
  const ports: PortDefinition[] = [];
  const spacing = widthCm / (poles + 1);
  for (let i = 0; i < poles; i++) {
    const offset = spacing * (i + 1);
    const label = labels[i] ?? `P${i + 1}`;
    const pType = types[i] ?? 'phase';
    ports.push({ id: `in-${label}`, label, side: 'top', offsetXCm: offset, type: pType });
    ports.push({ id: `out-${label}`, label, side: 'bottom', offsetXCm: offset, type: pType });
  }
  return ports;
}

export function makeRoutes(labels: string[]): InternalRoute[] {
  return labels.map((l) => ({ from: `in-${l}`, to: `out-${l}` }));
}
