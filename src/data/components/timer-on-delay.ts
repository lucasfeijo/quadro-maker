import type { ComponentSpec, ComponentBehavior } from './_spec';

const behavior: ComponentBehavior = (ctx) => {
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

const component: ComponentSpec = {
  id: 'timer-on-delay',
  name: 'Temporizador (On-Delay)',
  description: 'Temporizador com retardo na energização. Quando a alimentação (A1/A2) é aplicada, inicia a contagem. Após o tempo configurado, o contato temporizado (COM→NO) fecha. Usado para partidas sequenciais de motores, temporização de comandos.',
  widthCm: 4.5,
  category: 'timer',
  color: '#00838f',
  icon: 'timer',
  ports: [
    { id: 'in-A1', label: 'A1', side: 'top', offsetXCm: 1.1, type: 'any' },
    { id: 'in-A2', label: 'A2', side: 'bottom', offsetXCm: 1.1, type: 'any' },
    { id: 'out-15', label: 'COM', side: 'top', offsetXCm: 3.4, type: 'any' },
    { id: 'out-18', label: 'NO', side: 'bottom', offsetXCm: 3.4, type: 'any' },
  ],
  portDescriptions: {
    'in-A1': 'Alimentação — terminal positivo (inicia contagem)',
    'in-A2': 'Alimentação — terminal negativo',
    'out-15': 'Contato temporizado — comum',
    'out-18': 'Contato temporizado — NO (fecha após o tempo)',
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
  behavior,
};

export default component;
