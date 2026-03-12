import type { ComponentSpec } from './_spec';
import { makePorts, makeRoutes } from './_spec';

export const SWITCHES: ComponentSpec[] = [
  {
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
  },
  {
    id: 'switch-2p',
    name: 'Interruptor Bipolar',
    description: 'Interruptor de dois polos. Liga ou desliga simultaneamente dois condutores. Usado para cargas bifásicas ou quando é necessário secionar fase e neutro juntos.',
    widthCm: 6,
    category: 'switch',
    poles: 2,
    color: '#37474f',
    icon: 'switch',
    ports: makePorts(2, 6, ['L1', 'L2'], ['phase', 'phase']),
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
  },
  {
    id: 'switch-3way',
    name: 'Interruptor 3-Way',
    description: 'Interruptor paralelo (three-way). Possui um terminal comum (COM) e duas saídas (L1, L2). Alterna entre as duas saídas. Usado em pares para controlar uma lâmpada de dois pontos diferentes.',
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
    portDescriptions: {
      'in-COM': 'Comum — entrada de fase (alimentação)',
      'out-L1': 'Saída posição 1 (retorno 1)',
      'out-L2': 'Saída posição 2 (retorno 2)',
    },
    modes: [
      { id: 'pos1', label: 'Posição 1', color: '#4caf50', routes: [{ from: 'in-COM', to: 'out-L1' }] },
      { id: 'pos2', label: 'Posição 2', color: '#2196f3', routes: [{ from: 'in-COM', to: 'out-L2' }] },
    ],
    defaultMode: 'pos1',
  },
];
