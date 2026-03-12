export type {
  ComponentSpec,
  ModeSpec,
  InternalRoute,
  PropertySpec,
  BehaviorContext,
  BehaviorResult,
  ComponentBehavior,
} from './_spec';

import { BREAKERS } from './breaker';
import { DRS } from './dr';
import { DPSS } from './dps';
import { CONTACTORS } from './contactor';
import { RELAYS } from './relay';
import { TIMERS } from './timer';
import { ATSS } from './ats';
import { TERMINALS } from './terminal';
import { SWITCHES } from './switch';
import { BUTTONS } from './button';
import type { ComponentSpec } from './_spec';

export const allComponents: ComponentSpec[] = [
  ...TERMINALS,
  ...BREAKERS,
  ...DRS,
  ...DPSS,
  ...CONTACTORS,
  ...RELAYS,
  ...TIMERS,
  ...ATSS,
  ...SWITCHES,
  ...BUTTONS,
];

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
]);

export function isExternalComponent(id: string): boolean {
  return EXTERNAL_COMPONENT_IDS.has(id) || EXTERNAL_COMPONENT_IDS.has(LEGACY_ID_MAP[id] ?? '');
}

export { BREAKERS } from './breaker';
export { DRS } from './dr';
export { DPSS } from './dps';
export { CONTACTORS } from './contactor';
export { RELAYS } from './relay';
export { TIMERS } from './timer';
export { ATSS } from './ats';
export { TERMINALS } from './terminal';
export { SWITCHES } from './switch';
export { BUTTONS } from './button';
