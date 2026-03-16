import type { ComponentSpec } from './_spec';
import { makePortsVertical, makeRoutesBusbar } from './_spec';

const LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const MODULE_HEIGHT_MM = 70;

const component: ComponentSpec = {
  id: 'busbar-rail-8p-ground',
  name: 'Barr. Terra 8P',
  description: 'Barramento de trilho DIN para terra (PE) com 8 bornes. Largura fixa 10mm, encaixa verticalmente no trilho. Bornes centralizados e equidistantes, conectáveis por qualquer lado.',
  widthMm: 10,
  category: 'terminal',
  poles: 8,
  color: '#2e7d32',
  icon: 'terminal',
  ports: makePortsVertical(8, MODULE_HEIGHT_MM, LABELS, Array(8).fill('ground')),
  portDescriptions: Object.fromEntries(
    LABELS.map((l) => [l, `Borne ${l} — terra/PE`]),
  ),
  modes: [
    { id: 'on', label: 'Conectado', color: '#2e7d32', routes: makeRoutesBusbar(LABELS) },
  ],
  defaultMode: 'on',
};

export default component;
