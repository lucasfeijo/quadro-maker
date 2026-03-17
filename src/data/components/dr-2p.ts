import type { ComponentSpec } from './_spec';
import { makePorts, makeRoutes, overcurrentTripBehavior } from './_spec';

const NOMINAL_OPTIONS = [25, 40, 63].map((v) => ({ value: v, label: `${v}A` }));
const SENSITIVITY_OPTIONS = [
  { value: 30, label: '30mA' },
  { value: 300, label: '300mA' },
];

const component: ComponentSpec = {
  id: 'dr-2p',
  name: 'DR Bipolar',
  description: 'Dispositivo Diferencial Residual. Detecta fugas de corrente para o terra (choque elétrico) e desarma o circuito. Protege pessoas contra contato indireto. A sensibilidade define a corrente mínima de fuga que causa o desarme.',
  widthMm: 36,
  category: 'dr',
  poles: 2,
  color: '#2e7d32',
  icon: 'dr',
  ports: makePorts(2, 36, ['L', 'N'], ['phase', 'neutral']),
  portDescriptions: {
    'in-L': 'Entrada de fase (alimentação)',
    'out-L': 'Saída de fase (carga)',
    'in-N': 'Entrada de neutro (alimentação)',
    'out-N': 'Saída de neutro (carga)',
  },
  modes: [
    { id: 'on', label: 'Ligado', color: '#4caf50', routes: makeRoutes(['L', 'N']) },
    { id: 'off', label: 'Desligado', color: '#f44336', routes: [] },
    { id: 'tripped', label: 'Disparado', color: '#ff9800', routes: [] },
  ],
  defaultMode: 'on',
  nominalCurrentA: 25,
  properties: [
    { key: 'nominalCurrentA', label: 'Corrente nominal', type: 'select', options: NOMINAL_OPTIONS, defaultValue: 25 },
    { key: 'sensitivityMA', label: 'Sensibilidade', type: 'select', options: SENSITIVITY_OPTIONS, defaultValue: 30 },
  ],
  behavior: overcurrentTripBehavior('DR'),
  din_mounted: true,
  screw_mounted: false,
};

export default component;
