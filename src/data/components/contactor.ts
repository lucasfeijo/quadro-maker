import type { ComponentSpec } from './_spec';
import { coilDrivenBehavior } from './_spec';

const component: ComponentSpec = {
  id: 'contactor',
  name: 'Contator',
  description: 'Chave eletromagnética de potência. Quando a bobina (A1/A2) é energizada, os contatos de força (L1→T1, L2→T2, L3→T3) fecham, permitindo a passagem de corrente para a carga. Usado para ligar motores, iluminação e outras cargas de alta corrente.',
  widthMm: 60,
  category: 'contactor',
  color: '#6a1b9a',
  icon: 'contactor',
  ports: [
    { id: 'coil-A1', label: 'A1', side: 'top', offsetXMm: 8, type: 'any' },
    { id: 'coil-A2', label: 'A2', side: 'bottom', offsetXMm: 8, type: 'any' },
    { id: 'in-L1', label: 'L1', side: 'top', offsetXMm: 20, type: 'phase' },
    { id: 'in-L2', label: 'L2', side: 'top', offsetXMm: 35, type: 'phase' },
    { id: 'in-L3', label: 'L3', side: 'top', offsetXMm: 50, type: 'phase' },
    { id: 'out-T1', label: 'T1', side: 'bottom', offsetXMm: 20, type: 'phase' },
    { id: 'out-T2', label: 'T2', side: 'bottom', offsetXMm: 35, type: 'phase' },
    { id: 'out-T3', label: 'T3', side: 'bottom', offsetXMm: 50, type: 'phase' },
  ],
  portDescriptions: {
    'coil-A1': 'Bobina — terminal positivo (comando)',
    'coil-A2': 'Bobina — terminal negativo (comando)',
    'in-L1': 'Entrada de potência fase 1',
    'in-L2': 'Entrada de potência fase 2',
    'in-L3': 'Entrada de potência fase 3',
    'out-T1': 'Saída de potência fase 1 (carga)',
    'out-T2': 'Saída de potência fase 2 (carga)',
    'out-T3': 'Saída de potência fase 3 (carga)',
  },
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
  behavior: coilDrivenBehavior('coil-A1', 'on', 'off'),
  din_mounted: true,
  screw_mounted: false,
};

export default component;
