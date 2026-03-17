import type { ComponentSpec } from './_spec';
import { makePortsHorizontal, makeRoutesBusbar } from './_spec';

const LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const BAR_WIDTH_MM = 80;

const component: ComponentSpec = {
  id: 'busbar-screw-8p-neutral',
  name: 'Barr. Neutro 8P (paraf.)',
  description: 'Barramento de parafusar para neutro com 8 bornes. Bornes centralizados no corpo da barra.',
  widthMm: BAR_WIDTH_MM,
  category: 'terminal',
  poles: 8,
  color: '#1565c0',
  icon: 'terminal',
  din_mounted: false,
  screw_mounted: true,
  ports: makePortsHorizontal(8, BAR_WIDTH_MM, LABELS, Array(8).fill('neutral')),
  portDescriptions: Object.fromEntries(
    LABELS.map((l) => [l, `Borne ${l} — neutro`]),
  ),
  modes: [
    { id: 'on', label: 'Conectado', color: '#1565c0', routes: makeRoutesBusbar(LABELS) },
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
