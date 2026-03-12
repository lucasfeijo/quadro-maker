import type { ComponentSpec } from './_spec';

export const DPSS: ComponentSpec[] = [
  {
    id: 'dps-1p',
    name: 'DPS Unipolar',
    widthCm: 3,
    category: 'dps',
    poles: 1,
    color: '#e65100',
    icon: 'dps',
    ports: [
      { id: 'in-L1', label: 'L1', side: 'top', offsetXCm: 1.5, type: 'phase' },
      { id: 'out-PE', label: 'PE', side: 'bottom', offsetXCm: 1.5, type: 'ground' },
    ],
    modes: [
      { id: 'ok', label: 'Normal', color: '#4caf50', routes: [] },
      { id: 'tripped', label: 'Atuado', color: '#ff9800', routes: [] },
    ],
    defaultMode: 'ok',
    nominalCurrentA: 40,
  },
  {
    id: 'dps-2p',
    name: 'DPS Bipolar',
    widthCm: 6,
    category: 'dps',
    poles: 2,
    color: '#bf360c',
    icon: 'dps',
    ports: [
      { id: 'in-L1', label: 'L1', side: 'top', offsetXCm: 2, type: 'phase' },
      { id: 'in-N', label: 'N', side: 'top', offsetXCm: 4, type: 'neutral' },
      { id: 'out-PE1', label: 'PE', side: 'bottom', offsetXCm: 2, type: 'ground' },
      { id: 'out-PE2', label: 'PE', side: 'bottom', offsetXCm: 4, type: 'ground' },
    ],
    modes: [
      { id: 'ok', label: 'Normal', color: '#4caf50', routes: [] },
      { id: 'tripped', label: 'Atuado', color: '#ff9800', routes: [] },
    ],
    defaultMode: 'ok',
    nominalCurrentA: 40,
  },
];
