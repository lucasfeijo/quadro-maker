export type {
  ComponentSpec,
  ModeSpec,
  InternalRoute,
  PropertySpec,
  BehaviorContext,
  BehaviorResult,
  ComponentBehavior,
} from './_spec';

import type { ComponentSpec } from './_spec';

const modules = import.meta.glob<{ default: ComponentSpec }>(
  ['./*.ts', '!./_spec.ts', '!./index.ts'],
  { eager: true },
);

export const allComponents: ComponentSpec[] = Object.values(modules).map((m) => m.default);

const byId = new Map<string, ComponentSpec>();
for (const c of allComponents) byId.set(c.id, c);

const LEGACY_ID_MAP: Record<string, string> = {
  'terminal-1': 'terminal',
  relay: 'relay-1no',
  timer: 'timer-on-delay',
  'ats-2p': 'ats-auto',
  'button-1p': 'button-no',
};

export function getComponentById(id: string): ComponentSpec | undefined {
  return byId.get(id) ?? byId.get(LEGACY_ID_MAP[id] ?? '');
}

export const EXTERNAL_COMPONENT_IDS = new Set([
  'switch-1p',
  'switch-2p',
  'switch-3way',
  'button-no',
  'button-nc',
  'button-1p',
  'led',
  'busbar-screw-8p-phase',
  'busbar-screw-8p-neutral',
  'busbar-screw-8p-ground',
]);

export function isExternalComponent(id: string): boolean {
  return EXTERNAL_COMPONENT_IDS.has(id) || EXTERNAL_COMPONENT_IDS.has(LEGACY_ID_MAP[id] ?? '');
}

export function isScrewMounted(id: string): boolean {
  const spec = byId.get(id) ?? byId.get(LEGACY_ID_MAP[id] ?? '');
  return spec?.screw_mounted === true;
}
