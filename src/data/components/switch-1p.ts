import type { ComponentSpec } from './_spec';
import { makePorts, makeRoutes } from './_spec';

const component: ComponentSpec = {
  id: 'switch-1p',
  name: 'Interruptor Unipolar',
  description: 'Interruptor simples de um polo. Liga ou desliga manualmente um circuito. Usado para controlar iluminação ou cargas monofásicas.',
  widthMm: 30,
  category: 'switch',
  poles: 1,
  color: '#455a64',
  icon: 'switch',
  ports: makePorts(1, 30, ['L1'], ['phase']),
  portDescriptions: {
    'in-L1': 'Entrada de fase (alimentação)',
    'out-L1': 'Saída de fase (carga)',
  },
  modes: [
    { id: 'on', label: 'Ligado', color: '#4caf50', routes: makeRoutes(['L1']) },
    { id: 'off', label: 'Desligado', color: '#f44336', routes: [] },
  ],
  defaultMode: 'off',
  din_mounted: false,
  screw_mounted: true,
  properties: [
    { key: 'rotationDeg', label: 'Rotação', type: 'select', options: [
      { value: 0, label: 'Normal (0°)' },
      { value: 90, label: '90°' },
      { value: 180, label: '180°' },
      { value: 270, label: '270°' },
    ], defaultValue: 0 },
  ],
};

export default component;
