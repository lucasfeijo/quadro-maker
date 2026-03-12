import { ModuleDefinition, PortDefinition } from '../types';

function makePorts(
  poles: number,
  widthCm: number,
  labels: string[],
  types: PortDefinition['type'][],
): PortDefinition[] {
  const ports: PortDefinition[] = [];
  const spacing = widthCm / (poles + 1);
  for (let i = 0; i < poles; i++) {
    const offset = spacing * (i + 1);
    const label = labels[i] ?? `P${i + 1}`;
    const pType = types[i] ?? 'phase';
    ports.push({ id: `in-${label}`, label, side: 'top', offsetXCm: offset, type: pType });
    ports.push({ id: `out-${label}`, label, side: 'bottom', offsetXCm: offset, type: pType });
  }
  return ports;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'terminal-1',
    name: 'Borne de Junção',
    widthCm: 1,
    category: 'terminal',
    color: '#78909c',
    icon: 'terminal',
    ports: [
      { id: 'top', label: '1', side: 'top', offsetXCm: 0.5, type: 'any' },
      { id: 'bottom', label: '2', side: 'bottom', offsetXCm: 0.5, type: 'any' },
    ],
  },
  {
    id: 'breaker-1p',
    name: 'Disjuntor Unipolar',
    widthCm: 3,
    category: 'breaker',
    poles: 1,
    color: '#1976d2',
    icon: 'breaker',
    ports: makePorts(1, 3, ['L1'], ['phase']),
  },
  {
    id: 'breaker-2p',
    name: 'Disjuntor Bipolar',
    widthCm: 6,
    category: 'breaker',
    poles: 2,
    color: '#1565c0',
    icon: 'breaker',
    ports: makePorts(2, 6, ['L1', 'L2'], ['phase', 'phase']),
  },
  {
    id: 'breaker-3p',
    name: 'Disjuntor Tripolar',
    widthCm: 9,
    category: 'breaker',
    poles: 3,
    color: '#0d47a1',
    icon: 'breaker',
    ports: makePorts(3, 9, ['L1', 'L2', 'L3'], ['phase', 'phase', 'phase']),
  },
  {
    id: 'dr-2p',
    name: 'DR Bipolar',
    widthCm: 6,
    category: 'dr',
    poles: 2,
    color: '#2e7d32',
    icon: 'dr',
    ports: makePorts(2, 6, ['L', 'N'], ['phase', 'neutral']),
  },
  {
    id: 'dr-4p',
    name: 'DR Tetrapolar',
    widthCm: 12,
    category: 'dr',
    poles: 4,
    color: '#1b5e20',
    icon: 'dr',
    ports: makePorts(4, 12, ['L1', 'L2', 'L3', 'N'], ['phase', 'phase', 'phase', 'neutral']),
  },
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
  },
  {
    id: 'contactor',
    name: 'Contator',
    widthCm: 6,
    category: 'contactor',
    color: '#6a1b9a',
    icon: 'contactor',
    ports: [
      { id: 'in-L1', label: 'L1', side: 'top', offsetXCm: 1, type: 'phase' },
      { id: 'in-L2', label: 'L2', side: 'top', offsetXCm: 3, type: 'phase' },
      { id: 'in-L3', label: 'L3', side: 'top', offsetXCm: 5, type: 'phase' },
      { id: 'out-L1', label: 'T1', side: 'bottom', offsetXCm: 1, type: 'phase' },
      { id: 'out-L2', label: 'T2', side: 'bottom', offsetXCm: 3, type: 'phase' },
      { id: 'out-L3', label: 'T3', side: 'bottom', offsetXCm: 5, type: 'phase' },
    ],
  },
  {
    id: 'relay',
    name: 'Relé Auxiliar',
    widthCm: 3,
    category: 'relay',
    color: '#ad1457',
    icon: 'relay',
    ports: [
      { id: 'coil-A1', label: 'A1', side: 'top', offsetXCm: 0.75, type: 'any' },
      { id: 'coil-A2', label: 'A2', side: 'top', offsetXCm: 2.25, type: 'any' },
      { id: 'com-11', label: '11', side: 'bottom', offsetXCm: 0.75, type: 'any' },
      { id: 'no-14', label: '14', side: 'bottom', offsetXCm: 2.25, type: 'any' },
    ],
  },
  {
    id: 'timer',
    name: 'Temporizador',
    widthCm: 6,
    category: 'timer',
    color: '#00695c',
    icon: 'timer',
    ports: [
      { id: 'in-A1', label: 'A1', side: 'top', offsetXCm: 1.5, type: 'any' },
      { id: 'in-A2', label: 'A2', side: 'top', offsetXCm: 4.5, type: 'any' },
      { id: 'out-15', label: '15', side: 'bottom', offsetXCm: 1.5, type: 'any' },
      { id: 'out-18', label: '18', side: 'bottom', offsetXCm: 4.5, type: 'any' },
    ],
  },
  {
    id: 'ats-2p',
    name: 'Switch ATS Bipolar',
    widthCm: 18,
    category: 'ats',
    poles: 2,
    color: '#37474f',
    icon: 'ats',
    ports: [
      { id: 'src1-L1', label: 'S1-L1', side: 'top', offsetXCm: 3, type: 'phase' },
      { id: 'src1-L2', label: 'S1-L2', side: 'top', offsetXCm: 6, type: 'phase' },
      { id: 'src2-L1', label: 'S2-L1', side: 'top', offsetXCm: 12, type: 'phase' },
      { id: 'src2-L2', label: 'S2-L2', side: 'top', offsetXCm: 15, type: 'phase' },
      { id: 'out-L1', label: 'O-L1', side: 'bottom', offsetXCm: 7, type: 'phase' },
      { id: 'out-L2', label: 'O-L2', side: 'bottom', offsetXCm: 11, type: 'phase' },
    ],
  },
];

export function getModuleById(id: string): ModuleDefinition | undefined {
  return MODULE_DEFINITIONS.find((m) => m.id === id);
}
