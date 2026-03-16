import type { ComponentSpec } from './_spec';
import { sourcePriorityBehavior } from './_spec';

const component: ComponentSpec = {
  id: 'ats-xlq4-125',
  name: 'ATS NLQ4-125/2P',
  description:
    'Chave de Transferência Automática 100A, 230V, 2 polos. Modelo NLQ4-125/2P com comutação automática entre Normal Power A (ex: solar) e Reserve Power B (ex: rede). Possui seletor Manual/Auto, indicadores LED, entradas de sensing (AR/AN, BR/BN) e contatos auxiliares secos (NC/COM/NO) para sinalização de fonte ativa.',
  widthMm: 140,
  category: 'ats',
  poles: 2,
  color: '#78909c',
  icon: 'ats',
  ports: [
    // Main power A — big screw terminals (high current path)
    { id: 'in-A-R',  label: 'A-R',   side: 'top',    offsetXMm: 15,  type: 'phase' },
    { id: 'in-A-N',  label: 'A-N',   side: 'top',    offsetXMm: 30,    type: 'neutral' },

    // Sensing input A — green terminal block (voltage monitoring)
    { id: 'sense-AR', label: 'AR',    side: 'top',    offsetXMm: 50,    type: 'phase' },
    { id: 'sense-AN', label: 'AN',    side: 'top',    offsetXMm: 65,  type: 'neutral' },

    // Auxiliary contact A — green terminal block (passive dry contact)
    { id: 'aux-A-NC',  label: 'NC-A',  side: 'top',  offsetXMm: 85,  type: 'any' },
    { id: 'aux-A-COM', label: 'COM-A', side: 'top',  offsetXMm: 100,   type: 'any' },
    { id: 'aux-A-NO',  label: 'NO-A',  side: 'top',  offsetXMm: 115, type: 'any' },

    // Main power B — big screw terminals (high current path)
    { id: 'in-B-R',  label: 'B-R',   side: 'bottom', offsetXMm: 15,  type: 'phase' },
    { id: 'in-B-N',  label: 'B-N',   side: 'bottom', offsetXMm: 29,  type: 'neutral' },

    // Load output (routed internally by the contactor mechanism)
    { id: 'out-R',   label: 'O-R',   side: 'bottom', offsetXMm: 43,  type: 'phase' },
    { id: 'out-N',   label: 'O-N',   side: 'bottom', offsetXMm: 57,  type: 'neutral' },

    // Sensing input B — green terminal block (voltage monitoring)
    { id: 'sense-BR', label: 'BR',    side: 'bottom', offsetXMm: 71,  type: 'phase' },
    { id: 'sense-BN', label: 'BN',    side: 'bottom', offsetXMm: 85,  type: 'neutral' },

    // Auxiliary contact B — green terminal block (passive dry contact)
    { id: 'aux-B-NC',  label: 'NC-B',  side: 'bottom', offsetXMm: 99,  type: 'any' },
    { id: 'aux-B-COM', label: 'COM-B', side: 'bottom', offsetXMm: 113, type: 'any' },
    { id: 'aux-B-NO',  label: 'NO-B',  side: 'bottom', offsetXMm: 127, type: 'any' },
  ],
  portDescriptions: {
    'in-A-R':     'Normal Power A — fase (ex: energia solar) — borne de parafuso',
    'in-A-N':     'Normal Power A — neutro — borne de parafuso',
    'sense-AR':   'Sensing fonte A — fase (monitoramento de tensão AC220V)',
    'sense-AN':   'Sensing fonte A — neutro (monitoramento de tensão)',
    'aux-A-NC':   'Contato auxiliar fonte A — NF (abre quando fonte A ativa)',
    'aux-A-COM':  'Contato auxiliar fonte A — comum',
    'aux-A-NO':   'Contato auxiliar fonte A — NA (fecha quando fonte A ativa)',
    'in-B-R':     'Reserve Power B — fase (ex: rede elétrica) — borne de parafuso',
    'in-B-N':     'Reserve Power B — neutro — borne de parafuso',
    'sense-BR':   'Sensing fonte B — fase (monitoramento de tensão AC220V)',
    'sense-BN':   'Sensing fonte B — neutro (monitoramento de tensão)',
    'aux-B-NC':   'Contato auxiliar fonte B — NF (abre quando fonte B ativa)',
    'aux-B-COM':  'Contato auxiliar fonte B — comum',
    'aux-B-NO':   'Contato auxiliar fonte B — NA (fecha quando fonte B ativa)',
    'out-R':      'Saída de carga — fase (roteada internamente)',
    'out-N':      'Saída de carga — neutro (roteada internamente)',
  },
  modes: [
    {
      id: 'srcA', label: 'Fonte A (Normal)', color: '#4caf50',
      routes: [
        { from: 'in-A-R', to: 'out-R' },
        { from: 'in-A-N', to: 'out-N' },
        { from: 'aux-A-COM', to: 'aux-A-NO' },
        { from: 'aux-B-COM', to: 'aux-B-NC' },
      ],
    },
    {
      id: 'srcB', label: 'Fonte B (Reserve)', color: '#2196f3',
      routes: [
        { from: 'in-B-R', to: 'out-R' },
        { from: 'in-B-N', to: 'out-N' },
        { from: 'aux-B-COM', to: 'aux-B-NO' },
        { from: 'aux-A-COM', to: 'aux-A-NC' },
      ],
    },
    { id: 'off', label: 'Desligado', color: '#f44336', routes: [] },
  ],
  defaultMode: 'srcA',
  nominalCurrentA: 100,
  behavior: sourcePriorityBehavior(
    [
      { ports: ['in-A-R', 'in-A-N'], mode: 'srcA' },
      { ports: ['in-B-R', 'in-B-N'], mode: 'srcB' },
    ],
    'off',
  ),
  properties: [
    { key: 'nominalCurrentA', label: 'Corrente nominal', type: 'select', options: [
      { value: 63, label: '63A' },
      { value: 100, label: '100A' },
      { value: 125, label: '125A' },
    ], defaultValue: 100 },
    { key: 'switchDelayMs', label: 'Tempo de comutação (ms)', type: 'number', defaultValue: 500 },
  ],
};

export default component;
