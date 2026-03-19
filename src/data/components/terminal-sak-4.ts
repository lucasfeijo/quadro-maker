import type { ComponentSpec } from './_spec';

const component: ComponentSpec = {
  id: 'terminal-sak-4',
  name: 'Borne SAK 4',
  description: 'Borne de conexão para cabos até 4mm². Ponto de conexão passivo para organizar e distribuir conexões dentro do quadro.',
  widthMm: 8,
  heightMm: 40,
  category: 'terminal',
  poles: 1,
  color: '#78909c',
  icon: 'terminal',
  ports: [
    { id: 'in-top', label: 'Ent', side: 'top', offsetXMm: 4, type: 'any' },
    { id: 'out-bottom', label: 'Saí', side: 'bottom', offsetXMm: 4, type: 'any' },
  ],
  portDescriptions: {
    'in-top': 'Entrada — conexão superior',
    'out-bottom': 'Saída — conexão inferior',
  },
  modes: [
    { id: 'on', label: 'Conectado', color: '#4caf50', routes: [{ from: 'in-top', to: 'out-bottom' }] },
  ],
  defaultMode: 'on',
  din_mounted: true,
  screw_mounted: false,
};

export default component;
