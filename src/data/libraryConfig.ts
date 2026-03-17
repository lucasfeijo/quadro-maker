import type { PanelIOType } from '../types';

export type LibraryGroup = {
  id: string;
  label: string;
  color: string;
  subgroups: LibrarySubgroup[];
};

export type LibrarySubgroup = {
  id: string;
  label: string;
  modules: string[];
};

export const LIBRARY_GROUPS: LibraryGroup[] = [
  {
    id: 'power_protection_switching',
    label: 'Potência',
    color: '#c62828',
    subgroups: [
      { id: 'breakers', label: 'Disjuntores', modules: ['breaker-1p', 'breaker-2p', 'breaker-3p'] },
      { id: 'residual_current', label: 'DR', modules: ['dr-2p', 'dr-4p'] },
      { id: 'surge_protection', label: 'DPS', modules: ['dps-1p', 'dps-2p'] },
      { id: 'transfer_switches', label: 'ATS', modules: ['ats-auto', 'ats-manual', 'ats-xlq4-125'] },
      { id: 'contactors', label: 'Contatores', modules: ['contactor', 'contactor-weg-cwb32'] },
    ],
  },
  {
    id: 'control_automation',
    label: 'Controle',
    color: '#1565c0',
    subgroups: [
      { id: 'relays', label: 'Relés', modules: ['relay-1no', 'relay-1nc', 'relay-1no1nc', 'rps-ffb'] },
      { id: 'controllers', label: 'Controladores', modules: ['kincony-kc868-a6'] },
      { id: 'timers', label: 'Temporizadores', modules: ['timer-on-delay', 'timer-off-delay'] },
      { id: 'power_supplies', label: 'Fontes', modules: ['power-supply-12v'] },
      {
        id: 'external_components',
        label: 'Componentes Externos',
        modules: ['switch-1p', 'switch-2p', 'switch-3way', 'button-no', 'button-nc', 'led'],
      },
    ],
  },
  {
    id: 'connection_interface',
    label: 'Conexões',
    color: '#607d8b',
    subgroups: [
      { id: 'terminals', label: 'Bornes', modules: ['terminal', 'terminal-sak-4'] },
      {
        id: 'busbars_din',
        label: 'Barramentos Trilho',
        modules: ['busbar-rail-8p-phase', 'busbar-rail-8p-neutral', 'busbar-rail-8p-ground'],
      },
      {
        id: 'busbars_screw',
        label: 'Barramentos Parafuso',
        modules: ['busbar-screw-8p-phase', 'busbar-screw-8p-neutral', 'busbar-screw-8p-ground'],
      },
      {
        id: 'inputs',
        label: 'Entradas',
        modules: [
          'input-phase',
          'input-neutral',
          'input-ground',
          'input-dc+',
          'input-dc-',
          'input-signal',
          'input-fnt',
          'input-fn',
        ],
      },
      {
        id: 'outputs',
        label: 'Saídas',
        modules: [
          'output-phase',
          'output-neutral',
          'output-ground',
          'output-dc+',
          'output-dc-',
          'output-signal',
          'output-fnt',
          'output-fn',
        ],
      },
    ],
  },
];

/** Maps IO item IDs to the actual IO config. Used for inputs/outputs subgroups. */
export const IO_ITEM_MAP: Record<string, { direction: 'input' | 'output'; type: PanelIOType }> = {
  'input-phase': { direction: 'input', type: 'phase' },
  'input-neutral': { direction: 'input', type: 'neutral' },
  'input-ground': { direction: 'input', type: 'ground' },
  'input-dc+': { direction: 'input', type: 'dc_pos' },
  'input-dc-': { direction: 'input', type: 'dc_neg' },
  'input-signal': { direction: 'input', type: 'signal' },
  'output-phase': { direction: 'output', type: 'phase' },
  'output-neutral': { direction: 'output', type: 'neutral' },
  'output-ground': { direction: 'output', type: 'ground' },
  'output-dc+': { direction: 'output', type: 'dc_pos' },
  'output-dc-': { direction: 'output', type: 'dc_neg' },
  'output-signal': { direction: 'output', type: 'signal' },
};

export const IO_GROUP_MAP: Record<string, { direction: 'input' | 'output'; types: PanelIOType[] }> = {
  'input-fnt': { direction: 'input', types: ['phase', 'neutral', 'ground'] },
  'input-fn': { direction: 'input', types: ['phase', 'neutral'] },
  'output-fnt': { direction: 'output', types: ['phase', 'neutral', 'ground'] },
  'output-fn': { direction: 'output', types: ['phase', 'neutral'] },
};
