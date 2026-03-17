import type { ComponentSpec } from './_spec';

const component: ComponentSpec = {
  id: 'button-nc',
  name: 'Botão NF',
  description: 'Botão pulsador Normalmente Fechado. O circuito conduz por padrão. Ao pressionar, interrompe o circuito. Ao soltar, volta a conduzir. Usado para paradas de emergência, botões de desligamento.',
  widthMm: 30,
  category: 'button',
  poles: 1,
  color: '#c62828',
  icon: 'button',
  ports: [
    { id: 'in-1', label: '1', side: 'top', offsetXMm: 15, type: 'any' },
    { id: 'out-2', label: '2', side: 'bottom', offsetXMm: 15, type: 'any' },
  ],
  portDescriptions: {
    'in-1': 'Entrada do contato',
    'out-2': 'Saída do contato (interrompe quando pressionado)',
  },
  modes: [
    { id: 'released', label: 'Solto', color: '#4caf50', routes: [{ from: 'in-1', to: 'out-2' }] },
    { id: 'pressed', label: 'Pressionado', color: '#999', routes: [] },
  ],
  defaultMode: 'released',
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
