import type { ComponentSpec } from './_spec';
import { coilDrivenBehavior } from './_spec';

const component: ComponentSpec = {
  id: 'relay-1nc',
  name: 'Relé 1NF',
  description: 'Relé auxiliar com 1 contato Normalmente Fechado (NF). O contato está fechado (COM→NC) quando a bobina está desenergizada. Quando a bobina é energizada, o contato abre. Usado para lógica inversa e segurança.',
  widthCm: 3,
  category: 'relay',
  color: '#4a148c',
  icon: 'relay',
  ports: [
    { id: 'coil-A1', label: 'A1', side: 'top', offsetXCm: 0.75, type: 'any' },
    { id: 'coil-A2', label: 'A2', side: 'bottom', offsetXCm: 0.75, type: 'any' },
    { id: 'com-11', label: 'COM', side: 'top', offsetXCm: 2.25, type: 'any' },
    { id: 'nc-12', label: 'NC', side: 'bottom', offsetXCm: 2.25, type: 'any' },
  ],
  portDescriptions: {
    'coil-A1': 'Bobina — terminal positivo (comando)',
    'coil-A2': 'Bobina — terminal negativo (comando)',
    'com-11': 'Comum do contato (entrada)',
    'nc-12': 'Contato NF — aberto quando energizado, fechado quando em repouso',
  },
  modes: [
    { id: 'on', label: 'Energizado', color: '#4caf50', routes: [] },
    { id: 'off', label: 'Desenergizado', color: '#999', routes: [{ from: 'com-11', to: 'nc-12' }] },
  ],
  defaultMode: 'off',
  behavior: coilDrivenBehavior('coil-A1', 'on', 'off'),
};

export default component;
