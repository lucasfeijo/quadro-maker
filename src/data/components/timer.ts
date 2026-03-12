import type { ComponentSpec } from './_spec';

export const TIMERS: ComponentSpec[] = [
  {
    id: 'timer-on-delay',
    name: 'Temporizador (On-Delay)',
    widthCm: 4.5,
    category: 'timer',
    color: '#00838f',
    icon: 'timer',
    ports: [
      { id: 'in-A1', label: 'A1', side: 'top', offsetXCm: 1.1, type: 'any' },
      { id: 'in-A2', label: 'A2', side: 'bottom', offsetXCm: 1.1, type: 'any' },
      { id: 'out-15', label: '15', side: 'top', offsetXCm: 3.4, type: 'any' },
      { id: 'out-18', label: '18', side: 'bottom', offsetXCm: 3.4, type: 'any' },
    ],
    modes: [
      { id: 'idle', label: 'Inativo', color: '#999', routes: [] },
      { id: 'counting', label: 'Temporizando', color: '#ffb300', routes: [] },
      { id: 'done', label: 'Acionado', color: '#4caf50', routes: [{ from: 'out-15', to: 'out-18' }] },
    ],
    defaultMode: 'idle',
    properties: [
      { key: 'delaySeconds', label: 'Tempo (s)', type: 'number', defaultValue: 5 },
    ],
  },
  {
    id: 'timer-off-delay',
    name: 'Temporizador (Off-Delay)',
    widthCm: 4.5,
    category: 'timer',
    color: '#006064',
    icon: 'timer',
    ports: [
      { id: 'in-A1', label: 'A1', side: 'top', offsetXCm: 1.1, type: 'any' },
      { id: 'in-A2', label: 'A2', side: 'bottom', offsetXCm: 1.1, type: 'any' },
      { id: 'out-15', label: '15', side: 'top', offsetXCm: 3.4, type: 'any' },
      { id: 'out-18', label: '18', side: 'bottom', offsetXCm: 3.4, type: 'any' },
    ],
    modes: [
      { id: 'idle', label: 'Inativo', color: '#999', routes: [{ from: 'out-15', to: 'out-18' }] },
      { id: 'counting', label: 'Temporizando', color: '#ffb300', routes: [{ from: 'out-15', to: 'out-18' }] },
      { id: 'done', label: 'Desligado', color: '#f44336', routes: [] },
    ],
    defaultMode: 'idle',
    properties: [
      { key: 'delaySeconds', label: 'Tempo (s)', type: 'number', defaultValue: 5 },
    ],
  },
];
