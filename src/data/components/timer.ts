import type { ComponentSpec, ComponentBehavior } from './_spec';

const timerOnDelayBehavior: ComponentBehavior = (ctx) => {
  if (ctx.isManualOverride) return;
  const powered = ctx.isPortEnergized('in-A1');
  const delayMs = (Number(ctx.getProperty('delaySeconds')) || 5) * 1000;

  if (!powered) {
    if (ctx.currentMode !== 'idle') return { mode: 'idle' };
    return;
  }

  if (ctx.currentMode === 'idle') return { mode: 'counting' };
  if (ctx.currentMode === 'counting' && ctx.elapsedInModeMs >= delayMs) return { mode: 'done' };
};

const timerOffDelayBehavior: ComponentBehavior = (ctx) => {
  if (ctx.isManualOverride) return;
  const powered = ctx.isPortEnergized('in-A1');
  const delayMs = (Number(ctx.getProperty('delaySeconds')) || 5) * 1000;

  if (powered) {
    if (ctx.currentMode !== 'idle') return { mode: 'idle' };
    return;
  }

  if (ctx.currentMode === 'idle') return { mode: 'counting' };
  if (ctx.currentMode === 'counting' && ctx.elapsedInModeMs >= delayMs) return { mode: 'done' };
};

export const TIMERS: ComponentSpec[] = [
  {
    id: 'timer-on-delay',
    name: 'Temporizador (On-Delay)',
    description: 'Temporizador com retardo na energização. Quando a alimentação (A1/A2) é aplicada, inicia a contagem. Após o tempo configurado, o contato temporizado (15→18) fecha. Usado para partidas sequenciais de motores, temporização de comandos.',
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
    portDescriptions: {
      'in-A1': 'Alimentação — terminal positivo (inicia contagem)',
      'in-A2': 'Alimentação — terminal negativo',
      'out-15': 'Contato temporizado — entrada',
      'out-18': 'Contato temporizado — saída (fecha após o tempo)',
    },
    modes: [
      { id: 'idle', label: 'Inativo', color: '#999', routes: [] },
      { id: 'counting', label: 'Temporizando', color: '#ffb300', routes: [] },
      { id: 'done', label: 'Acionado', color: '#4caf50', routes: [{ from: 'out-15', to: 'out-18' }] },
    ],
    defaultMode: 'idle',
    properties: [
      { key: 'delaySeconds', label: 'Tempo (s)', type: 'number', defaultValue: 5 },
    ],
    behavior: timerOnDelayBehavior,
  },
  {
    id: 'timer-off-delay',
    name: 'Temporizador (Off-Delay)',
    description: 'Temporizador com retardo na desenergização. O contato temporizado (15→18) fica fechado enquanto energizado. Quando a alimentação é removida, inicia a contagem e só abre após o tempo configurado. Usado para ventilação pós-parada, iluminação temporizada.',
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
    portDescriptions: {
      'in-A1': 'Alimentação — terminal positivo',
      'in-A2': 'Alimentação — terminal negativo',
      'out-15': 'Contato temporizado — entrada',
      'out-18': 'Contato temporizado — saída (abre após o tempo)',
    },
    modes: [
      { id: 'idle', label: 'Inativo', color: '#999', routes: [{ from: 'out-15', to: 'out-18' }] },
      { id: 'counting', label: 'Temporizando', color: '#ffb300', routes: [{ from: 'out-15', to: 'out-18' }] },
      { id: 'done', label: 'Desligado', color: '#f44336', routes: [] },
    ],
    defaultMode: 'idle',
    properties: [
      { key: 'delaySeconds', label: 'Tempo (s)', type: 'number', defaultValue: 5 },
    ],
    behavior: timerOffDelayBehavior,
  },
];
