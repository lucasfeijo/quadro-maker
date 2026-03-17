import type { ComponentSpec } from './_spec';

const component: ComponentSpec = {
  id: 'button-no',
  name: 'Botão NA',
  description: 'Botão pulsador Normalmente Aberto. O circuito só conduz enquanto o botão está pressionado. Ao soltar, retorna ao estado aberto. Usado para partidas de motores, chamadas, comandos momentâneos.',
  widthMm: 30,
  category: 'button',
  poles: 1,
  color: '#d32f2f',
  icon: 'button',
  ports: [
    { id: 'in-1', label: '1', side: 'top', offsetXMm: 15, type: 'any' },
    { id: 'out-2', label: '2', side: 'bottom', offsetXMm: 15, type: 'any' },
  ],
  portDescriptions: {
    'in-1': 'Entrada do contato',
    'out-2': 'Saída do contato (conduz só quando pressionado)',
  },
  modes: [
    { id: 'released', label: 'Solto', color: '#999', routes: [] },
    { id: 'pressed', label: 'Pressionado', color: '#4caf50', routes: [{ from: 'in-1', to: 'out-2' }] },
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
