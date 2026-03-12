import type { ComponentSpec } from './_spec';

export const TERMINALS: ComponentSpec[] = [
  {
    id: 'terminal',
    name: 'Borne',
    widthCm: 1.5,
    category: 'terminal',
    poles: 1,
    color: '#78909c',
    icon: 'terminal',
    ports: [
      { id: 'in-top', label: 'Ent', side: 'top', offsetXCm: 0.75, type: 'any' },
      { id: 'out-bottom', label: 'Saí', side: 'bottom', offsetXCm: 0.75, type: 'any' },
    ],
    modes: [
      { id: 'on', label: 'Conectado', color: '#4caf50', routes: [{ from: 'in-top', to: 'out-bottom' }] },
    ],
    defaultMode: 'on',
  },
];
