import type { ComponentSpec } from './_spec';
import { makePorts, makeRoutes } from './_spec';

const MODES_BREAKER = [
  { id: 'on', label: 'Ligado', color: '#4caf50', routes: [] as { from: string; to: string }[] },
  { id: 'off', label: 'Desligado', color: '#f44336', routes: [] },
  { id: 'tripped', label: 'Disparado', color: '#ff9800', routes: [] },
];

function breakerModes(labels: string[]) {
  return MODES_BREAKER.map((m) => ({
    ...m,
    routes: m.id === 'on' ? makeRoutes(labels) : [],
  }));
}

const NOMINAL_OPTIONS = [10, 16, 20, 25, 32, 40, 50, 63].map((v) => ({
  value: v,
  label: `${v}A`,
}));

export const BREAKERS: ComponentSpec[] = [
  {
    id: 'breaker-1p',
    name: 'Disjuntor Unipolar',
    widthCm: 3,
    category: 'breaker',
    poles: 1,
    color: '#1976d2',
    icon: 'breaker',
    ports: makePorts(1, 3, ['L1'], ['phase']),
    modes: breakerModes(['L1']),
    defaultMode: 'on',
    nominalCurrentA: 16,
    properties: [
      { key: 'nominalCurrentA', label: 'Corrente nominal', type: 'select', options: NOMINAL_OPTIONS, defaultValue: 16 },
    ],
  },
  {
    id: 'breaker-2p',
    name: 'Disjuntor Bipolar',
    widthCm: 6,
    category: 'breaker',
    poles: 2,
    color: '#1565c0',
    icon: 'breaker',
    ports: makePorts(2, 6, ['L1', 'L2'], ['phase', 'phase']),
    modes: breakerModes(['L1', 'L2']),
    defaultMode: 'on',
    nominalCurrentA: 25,
    properties: [
      { key: 'nominalCurrentA', label: 'Corrente nominal', type: 'select', options: NOMINAL_OPTIONS, defaultValue: 25 },
    ],
  },
  {
    id: 'breaker-3p',
    name: 'Disjuntor Tripolar',
    widthCm: 9,
    category: 'breaker',
    poles: 3,
    color: '#0d47a1',
    icon: 'breaker',
    ports: makePorts(3, 9, ['L1', 'L2', 'L3'], ['phase', 'phase', 'phase']),
    modes: breakerModes(['L1', 'L2', 'L3']),
    defaultMode: 'on',
    nominalCurrentA: 32,
    properties: [
      { key: 'nominalCurrentA', label: 'Corrente nominal', type: 'select', options: NOMINAL_OPTIONS, defaultValue: 32 },
    ],
  },
];
