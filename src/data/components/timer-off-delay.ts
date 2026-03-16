import type { ComponentSpec, ComponentBehavior } from './_spec';

const behavior: ComponentBehavior = (ctx) => {
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

const component: ComponentSpec = {
  id: 'timer-off-delay',
  name: 'Temporizador (Off-Delay)',
  description: 'Temporizador com retardo na desenergização. O contato temporizado (COM→NO) fica fechado enquanto energizado. Quando a alimentação é removida, inicia a contagem e só abre após o tempo configurado. Usado para ventilação pós-parada, iluminação temporizada.',
  widthMm: 45,
  category: 'timer',
  color: '#006064',
  icon: 'timer',
  ports: [
    { id: 'in-A1', label: 'A1', side: 'top', offsetXMm: 11, type: 'any' },
    { id: 'in-A2', label: 'A2', side: 'bottom', offsetXMm: 11, type: 'any' },
    { id: 'out-15', label: 'COM', side: 'top', offsetXMm: 34, type: 'any' },
    { id: 'out-18', label: 'NO', side: 'bottom', offsetXMm: 34, type: 'any' },
  ],
  portDescriptions: {
    'in-A1': 'Alimentação — terminal positivo',
    'in-A2': 'Alimentação — terminal negativo',
    'out-15': 'Contato temporizado — comum',
    'out-18': 'Contato temporizado — NO (abre após o tempo)',
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
  behavior,
};

export default component;
