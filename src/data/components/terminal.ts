import type { ComponentSpec } from './_spec';

const component: ComponentSpec = {
  id: 'terminal',
  name: 'Borne',
  description: 'Ponto de conexão passivo. Liga o fio de entrada ao de saída sem interrupção. Usado para organizar e distribuir conexões dentro do quadro.',
  widthMm: 6,
  category: 'terminal',
  poles: 1,
  color: '#78909c',
  icon: 'terminal',
  ports: [
    { id: 'in-top', label: 'Ent', side: 'top', offsetXMm: 3, type: 'any' },
    { id: 'out-bottom', label: 'Saí', side: 'bottom', offsetXMm: 3, type: 'any' },
  ],
  portDescriptions: {
    'in-top': 'Entrada — conexão superior',
    'out-bottom': 'Saída — conexão inferior',
  },
  modes: [
    { id: 'on', label: 'Conectado', color: '#4caf50', routes: [{ from: 'in-top', to: 'out-bottom' }] },
  ],
  defaultMode: 'on',
};

export default component;
