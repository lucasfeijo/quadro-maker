import type { ComponentSpec } from './_spec';
import { makePortsHorizontal, makeRoutesBusbar } from './_spec';

const LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const BAR_WIDTH_MM = 80;

const component: ComponentSpec = {
  id: 'busbar-screw-8p-phase',
  name: 'Barr. Fase 8P (paraf.)',
  description: 'Barramento de parafusar para fase com 8 bornes. Bornes centralizados no corpo da barra.',
  widthMm: BAR_WIDTH_MM,
  category: 'terminal',
  poles: 8,
  color: '#d32f2f',
  icon: 'terminal',
  din_mounted: false,
  screw_mounted: true,
  ports: makePortsHorizontal(8, BAR_WIDTH_MM, LABELS, Array(8).fill('phase')),
  portDescriptions: Object.fromEntries(
    LABELS.map((l) => [l, `Borne ${l} — fase`]),
  ),
  modes: [
    { id: 'on', label: 'Conectado', color: '#d32f2f', routes: makeRoutesBusbar(LABELS) },
  ],
  defaultMode: 'on',
  properties: [
    {
      key: 'rotationDeg',
      label: 'Rotação',
      type: 'select',
      options: [
        { value: 0, label: 'Normal (0°)' },
        { value: 90, label: '90°' },
        { value: 180, label: '180°' },
        { value: 270, label: '270°' },
      ],
      defaultValue: 0,
    },
  ],
};

export default component;
