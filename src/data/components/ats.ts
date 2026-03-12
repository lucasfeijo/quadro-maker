import type { ComponentSpec } from './_spec';

const ATS_PORTS = [
  { id: 'in-S1L1', label: 'S1-L1', side: 'top' as const, offsetXCm: 1.5, type: 'phase' as const },
  { id: 'in-S1L2', label: 'S1-L2', side: 'top' as const, offsetXCm: 3, type: 'phase' as const },
  { id: 'in-S2L1', label: 'S2-L1', side: 'top' as const, offsetXCm: 6, type: 'phase' as const },
  { id: 'in-S2L2', label: 'S2-L2', side: 'top' as const, offsetXCm: 7.5, type: 'phase' as const },
  { id: 'out-L1', label: 'O-L1', side: 'bottom' as const, offsetXCm: 3.5, type: 'phase' as const },
  { id: 'out-L2', label: 'O-L2', side: 'bottom' as const, offsetXCm: 5.5, type: 'phase' as const },
];

const ATS_MODES = [
  {
    id: 'src1', label: 'Fonte 1', color: '#4caf50',
    routes: [
      { from: 'in-S1L1', to: 'out-L1' },
      { from: 'in-S1L2', to: 'out-L2' },
    ],
  },
  {
    id: 'src2', label: 'Fonte 2', color: '#2196f3',
    routes: [
      { from: 'in-S2L1', to: 'out-L1' },
      { from: 'in-S2L2', to: 'out-L2' },
    ],
  },
  { id: 'off', label: 'Desligado', color: '#f44336', routes: [] },
];

export const ATSS: ComponentSpec[] = [
  {
    id: 'ats-auto',
    name: 'ATS Automático',
    widthCm: 9,
    category: 'ats',
    poles: 2,
    color: '#1a237e',
    icon: 'ats',
    ports: ATS_PORTS,
    modes: ATS_MODES,
    defaultMode: 'src1',
    properties: [
      { key: 'switchDelayMs', label: 'Tempo de comutação (ms)', type: 'number', defaultValue: 500 },
    ],
  },
  {
    id: 'ats-manual',
    name: 'ATS Manual',
    widthCm: 9,
    category: 'ats',
    poles: 2,
    color: '#283593',
    icon: 'ats',
    ports: ATS_PORTS,
    modes: ATS_MODES,
    defaultMode: 'src1',
  },
];
