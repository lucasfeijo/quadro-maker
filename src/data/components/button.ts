import type { ComponentSpec } from './_spec';

export const BUTTONS: ComponentSpec[] = [
  {
    id: 'button-no',
    name: 'Botão NA',
    description: 'Botão pulsador Normalmente Aberto. O circuito só conduz enquanto o botão está pressionado. Ao soltar, retorna ao estado aberto. Usado para partidas de motores, chamadas, comandos momentâneos.',
    widthCm: 3,
    category: 'button',
    poles: 1,
    color: '#d32f2f',
    icon: 'button',
    ports: [
      { id: 'in-1', label: '1', side: 'top', offsetXCm: 1.5, type: 'any' },
      { id: 'out-2', label: '2', side: 'bottom', offsetXCm: 1.5, type: 'any' },
    ],
    portDescriptions: {
      'in-1': 'Entrada do contato',
      'out-2': 'Saída do contato (conduz só quando pressionado)',
    },
    modes: [
      { id: 'released', label: 'Solto', color: '#999', routes: [] },
      { id: 'pressed', label: 'Pressionado', color: '#4caf50', routes: [{ from: 'in-1', to: 'out-2' }] },
    ],
    defaultMode: 'released',
  },
  {
    id: 'button-nc',
    name: 'Botão NF',
    description: 'Botão pulsador Normalmente Fechado. O circuito conduz por padrão. Ao pressionar, interrompe o circuito. Ao soltar, volta a conduzir. Usado para paradas de emergência, botões de desligamento.',
    widthCm: 3,
    category: 'button',
    poles: 1,
    color: '#c62828',
    icon: 'button',
    ports: [
      { id: 'in-1', label: '1', side: 'top', offsetXCm: 1.5, type: 'any' },
      { id: 'out-2', label: '2', side: 'bottom', offsetXCm: 1.5, type: 'any' },
    ],
    portDescriptions: {
      'in-1': 'Entrada do contato',
      'out-2': 'Saída do contato (interrompe quando pressionado)',
    },
    modes: [
      { id: 'released', label: 'Solto', color: '#4caf50', routes: [{ from: 'in-1', to: 'out-2' }] },
      { id: 'pressed', label: 'Pressionado', color: '#999', routes: [] },
    ],
    defaultMode: 'released',
  },
];
