import type { ComponentSpec } from './_spec';
import { sourcePriorityBehavior } from './_spec';

const PORTS = [
  { id: 'in-S1L1', label: 'S1-L1', side: 'top' as const, offsetXMm: 15, type: 'phase' as const },
  { id: 'in-S1L2', label: 'S1-L2', side: 'top' as const, offsetXMm: 30, type: 'phase' as const },
  { id: 'in-S2L1', label: 'S2-L1', side: 'top' as const, offsetXMm: 60, type: 'phase' as const },
  { id: 'in-S2L2', label: 'S2-L2', side: 'top' as const, offsetXMm: 75, type: 'phase' as const },
  { id: 'out-L1', label: 'O-L1', side: 'bottom' as const, offsetXMm: 35, type: 'phase' as const },
  { id: 'out-L2', label: 'O-L2', side: 'bottom' as const, offsetXMm: 55, type: 'phase' as const },
];

const MODES = [
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

const component: ComponentSpec = {
  id: 'ats-auto',
  name: 'ATS Automático',
  description: 'Chave de Transferência Automática. Monitora a Fonte 1 (rede) e, ao detectar falta de energia, comuta automaticamente para a Fonte 2 (gerador). Quando a rede retorna, comuta de volta. Garante continuidade no fornecimento.',
  widthMm: 90,
  category: 'ats',
  poles: 2,
  color: '#1a237e',
  icon: 'ats',
  ports: PORTS,
  portDescriptions: {
    'in-S1L1': 'Entrada Fonte 1 — fase L1 (ex: rede elétrica)',
    'in-S1L2': 'Entrada Fonte 1 — fase L2',
    'in-S2L1': 'Entrada Fonte 2 — fase L1 (ex: gerador)',
    'in-S2L2': 'Entrada Fonte 2 — fase L2',
    'out-L1': 'Saída — fase L1 (alimentação da carga)',
    'out-L2': 'Saída — fase L2 (alimentação da carga)',
  },
  modes: MODES,
  defaultMode: 'src1',
  behavior: sourcePriorityBehavior(
    [
      { ports: ['in-S1L1', 'in-S1L2'], mode: 'src1' },
      { ports: ['in-S2L1', 'in-S2L2'], mode: 'src2' },
    ],
    'off',
  ),
  properties: [
    { key: 'switchDelayMs', label: 'Tempo de comutação (ms)', type: 'number', defaultValue: 500 },
  ],
};

export default component;
