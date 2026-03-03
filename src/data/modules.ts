import { ModuleDefinition } from '../types';

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'terminal-1',
    name: 'Borne de Junção',
    widthCm: 1,
    category: 'terminal',
    color: '#78909c',
  },
  {
    id: 'breaker-1p',
    name: 'Disjuntor Unipolar',
    widthCm: 3,
    category: 'breaker',
    poles: 1,
    color: '#1976d2',
  },
  {
    id: 'breaker-2p',
    name: 'Disjuntor Bipolar',
    widthCm: 6,
    category: 'breaker',
    poles: 2,
    color: '#1565c0',
  },
  {
    id: 'breaker-3p',
    name: 'Disjuntor Tripolar',
    widthCm: 9,
    category: 'breaker',
    poles: 3,
    color: '#0d47a1',
  },
  {
    id: 'dr-2p',
    name: 'DR Bipolar',
    widthCm: 6,
    category: 'dr',
    poles: 2,
    color: '#2e7d32',
  },
  {
    id: 'dr-4p',
    name: 'DR Tetrapolar',
    widthCm: 12,
    category: 'dr',
    poles: 4,
    color: '#1b5e20',
  },
  {
    id: 'dps-1p',
    name: 'DPS Unipolar',
    widthCm: 3,
    category: 'dps',
    poles: 1,
    color: '#e65100',
  },
  {
    id: 'dps-2p',
    name: 'DPS Bipolar',
    widthCm: 6,
    category: 'dps',
    poles: 2,
    color: '#bf360c',
  },
  {
    id: 'contactor',
    name: 'Contator',
    widthCm: 6,
    category: 'contactor',
    color: '#6a1b9a',
  },
  {
    id: 'relay',
    name: 'Relé Auxiliar',
    widthCm: 3,
    category: 'relay',
    color: '#ad1457',
  },
  {
    id: 'timer',
    name: 'Temporizador',
    widthCm: 6,
    category: 'timer',
    color: '#00695c',
  },
  {
    id: 'ats-2p',
    name: 'Switch ATS Bipolar',
    widthCm: 18,
    category: 'ats',
    poles: 2,
    color: '#37474f',
  },
];

export function getModuleById(id: string): ModuleDefinition | undefined {
  return MODULE_DEFINITIONS.find((m) => m.id === id);
}
