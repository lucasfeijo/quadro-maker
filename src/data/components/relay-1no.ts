import type { ComponentSpec } from './_spec';
import { coilDrivenBehavior } from './_spec';

const component: ComponentSpec = {
  id: 'relay-1no',
  name: 'Relé 1NA',
  description: 'Relé auxiliar com 1 contato Normalmente Aberto (NA). Quando a bobina (A1/A2) é energizada, o contato fecha (COM→NO), permitindo passagem de corrente. Usado em lógica de comando e intertravamento.',
  widthMm: 30,
  category: 'relay',
  color: '#4a148c',
  icon: 'relay',
  ports: [
    { id: 'coil-A1', label: 'A1', side: 'top', offsetXMm: 7.5, type: 'any' },
    { id: 'coil-A2', label: 'A2', side: 'bottom', offsetXMm: 7.5, type: 'any' },
    { id: 'com-11', label: 'COM', side: 'top', offsetXMm: 22.5, type: 'any' },
    { id: 'no-14', label: 'NO', side: 'bottom', offsetXMm: 22.5, type: 'any' },
  ],
  portDescriptions: {
    'coil-A1': 'Bobina — terminal positivo (comando)',
    'coil-A2': 'Bobina — terminal negativo (comando)',
    'com-11': 'Comum do contato (entrada)',
    'no-14': 'Contato NA — fecha quando energizado',
  },
  modes: [
    { id: 'on', label: 'Energizado', color: '#4caf50', routes: [{ from: 'com-11', to: 'no-14' }] },
    { id: 'off', label: 'Desenergizado', color: '#999', routes: [] },
  ],
  defaultMode: 'off',
  behavior: coilDrivenBehavior('coil-A1', 'on', 'off'),
};

export default component;
