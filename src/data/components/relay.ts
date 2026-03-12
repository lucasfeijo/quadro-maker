import type { ComponentSpec } from './_spec';

export const RELAYS: ComponentSpec[] = [
  {
    id: 'relay-1no',
    name: 'Relé 1NA',
    widthCm: 3,
    category: 'relay',
    color: '#4a148c',
    icon: 'relay',
    ports: [
      { id: 'coil-A1', label: 'A1', side: 'top', offsetXCm: 0.75, type: 'any' },
      { id: 'coil-A2', label: 'A2', side: 'bottom', offsetXCm: 0.75, type: 'any' },
      { id: 'com-11', label: '11', side: 'top', offsetXCm: 2.25, type: 'any' },
      { id: 'no-14', label: '14', side: 'bottom', offsetXCm: 2.25, type: 'any' },
    ],
    modes: [
      { id: 'on', label: 'Energizado', color: '#4caf50', routes: [{ from: 'com-11', to: 'no-14' }] },
      { id: 'off', label: 'Desenergizado', color: '#999', routes: [] },
    ],
    defaultMode: 'off',
  },
  {
    id: 'relay-1nc',
    name: 'Relé 1NF',
    widthCm: 3,
    category: 'relay',
    color: '#4a148c',
    icon: 'relay',
    ports: [
      { id: 'coil-A1', label: 'A1', side: 'top', offsetXCm: 0.75, type: 'any' },
      { id: 'coil-A2', label: 'A2', side: 'bottom', offsetXCm: 0.75, type: 'any' },
      { id: 'com-11', label: '11', side: 'top', offsetXCm: 2.25, type: 'any' },
      { id: 'nc-12', label: '12', side: 'bottom', offsetXCm: 2.25, type: 'any' },
    ],
    modes: [
      { id: 'on', label: 'Energizado', color: '#4caf50', routes: [] },
      { id: 'off', label: 'Desenergizado', color: '#999', routes: [{ from: 'com-11', to: 'nc-12' }] },
    ],
    defaultMode: 'off',
  },
  {
    id: 'relay-1no1nc',
    name: 'Relé 1NA+1NF',
    widthCm: 4.5,
    category: 'relay',
    color: '#4a148c',
    icon: 'relay',
    ports: [
      { id: 'coil-A1', label: 'A1', side: 'top', offsetXCm: 0.75, type: 'any' },
      { id: 'coil-A2', label: 'A2', side: 'bottom', offsetXCm: 0.75, type: 'any' },
      { id: 'com-11', label: '11', side: 'top', offsetXCm: 2.25, type: 'any' },
      { id: 'nc-12', label: '12', side: 'bottom', offsetXCm: 2.25, type: 'any' },
      { id: 'no-14', label: '14', side: 'bottom', offsetXCm: 3.75, type: 'any' },
    ],
    modes: [
      { id: 'on', label: 'Energizado', color: '#4caf50', routes: [{ from: 'com-11', to: 'no-14' }] },
      { id: 'off', label: 'Desenergizado', color: '#999', routes: [{ from: 'com-11', to: 'nc-12' }] },
    ],
    defaultMode: 'off',
  },
];
