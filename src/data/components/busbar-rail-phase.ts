import type { ComponentSpec } from './_spec';

const component: ComponentSpec = {
  id: 'busbar-rail-phase',
  name: 'Barr. Fase',
  description: 'Barramento de trilho DIN para fase. Coloque vários lado a lado para criar uma barra de distribuição. Cada ponto conecta entrada e saída.',
  widthCm: 0.6,
  category: 'terminal',
  poles: 1,
  color: '#d32f2f',
  icon: 'terminal',
  ports: [
    { id: 'in-top', label: 'F', side: 'top', offsetXCm: 0.3, type: 'phase' },
    { id: 'out-bottom', label: 'F', side: 'bottom', offsetXCm: 0.3, type: 'phase' },
  ],
  portDescriptions: {
    'in-top': 'Conexão superior — fase',
    'out-bottom': 'Conexão inferior — fase',
  },
  modes: [
    { id: 'on', label: 'Conectado', color: '#d32f2f', routes: [{ from: 'in-top', to: 'out-bottom' }] },
  ],
  defaultMode: 'on',
};

export default component;
