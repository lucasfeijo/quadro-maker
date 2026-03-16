import type { ComponentSpec } from './_spec';
import { makePorts, makeRoutes, overcurrentTripBehavior } from './_spec';

const MODES = [
  { id: 'on', label: 'Ligado', color: '#4caf50', routes: makeRoutes(['L1', 'L2', 'L3']) },
  { id: 'off', label: 'Desligado', color: '#f44336', routes: [] as { from: string; to: string }[] },
  { id: 'tripped', label: 'Disparado', color: '#ff9800', routes: [] as { from: string; to: string }[] },
];

const NOMINAL_OPTIONS = [10, 16, 20, 25, 32, 40, 50, 63].map((v) => ({
  value: v,
  label: `${v}A`,
}));

const component: ComponentSpec = {
  id: 'breaker-3p',
  name: 'Disjuntor Tripolar',
  description: 'Protege um circuito trifásico contra sobrecarga e curto-circuito. Desarma as três fases simultaneamente quando a corrente excede o valor nominal.',
  widthMm: 54,
  category: 'breaker',
  poles: 3,
  color: '#0d47a1',
  icon: 'breaker',
  ports: makePorts(3, 54, ['L1', 'L2', 'L3'], ['phase', 'phase', 'phase']),
  portDescriptions: {
    'in-L1': 'Entrada de fase 1 (alimentação)',
    'out-L1': 'Saída de fase 1 (carga)',
    'in-L2': 'Entrada de fase 2 (alimentação)',
    'out-L2': 'Saída de fase 2 (carga)',
    'in-L3': 'Entrada de fase 3 (alimentação)',
    'out-L3': 'Saída de fase 3 (carga)',
  },
  modes: MODES,
  defaultMode: 'on',
  nominalCurrentA: 32,
  properties: [
    { key: 'nominalCurrentA', label: 'Corrente nominal', type: 'select', options: NOMINAL_OPTIONS, defaultValue: 32 },
  ],
  behavior: overcurrentTripBehavior('Disjuntor'),
};

export default component;
