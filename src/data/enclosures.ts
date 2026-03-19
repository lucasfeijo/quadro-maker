import { EnclosureDefinition } from '../types';

/** Largura por módulo DIN 1P (disjuntor unipolar) em mm — padrão 17.5mm, app usa 18 */
export const DIN_MODULE_1P_MM = 18;

const RAIL_BRACKET_SPACE_MM = 10;

function makeRails(
  count: number,
  railWidthMm: number,
  usableWidthMm: number,
  fixingMarginMm: number,
  startYMm: number,
  spacingYMm: number,
  xMm: number,
): EnclosureDefinition['rails'] {
  const barOvh = Math.max(0, fixingMarginMm - RAIL_BRACKET_SPACE_MM);
  return Array.from({ length: count }, (_, i) => ({
    id: `rail-${i}`,
    xMm,
    yMm: startYMm + i * spacingYMm - 12.5,
    widthMm: railWidthMm,
    usableWidthMm,
    fixingMarginMm,
    barOverhangLeftMm: barOvh,
    barOverhangRightMm: barOvh,
  }));
}

export const ENCLOSURE_LIBRARY: EnclosureDefinition[] = [
  // --- Tigre ---
  {
    id: 'tigre-12din',
    brand: 'Tigre',
    model: 'Quadro 12 DIN',
    description: '12 disjuntores, 1 fileira',
    exteriorWidthMm: 340,
    exteriorHeightMm: 230,
    interiorWidthMm: 300,
    interiorHeightMm: 190,
    rails: makeRails(1, 300, 12 * DIN_MODULE_1P_MM, 30, 75, 0, 0),
    mountingHoles: [
      { xMm: 20, yMm: 20, diameterMm: 6 },
      { xMm: 280, yMm: 20, diameterMm: 6 },
      { xMm: 20, yMm: 170, diameterMm: 6 },
      { xMm: 280, yMm: 170, diameterMm: 6 },
    ],
  },
  {
    id: 'tigre-18din',
    brand: 'Tigre',
    model: 'Quadro 18 DIN',
    description: '18 disjuntores, 1 fileira',
    exteriorWidthMm: 400,
    exteriorHeightMm: 230,
    interiorWidthMm: 360,
    interiorHeightMm: 190,
    rails: makeRails(1, 360, 18 * DIN_MODULE_1P_MM, 30, 75, 0, 0),
    mountingHoles: [
      { xMm: 20, yMm: 20, diameterMm: 6 },
      { xMm: 340, yMm: 20, diameterMm: 6 },
      { xMm: 20, yMm: 170, diameterMm: 6 },
      { xMm: 340, yMm: 170, diameterMm: 6 },
    ],
  },
  {
    id: 'tigre-24din',
    brand: 'Tigre',
    model: 'Quadro 24 DIN',
    description: '24 disjuntores, 2 fileiras de 12',
    exteriorWidthMm: 340,
    exteriorHeightMm: 330,
    interiorWidthMm: 300,
    interiorHeightMm: 290,
    rails: makeRails(2, 300, 12 * DIN_MODULE_1P_MM, 30, 60, 150, 0),
    mountingHoles: [
      { xMm: 20, yMm: 20, diameterMm: 6 },
      { xMm: 280, yMm: 20, diameterMm: 6 },
      { xMm: 20, yMm: 270, diameterMm: 6 },
      { xMm: 280, yMm: 270, diameterMm: 6 },
    ],
  },
  {
    id: 'tigre-36din',
    brand: 'Tigre',
    model: 'Quadro 36 DIN',
    description: '36 disjuntores, 3 fileiras de 12',
    exteriorWidthMm: 340,
    exteriorHeightMm: 430,
    interiorWidthMm: 300,
    interiorHeightMm: 390,
    rails: makeRails(3, 300, 12 * DIN_MODULE_1P_MM, 30, 50, 130, 0),
    mountingHoles: [
      { xMm: 20, yMm: 20, diameterMm: 6 },
      { xMm: 280, yMm: 20, diameterMm: 6 },
      { xMm: 20, yMm: 370, diameterMm: 6 },
      { xMm: 280, yMm: 370, diameterMm: 6 },
    ],
  },
  // --- Tramontina ---
  {
    id: 'tramontina-12din',
    brand: 'Tramontina',
    model: 'Quadro 12 DIN',
    description: '12 disjuntores, 1 fileira',
    exteriorWidthMm: 330,
    exteriorHeightMm: 220,
    interiorWidthMm: 290,
    interiorHeightMm: 180,
    rails: makeRails(1, 290, 12 * DIN_MODULE_1P_MM, 30, 70, 0, 0),
    mountingHoles: [
      { xMm: 15, yMm: 15, diameterMm: 5 },
      { xMm: 275, yMm: 15, diameterMm: 5 },
      { xMm: 15, yMm: 165, diameterMm: 5 },
      { xMm: 275, yMm: 165, diameterMm: 5 },
    ],
  },
  {
    id: 'tramontina-24din',
    brand: 'Tramontina',
    model: 'Quadro 24 DIN',
    description: '24 disjuntores, 2 fileiras de 12',
    exteriorWidthMm: 330,
    exteriorHeightMm: 320,
    interiorWidthMm: 290,
    interiorHeightMm: 280,
    rails: makeRails(2, 290, 12 * DIN_MODULE_1P_MM, 30, 55, 145, 0),
    mountingHoles: [
      { xMm: 15, yMm: 15, diameterMm: 5 },
      { xMm: 275, yMm: 15, diameterMm: 5 },
      { xMm: 15, yMm: 265, diameterMm: 5 },
      { xMm: 275, yMm: 265, diameterMm: 5 },
    ],
  },
  {
    id: 'tramontina-36din',
    brand: 'Tramontina',
    model: 'Quadro 36 DIN',
    description: '36 disjuntores, 3 fileiras de 12',
    exteriorWidthMm: 330,
    exteriorHeightMm: 420,
    interiorWidthMm: 290,
    interiorHeightMm: 380,
    rails: makeRails(3, 290, 12 * DIN_MODULE_1P_MM, 30, 45, 125, 0),
    mountingHoles: [
      { xMm: 15, yMm: 15, diameterMm: 5 },
      { xMm: 275, yMm: 15, diameterMm: 5 },
      { xMm: 15, yMm: 365, diameterMm: 5 },
      { xMm: 275, yMm: 365, diameterMm: 5 },
    ],
  },
];

export function getEnclosureById(
  id: string,
): EnclosureDefinition | undefined {
  return ENCLOSURE_LIBRARY.find((e) => e.id === id);
}
