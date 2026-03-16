import type { ComponentSpec } from './_spec';
import { coilDrivenBehavior } from './_spec';

const component: ComponentSpec = {
  id: 'relay-1no1nc',
  name: 'Relé 1NA+1NF',
  description: 'Relé auxiliar com 1 contato NA e 1 NF. Quando a bobina é energizada, o contato NA fecha (COM→NO) e o NF abre (COM→NC). Quando desenergizado, o inverso acontece. Permite lógicas de comando complementares.',
  widthMm: 45,
  category: 'relay',
  color: '#4a148c',
  icon: 'relay',
  ports: [
    { id: 'coil-A1', label: 'A1', side: 'top', offsetXMm: 7.5, type: 'any' },
    { id: 'coil-A2', label: 'A2', side: 'bottom', offsetXMm: 7.5, type: 'any' },
    { id: 'com-11', label: 'COM', side: 'top', offsetXMm: 22.5, type: 'any' },
    { id: 'nc-12', label: 'NC', side: 'bottom', offsetXMm: 22.5, type: 'any' },
    { id: 'no-14', label: 'NO', side: 'bottom', offsetXMm: 37.5, type: 'any' },
  ],
  portDescriptions: {
    'coil-A1': 'Bobina — terminal positivo (comando)',
    'coil-A2': 'Bobina — terminal negativo (comando)',
    'com-11': 'Comum do contato (entrada)',
    'nc-12': 'Contato NF — fechado em repouso, aberto quando energizado',
    'no-14': 'Contato NA — aberto em repouso, fechado quando energizado',
  },
  modes: [
    { id: 'on', label: 'Energizado', color: '#4caf50', routes: [{ from: 'com-11', to: 'no-14' }] },
    { id: 'off', label: 'Desenergizado', color: '#999', routes: [{ from: 'com-11', to: 'nc-12' }] },
  ],
  defaultMode: 'off',
  behavior: coilDrivenBehavior('coil-A1', 'on', 'off'),
};

export default component;
