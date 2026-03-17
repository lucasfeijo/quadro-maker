import type { ComponentSpec } from './_spec';
import { makePortsVertical, makeRoutesBusbar } from './_spec';

const LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const MODULE_HEIGHT_MM = 70;

const component: ComponentSpec = {
  id: 'busbar-rail-8p-phase',
  name: 'Barr. Fase 8P',
  description: 'Barramento de trilho DIN para fase com 8 bornes. Largura fixa 10mm, encaixa verticalmente no trilho. Bornes centralizados e equidistantes, conectáveis por qualquer lado.',
  widthMm: 10,
  category: 'terminal',
  poles: 8,
  color: '#d32f2f',
  icon: 'terminal',
  ports: makePortsVertical(8, MODULE_HEIGHT_MM, LABELS, Array(8).fill('phase')),
  portDescriptions: Object.fromEntries(
    LABELS.map((l) => [l, `Borne ${l} — fase`]),
  ),
  modes: [
    { id: 'on', label: 'Conectado', color: '#d32f2f', routes: makeRoutesBusbar(LABELS) },
  ],
  defaultMode: 'on',
  din_mounted: true,
  screw_mounted: false,
};

export default component;
