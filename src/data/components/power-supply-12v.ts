import type { ComponentSpec } from './_spec';

const component: ComponentSpec = {
  id: 'power-supply-12v',
  name: 'Fonte 12V',
  description:
    'Fonte de alimentação chaveada AC/DC. Entrada: fase, neutro e terra. Saída: 12V DC regulado. Módulo compacto 18mm para trilho DIN.',
  widthMm: 18,
  category: 'terminal',
  color: '#2e7d32',
  icon: 'terminal',
  ports: [
    // Saída DC 12V (topo)
    { id: 'out-12v-plus', label: '12V+', side: 'top', offsetXMm: 6, type: 'any' },
    { id: 'out-12v-minus', label: '12V-', side: 'top', offsetXMm: 12, type: 'any' },

    // Entrada AC (embaixo)
    { id: 'in-L', label: 'L', side: 'bottom', offsetXMm: 4, type: 'phase' },
    { id: 'in-N', label: 'N', side: 'bottom', offsetXMm: 9, type: 'neutral' },
    { id: 'in-PE', label: 'PE', side: 'bottom', offsetXMm: 14, type: 'ground' },
  ],
  portDescriptions: {
    'out-12v-plus': 'Saída DC 12V positivo',
    'out-12v-minus': 'Saída DC 12V negativo',
    'in-L': 'Entrada fase (Line)',
    'in-N': 'Entrada neutro',
    'in-PE': 'Entrada terra (proteção)',
  },
  modes: [
    {
      id: 'on',
      label: 'Operando',
      color: '#4caf50',
      routes: [
        { from: 'in-L', to: 'out-12v-plus' },
        { from: 'in-N', to: 'out-12v-minus' },
      ],
    },
  ],
  defaultMode: 'on',
};

export default component;
