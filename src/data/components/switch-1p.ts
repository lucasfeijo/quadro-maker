import type { ComponentSpec } from './_spec';
import { makePorts, makeRoutes } from './_spec';

const component: ComponentSpec = {
  id: 'switch-1p',
  name: 'Interruptor Unipolar',
  description: 'Interruptor simples de um polo. Liga ou desliga manualmente um circuito. Usado para controlar iluminação ou cargas monofásicas.',
  widthCm: 3,
  category: 'switch',
  poles: 1,
  color: '#455a64',
  icon: 'switch',
  ports: makePorts(1, 3, ['L1'], ['phase']),
  portDescriptions: {
    'in-L1': 'Entrada de fase (alimentação)',
    'out-L1': 'Saída de fase (carga)',
  },
  modes: [
    { id: 'on', label: 'Ligado', color: '#4caf50', routes: makeRoutes(['L1']) },
    { id: 'off', label: 'Desligado', color: '#f44336', routes: [] },
  ],
  defaultMode: 'off',
};

export default component;
