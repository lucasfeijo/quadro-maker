import type { ComponentSpec } from './_spec';

export const CONTACTORS: ComponentSpec[] = [
  {
    id: 'contactor',
    name: 'Contator',
    widthCm: 6,
    category: 'contactor',
    color: '#6a1b9a',
    icon: 'contactor',
    ports: [
      { id: 'coil-A1', label: 'A1', side: 'top', offsetXCm: 0.8, type: 'any' },
      { id: 'coil-A2', label: 'A2', side: 'bottom', offsetXCm: 0.8, type: 'any' },
      { id: 'in-L1', label: 'L1', side: 'top', offsetXCm: 2, type: 'phase' },
      { id: 'in-L2', label: 'L2', side: 'top', offsetXCm: 3.5, type: 'phase' },
      { id: 'in-L3', label: 'L3', side: 'top', offsetXCm: 5, type: 'phase' },
      { id: 'out-T1', label: 'T1', side: 'bottom', offsetXCm: 2, type: 'phase' },
      { id: 'out-T2', label: 'T2', side: 'bottom', offsetXCm: 3.5, type: 'phase' },
      { id: 'out-T3', label: 'T3', side: 'bottom', offsetXCm: 5, type: 'phase' },
    ],
    modes: [
      {
        id: 'on', label: 'Energizado', color: '#4caf50',
        routes: [
          { from: 'in-L1', to: 'out-T1' },
          { from: 'in-L2', to: 'out-T2' },
          { from: 'in-L3', to: 'out-T3' },
        ],
      },
      { id: 'off', label: 'Desenergizado', color: '#999', routes: [] },
    ],
    defaultMode: 'off',
    nominalCurrentA: 25,
  },
];
