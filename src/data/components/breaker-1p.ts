import type { ComponentSpec } from './_spec';
import { makePorts, makeRoutes, overcurrentTripBehavior } from './_spec';

const MODES = [
  { id: 'on', label: 'Ligado', color: '#4caf50', routes: makeRoutes(['L1']) },
  { id: 'off', label: 'Desligado', color: '#f44336', routes: [] as { from: string; to: string }[] },
  { id: 'tripped', label: 'Disparado', color: '#ff9800', routes: [] as { from: string; to: string }[] },
];

const NOMINAL_OPTIONS = [10, 16, 20, 25, 32, 40, 50, 63].map((v) => ({
  value: v,
  label: `${v}A`,
}));

const component: ComponentSpec = {
  id: 'breaker-1p',
  name: 'Disjuntor Unipolar',
  description: 'Protege um circuito monofásico contra sobrecarga e curto-circuito. Quando a corrente ultrapassa o valor nominal, o disjuntor desarma automaticamente, interrompendo o circuito.',
  widthMm: 18,
  category: 'breaker',
  poles: 1,
  color: '#1976d2',
  icon: 'breaker',
  ports: makePorts(1, 18, ['L1'], ['phase']),
  portDescriptions: {
    'in-L1': 'Entrada de fase (alimentação)',
    'out-L1': 'Saída de fase (carga)',
  },
  modes: MODES,
  defaultMode: 'on',
  nominalCurrentA: 16,
  properties: [
    { key: 'nominalCurrentA', label: 'Corrente nominal', type: 'select', options: NOMINAL_OPTIONS, defaultValue: 16 },
  ],
  behavior: overcurrentTripBehavior('Disjuntor'),
  din_mounted: true,
  screw_mounted: false,
};

export default component;
