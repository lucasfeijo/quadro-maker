import type { ComponentSpec } from './_spec';

const LED_COLOR_OPTIONS = [
  { value: '#f44336', label: 'Vermelho' },
  { value: '#4caf50', label: 'Verde' },
  { value: '#ffeb3b', label: 'Amarelo' },
  { value: '#2196f3', label: 'Azul' },
  { value: '#ff9800', label: 'Laranja' },
  { value: '#ffffff', label: 'Branco' },
];

const component: ComponentSpec = {
  id: 'led',
  name: 'LED',
  description: 'Indicador luminoso (LED). Acende quando recebe tensão nos terminais + e −. A cor pode ser configurada nas propriedades.',
  widthCm: 2,
  category: 'button',
  color: '#f44336',
  icon: 'led',
  ports: [
    { id: 'in-plus', label: '+', side: 'top', offsetXCm: 1, type: 'any' },
    { id: 'in-minus', label: '−', side: 'bottom', offsetXCm: 1, type: 'any' },
  ],
  portDescriptions: {
    'in-plus': 'Terminal positivo (ânodo)',
    'in-minus': 'Terminal negativo (cátodo)',
  },
  modes: [
    { id: 'on', label: 'Aceso', color: '#4caf50', routes: [{ from: 'in-plus', to: 'in-minus' }] },
    { id: 'off', label: 'Apagado', color: '#999', routes: [] },
  ],
  defaultMode: 'off',
  properties: [
    { key: 'ledColor', label: 'Cor do LED', type: 'color', options: LED_COLOR_OPTIONS, defaultValue: '#f44336' },
  ],
  behavior: (ctx) => {
    if (ctx.isManualOverride) return;
    const energized = ctx.isPortEnergized('in-plus');
    const target = energized ? 'on' : 'off';
    if (target !== ctx.currentMode) return { mode: target };
  },
};

export default component;
