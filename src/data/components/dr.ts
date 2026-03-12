import type { ComponentSpec } from './_spec';
import { makePorts, makeRoutes } from './_spec';

const NOMINAL_OPTIONS = [25, 40, 63].map((v) => ({ value: v, label: `${v}A` }));
const SENSITIVITY_OPTIONS = [
  { value: 30, label: '30mA' },
  { value: 300, label: '300mA' },
];

function drModes(labels: string[]) {
  return [
    { id: 'on', label: 'Ligado', color: '#4caf50', routes: makeRoutes(labels) },
    { id: 'off', label: 'Desligado', color: '#f44336', routes: [] },
    { id: 'tripped', label: 'Disparado', color: '#ff9800', routes: [] },
  ];
}

export const DRS: ComponentSpec[] = [
  {
    id: 'dr-2p',
    name: 'DR Bipolar',
    widthCm: 6,
    category: 'dr',
    poles: 2,
    color: '#2e7d32',
    icon: 'dr',
    ports: makePorts(2, 6, ['L', 'N'], ['phase', 'neutral']),
    modes: drModes(['L', 'N']),
    defaultMode: 'on',
    nominalCurrentA: 25,
    properties: [
      { key: 'nominalCurrentA', label: 'Corrente nominal', type: 'select', options: NOMINAL_OPTIONS, defaultValue: 25 },
      { key: 'sensitivityMA', label: 'Sensibilidade', type: 'select', options: SENSITIVITY_OPTIONS, defaultValue: 30 },
    ],
  },
  {
    id: 'dr-4p',
    name: 'DR Tetrapolar',
    widthCm: 12,
    category: 'dr',
    poles: 4,
    color: '#1b5e20',
    icon: 'dr',
    ports: makePorts(4, 12, ['L1', 'L2', 'L3', 'N'], ['phase', 'phase', 'phase', 'neutral']),
    modes: drModes(['L1', 'L2', 'L3', 'N']),
    defaultMode: 'on',
    nominalCurrentA: 32,
    properties: [
      { key: 'nominalCurrentA', label: 'Corrente nominal', type: 'select', options: NOMINAL_OPTIONS, defaultValue: 32 },
      { key: 'sensitivityMA', label: 'Sensibilidade', type: 'select', options: SENSITIVITY_OPTIONS, defaultValue: 30 },
    ],
  },
];
