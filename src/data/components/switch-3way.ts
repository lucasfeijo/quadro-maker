import type { ComponentSpec } from './_spec';

const component: ComponentSpec = {
  id: 'switch-3way',
  name: 'Interruptor 3-Way',
  description: 'Interruptor paralelo (three-way). Possui um terminal comum (COM) e duas saídas (L1, L2). Alterna entre as duas saídas. Usado em pares para controlar uma lâmpada de dois pontos diferentes.',
  widthMm: 30,
  category: 'switch',
  poles: 1,
  color: '#546e7a',
  icon: 'switch',
  ports: [
    { id: 'in-COM', label: 'COM', side: 'top', offsetXMm: 15, type: 'phase' },
    { id: 'out-L1', label: 'L1', side: 'bottom', offsetXMm: 9, type: 'phase' },
    { id: 'out-L2', label: 'L2', side: 'bottom', offsetXMm: 21, type: 'phase' },
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
};

export default component;
