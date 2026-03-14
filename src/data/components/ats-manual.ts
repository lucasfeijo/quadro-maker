import type { ComponentSpec } from './_spec';

const PORTS = [
  { id: 'in-S1L1', label: 'S1-L1', side: 'top' as const, offsetXCm: 1.5, type: 'phase' as const },
  { id: 'in-S1L2', label: 'S1-L2', side: 'top' as const, offsetXCm: 3, type: 'phase' as const },
  { id: 'in-S2L1', label: 'S2-L1', side: 'top' as const, offsetXCm: 6, type: 'phase' as const },
  { id: 'in-S2L2', label: 'S2-L2', side: 'top' as const, offsetXCm: 7.5, type: 'phase' as const },
  { id: 'out-L1', label: 'O-L1', side: 'bottom' as const, offsetXCm: 3.5, type: 'phase' as const },
  { id: 'out-L2', label: 'O-L2', side: 'bottom' as const, offsetXCm: 5.5, type: 'phase' as const },
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
  id: 'ats-manual',
  name: 'ATS Manual',
  description: 'Chave de Transferência Manual. Permite ao operador selecionar manualmente entre Fonte 1 e Fonte 2. Não faz comutação automática — requer ação humana para trocar a fonte de alimentação.',
  widthCm: 9,
  category: 'ats',
  poles: 2,
  color: '#283593',
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
};

export default component;
