import type { ComponentSpec } from './_spec';

export const BUTTONS: ComponentSpec[] = [
  {
    id: 'button-no',
    name: 'Botão NA',
    widthCm: 3,
    category: 'button',
    poles: 1,
    color: '#d32f2f',
    icon: 'button',
    ports: [
      { id: 'in-1', label: '1', side: 'top', offsetXCm: 1.5, type: 'any' },
      { id: 'out-2', label: '2', side: 'bottom', offsetXCm: 1.5, type: 'any' },
    ],
    modes: [
      { id: 'released', label: 'Solto', color: '#999', routes: [] },
      { id: 'pressed', label: 'Pressionado', color: '#4caf50', routes: [{ from: 'in-1', to: 'out-2' }] },
    ],
    defaultMode: 'released',
  },
  {
    id: 'button-nc',
    name: 'Botão NF',
    widthCm: 3,
    category: 'button',
    poles: 1,
    color: '#c62828',
    icon: 'button',
    ports: [
      { id: 'in-1', label: '1', side: 'top', offsetXCm: 1.5, type: 'any' },
      { id: 'out-2', label: '2', side: 'bottom', offsetXCm: 1.5, type: 'any' },
    ],
    modes: [
      { id: 'released', label: 'Solto', color: '#4caf50', routes: [{ from: 'in-1', to: 'out-2' }] },
      { id: 'pressed', label: 'Pressionado', color: '#999', routes: [] },
    ],
    defaultMode: 'released',
  },
];
