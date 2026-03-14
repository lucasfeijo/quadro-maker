import type { ComponentSpec } from './_spec';
import { coilDrivenBehavior } from './_spec';

const component: ComponentSpec = {
  id: 'contactor-weg-cwb32',
  name: 'Contator WEG CWB32',
  description: 'Contator trifásico WEG CWB32, 32A, com contatos auxiliares 1NA+1NF incorporados. Bobina A1/A2. Terminais principais L1/L2/L3 (entrada) e T1/T2/T3 (saída). Contatos auxiliares NA e NF.',
  widthCm: 5,
  category: 'contactor',
  color: '#1565c0',
  icon: 'contactor',
  ports: [
    // Bobina
    { id: 'coil-A1', label: 'A1', side: 'top', offsetXCm: 0.7, type: 'any' },
    { id: 'coil-A2', label: 'A2', side: 'bottom', offsetXCm: 0.7, type: 'any' },
    // Principais - entrada
    { id: 'in-1L1', label: 'L1', side: 'top', offsetXCm: 1.5, type: 'phase' },
    { id: 'in-3L2', label: 'L2', side: 'top', offsetXCm: 2.5, type: 'phase' },
    { id: 'in-5L3', label: 'L3', side: 'top', offsetXCm: 3.5, type: 'phase' },
    // Principais - saída
    { id: 'out-2T1', label: 'T1', side: 'bottom', offsetXCm: 1.5, type: 'phase' },
    { id: 'out-4T2', label: 'T2', side: 'bottom', offsetXCm: 2.5, type: 'phase' },
    { id: 'out-6T3', label: 'T3', side: 'bottom', offsetXCm: 3.5, type: 'phase' },
    // Auxiliares NA
    { id: 'aux-13', label: 'NA', side: 'top', offsetXCm: 4.3, type: 'any' },
    { id: 'aux-14', label: 'NA', side: 'bottom', offsetXCm: 4.3, type: 'any' },
    // Auxiliares NF
    { id: 'aux-21', label: 'NF', side: 'top', offsetXCm: 4.8, type: 'any' },
    { id: 'aux-22', label: 'NF', side: 'bottom', offsetXCm: 4.8, type: 'any' },
  ],
  portDescriptions: {
    'coil-A1': 'Bobina — terminal A1 (comando)',
    'coil-A2': 'Bobina — terminal A2 (comando)',
    'in-1L1': 'Entrada fase 1',
    'in-3L2': 'Entrada fase 2',
    'in-5L3': 'Entrada fase 3',
    'out-2T1': 'Saída fase 1 — carga',
    'out-4T2': 'Saída fase 2 — carga',
    'out-6T3': 'Saída fase 3 — carga',
    'aux-13': 'Contato auxiliar NA',
    'aux-14': 'Contato auxiliar NA',
    'aux-21': 'Contato auxiliar NF',
    'aux-22': 'Contato auxiliar NF',
  },
  modes: [
    {
      id: 'on',
      label: 'Energizado',
      color: '#4caf50',
      routes: [
        { from: 'in-1L1', to: 'out-2T1' },
        { from: 'in-3L2', to: 'out-4T2' },
        { from: 'in-5L3', to: 'out-6T3' },
        { from: 'aux-13', to: 'aux-14' },
      ],
    },
    {
      id: 'off',
      label: 'Desenergizado',
      color: '#999',
      routes: [{ from: 'aux-21', to: 'aux-22' }],
    },
  ],
  defaultMode: 'off',
  nominalCurrentA: 32,
  behavior: coilDrivenBehavior('coil-A1', 'on', 'off'),
};

export default component;
