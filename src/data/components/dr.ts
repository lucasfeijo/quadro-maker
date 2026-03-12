import type { ComponentSpec } from './_spec';
import { makePorts, makeRoutes, overcurrentTripBehavior } from './_spec';

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

const drBehavior = overcurrentTripBehavior('DR');

export const DRS: ComponentSpec[] = [
  {
    id: 'dr-2p',
    name: 'DR Bipolar',
    description: 'Dispositivo Diferencial Residual. Detecta fugas de corrente para o terra (choque elétrico) e desarma o circuito. Protege pessoas contra contato indireto. A sensibilidade define a corrente mínima de fuga que causa o desarme.',
    widthCm: 6,
    category: 'dr',
    poles: 2,
    color: '#2e7d32',
    icon: 'dr',
    ports: makePorts(2, 6, ['L', 'N'], ['phase', 'neutral']),
    portDescriptions: {
      'in-L': 'Entrada de fase (alimentação)',
      'out-L': 'Saída de fase (carga)',
      'in-N': 'Entrada de neutro (alimentação)',
      'out-N': 'Saída de neutro (carga)',
    },
    modes: drModes(['L', 'N']),
    defaultMode: 'on',
    nominalCurrentA: 25,
    properties: [
      { key: 'nominalCurrentA', label: 'Corrente nominal', type: 'select', options: NOMINAL_OPTIONS, defaultValue: 25 },
      { key: 'sensitivityMA', label: 'Sensibilidade', type: 'select', options: SENSITIVITY_OPTIONS, defaultValue: 30 },
    ],
    behavior: drBehavior,
  },
  {
    id: 'dr-4p',
    name: 'DR Tetrapolar',
    description: 'Dispositivo Diferencial Residual tetrapolar para circuitos trifásicos com neutro. Detecta fugas de corrente em qualquer uma das fases e desarma todas simultaneamente.',
    widthCm: 12,
    category: 'dr',
    poles: 4,
    color: '#1b5e20',
    icon: 'dr',
    ports: makePorts(4, 12, ['L1', 'L2', 'L3', 'N'], ['phase', 'phase', 'phase', 'neutral']),
    portDescriptions: {
      'in-L1': 'Entrada de fase 1 (alimentação)',
      'out-L1': 'Saída de fase 1 (carga)',
      'in-L2': 'Entrada de fase 2 (alimentação)',
      'out-L2': 'Saída de fase 2 (carga)',
      'in-L3': 'Entrada de fase 3 (alimentação)',
      'out-L3': 'Saída de fase 3 (carga)',
      'in-N': 'Entrada de neutro (alimentação)',
      'out-N': 'Saída de neutro (carga)',
    },
    modes: drModes(['L1', 'L2', 'L3', 'N']),
    defaultMode: 'on',
    nominalCurrentA: 32,
    properties: [
      { key: 'nominalCurrentA', label: 'Corrente nominal', type: 'select', options: NOMINAL_OPTIONS, defaultValue: 32 },
      { key: 'sensitivityMA', label: 'Sensibilidade', type: 'select', options: SENSITIVITY_OPTIONS, defaultValue: 30 },
    ],
    behavior: drBehavior,
  },
];
