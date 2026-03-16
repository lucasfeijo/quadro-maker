import type { ComponentSpec } from './_spec';

const component: ComponentSpec = {
  id: 'busbar-rail-ground',
  name: 'Barr. Terra',
  description: 'Barramento de trilho DIN para terra/PE. Coloque vários lado a lado para criar uma barra de distribuição.',
  widthMm: 6,
  category: 'terminal',
  poles: 1,
  color: '#2e7d32',
  icon: 'terminal',
  ports: [
    { id: 'in-top', label: 'PE', side: 'top', offsetXMm: 3, type: 'ground' },
    { id: 'out-bottom', label: 'PE', side: 'bottom', offsetXMm: 3, type: 'ground' },
  ],
  portDescriptions: {
    'in-top': 'Conexão superior — terra',
    'out-bottom': 'Conexão inferior — terra',
  },
  modes: [
    { id: 'on', label: 'Conectado', color: '#2e7d32', routes: [{ from: 'in-top', to: 'out-bottom' }] },
  ],
  defaultMode: 'on',
};

export default component;
