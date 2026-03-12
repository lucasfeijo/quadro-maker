import type { ComponentSpec } from './_spec';
import { makePorts, makeRoutes } from './_spec';

export const SWITCHES: ComponentSpec[] = [
  {
    id: 'switch-1p',
    name: 'Interruptor Unipolar',
    widthCm: 3,
    category: 'switch',
    poles: 1,
    color: '#455a64',
    icon: 'switch',
    ports: makePorts(1, 3, ['L1'], ['phase']),
    modes: [
      { id: 'on', label: 'Ligado', color: '#4caf50', routes: makeRoutes(['L1']) },
      { id: 'off', label: 'Desligado', color: '#f44336', routes: [] },
    ],
    defaultMode: 'off',
  },
  {
    id: 'switch-2p',
    name: 'Interruptor Bipolar',
    widthCm: 6,
    category: 'switch',
    poles: 2,
    color: '#37474f',
    icon: 'switch',
    ports: makePorts(2, 6, ['L1', 'L2'], ['phase', 'phase']),
    modes: [
      { id: 'on', label: 'Ligado', color: '#4caf50', routes: makeRoutes(['L1', 'L2']) },
      { id: 'off', label: 'Desligado', color: '#f44336', routes: [] },
    ],
    defaultMode: 'off',
  },
  {
    id: 'switch-3way',
    name: 'Interruptor 3-Way',
    widthCm: 3,
    category: 'switch',
    poles: 1,
    color: '#546e7a',
    icon: 'switch',
    ports: [
      { id: 'in-COM', label: 'COM', side: 'top', offsetXCm: 1.5, type: 'phase' },
      { id: 'out-L1', label: 'L1', side: 'bottom', offsetXCm: 0.9, type: 'phase' },
      { id: 'out-L2', label: 'L2', side: 'bottom', offsetXCm: 2.1, type: 'phase' },
    ],
    modes: [
      { id: 'pos1', label: 'Posição 1', color: '#4caf50', routes: [{ from: 'in-COM', to: 'out-L1' }] },
      { id: 'pos2', label: 'Posição 2', color: '#2196f3', routes: [{ from: 'in-COM', to: 'out-L2' }] },
    ],
    defaultMode: 'pos1',
  },
];
