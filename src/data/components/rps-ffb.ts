import { phaseMonitorBehavior } from './_spec';

/**
 * Relé de Proteção Falta de Fase Bifásico RPS-FFB (CCA Eletrônica)
 * Monitora L1, L2 e N. Quando ambas as fases estão OK, o relé energiza (C→NA).
 * Em falta de fase ou assimetria, desenergiza (C→NF).
 * @see https://www.cca.ind.br/ (especificações CCA)
 */
const component = {
  id: 'rps-ffb',
  name: 'RPS-FFB',
  description:
    'Relé de proteção contra falta de fase bifásico (CCA). Monitora L1, L2 e N. Quando as fases estão OK, energiza (C→NA). Em falta de fase ou assimetria, desenergiza (C→NF). Usado em painéis para proteção de motores e equipamentos.',
  // Datasheet CCA: largura 24,1 mm (DIMENSÕES FÍSICAS)
  widthCm: 2.4,
  category: 'relay' as const,
  color: '#c62828',
  icon: 'relay',
  ports: [
    { id: 'nf', label: 'NF', side: 'top' as const, offsetXCm: 0.4, type: 'any' as const },
    { id: 'c', label: 'C', side: 'top' as const, offsetXCm: 1.2, type: 'any' as const },
    { id: 'na', label: 'NA', side: 'top' as const, offsetXCm: 2.0, type: 'any' as const },
    { id: 'l1', label: 'L1', side: 'bottom' as const, offsetXCm: 0.4, type: 'phase' as const },
    { id: 'l2', label: 'L2', side: 'bottom' as const, offsetXCm: 1.2, type: 'phase' as const },
    { id: 'n', label: 'N', side: 'bottom' as const, offsetXCm: 2.0, type: 'neutral' as const },
  ],
  portDescriptions: {
    nf: 'Normally Closed — fechado em falta de fase',
    c: 'Comum do contato (entrada)',
    na: 'Normally Open — fechado quando fases OK',
    l1: 'Fase 1 — alimentação bifásica',
    l2: 'Fase 2 — alimentação bifásica',
    n: 'Neutro — referência bifásica',
  },
  modes: [
    { id: 'on', label: 'Fases OK', color: '#4caf50', routes: [{ from: 'c', to: 'na' }] },
    { id: 'off', label: 'Falta de fase', color: '#ff9800', routes: [{ from: 'c', to: 'nf' }] },
  ],
  defaultMode: 'off',
  behavior: phaseMonitorBehavior(['l1', 'l2'], 'on', 'off'),
};

export default component;
