import type { ComponentSpec } from './_spec';

const component: ComponentSpec = {
  id: 'busbar-rail-neutral',
  name: 'Barr. Neutro',
  description: 'Barramento de trilho DIN para neutro. Coloque vários lado a lado para criar uma barra de distribuição.',
  widthMm: 6,
  category: 'terminal',
  poles: 1,
  color: '#1565c0',
  icon: 'terminal',
  ports: [
    { id: 'in-top', label: 'N', side: 'top', offsetXMm: 3, type: 'neutral' },
    { id: 'out-bottom', label: 'N', side: 'bottom', offsetXMm: 3, type: 'neutral' },
  ],
  portDescriptions: {
    'in-top': 'Conexão superior — neutro',
    'out-bottom': 'Conexão inferior — neutro',
  },
  modes: [
    { id: 'on', label: 'Conectado', color: '#1565c0', routes: [{ from: 'in-top', to: 'out-bottom' }] },
  ],
  defaultMode: 'on',
};

export default component;
