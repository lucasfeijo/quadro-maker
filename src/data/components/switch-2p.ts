import type { ComponentSpec } from './_spec';
import { makePorts, makeRoutes } from './_spec';

const component: ComponentSpec = {
  id: 'switch-2p',
  name: 'Interruptor Bipolar',
  description: 'Interruptor de dois polos. Liga ou desliga simultaneamente dois condutores. Usado para cargas bifásicas ou quando é necessário secionar fase e neutro juntos.',
  widthMm: 60,
  category: 'switch',
  poles: 2,
  color: '#37474f',
  icon: 'switch',
  ports: makePorts(2, 60, ['L1', 'L2'], ['phase', 'phase']),
  portDescriptions: {
    'in-L1': 'Entrada polo 1 (alimentação)',
    'out-L1': 'Saída polo 1 (carga)',
    'in-L2': 'Entrada polo 2 (alimentação)',
    'out-L2': 'Saída polo 2 (carga)',
  },
  modes: [
    { id: 'on', label: 'Ligado', color: '#4caf50', routes: makeRoutes(['L1', 'L2']) },
    { id: 'off', label: 'Desligado', color: '#f44336', routes: [] },
  ],
  defaultMode: 'off',
};

export default component;
