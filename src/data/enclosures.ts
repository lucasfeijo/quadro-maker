import { EnclosureDefinition } from '../types';

function makeRails(
  count: number,
  railWidthCm: number,
  usableWidthCm: number,
  fixingMarginCm: number,
  startYCm: number,
  spacingYCm: number,
  xCm: number,
): EnclosureDefinition['rails'] {
  return Array.from({ length: count }, (_, i) => ({
    id: `rail-${i}`,
    xCm,
    yCm: startYCm + i * spacingYCm,
    widthCm: railWidthCm,
    usableWidthCm,
    fixingMarginCm,
  }));
}

export const ENCLOSURE_LIBRARY: EnclosureDefinition[] = [
  // --- Tigre ---
  {
    id: 'tigre-12din',
    brand: 'Tigre',
    model: 'Quadro 12 DIN',
    description: '12 disjuntores, 1 fileira',
    exteriorWidthCm: 34,
    exteriorHeightCm: 23,
    interiorWidthCm: 30,
    interiorHeightCm: 19,
    rails: makeRails(1, 30, 24, 3, 7.5, 0, 0),
    mountingHoles: [
      { xCm: 2, yCm: 2, diameterMm: 6 },
      { xCm: 28, yCm: 2, diameterMm: 6 },
      { xCm: 2, yCm: 17, diameterMm: 6 },
      { xCm: 28, yCm: 17, diameterMm: 6 },
    ],
  },
  {
    id: 'tigre-18din',
    brand: 'Tigre',
    model: 'Quadro 18 DIN',
    description: '18 disjuntores, 1 fileira',
    exteriorWidthCm: 40,
    exteriorHeightCm: 23,
    interiorWidthCm: 36,
    interiorHeightCm: 19,
    rails: makeRails(1, 36, 30, 3, 7.5, 0, 0),
    mountingHoles: [
      { xCm: 2, yCm: 2, diameterMm: 6 },
      { xCm: 34, yCm: 2, diameterMm: 6 },
      { xCm: 2, yCm: 17, diameterMm: 6 },
      { xCm: 34, yCm: 17, diameterMm: 6 },
    ],
  },
  {
    id: 'tigre-24din',
    brand: 'Tigre',
    model: 'Quadro 24 DIN',
    description: '24 disjuntores, 2 fileiras de 12',
    exteriorWidthCm: 34,
    exteriorHeightCm: 33,
    interiorWidthCm: 30,
    interiorHeightCm: 29,
    rails: makeRails(2, 30, 24, 3, 6, 15, 0),
    mountingHoles: [
      { xCm: 2, yCm: 2, diameterMm: 6 },
      { xCm: 28, yCm: 2, diameterMm: 6 },
      { xCm: 2, yCm: 27, diameterMm: 6 },
      { xCm: 28, yCm: 27, diameterMm: 6 },
    ],
  },
  {
    id: 'tigre-36din',
    brand: 'Tigre',
    model: 'Quadro 36 DIN',
    description: '36 disjuntores, 3 fileiras de 12',
    exteriorWidthCm: 34,
    exteriorHeightCm: 43,
    interiorWidthCm: 30,
    interiorHeightCm: 39,
    rails: makeRails(3, 30, 24, 3, 5, 13, 0),
    mountingHoles: [
      { xCm: 2, yCm: 2, diameterMm: 6 },
      { xCm: 28, yCm: 2, diameterMm: 6 },
      { xCm: 2, yCm: 37, diameterMm: 6 },
      { xCm: 28, yCm: 37, diameterMm: 6 },
    ],
  },
  // --- Tramontina ---
  {
    id: 'tramontina-12din',
    brand: 'Tramontina',
    model: 'Quadro 12 DIN',
    description: '12 disjuntores, 1 fileira',
    exteriorWidthCm: 33,
    exteriorHeightCm: 22,
    interiorWidthCm: 29,
    interiorHeightCm: 18,
    rails: makeRails(1, 29, 23, 3, 7, 0, 0),
    mountingHoles: [
      { xCm: 1.5, yCm: 1.5, diameterMm: 5 },
      { xCm: 27.5, yCm: 1.5, diameterMm: 5 },
      { xCm: 1.5, yCm: 16.5, diameterMm: 5 },
      { xCm: 27.5, yCm: 16.5, diameterMm: 5 },
    ],
  },
  {
    id: 'tramontina-24din',
    brand: 'Tramontina',
    model: 'Quadro 24 DIN',
    description: '24 disjuntores, 2 fileiras de 12',
    exteriorWidthCm: 33,
    exteriorHeightCm: 32,
    interiorWidthCm: 29,
    interiorHeightCm: 28,
    rails: makeRails(2, 29, 23, 3, 5.5, 14.5, 0),
    mountingHoles: [
      { xCm: 1.5, yCm: 1.5, diameterMm: 5 },
      { xCm: 27.5, yCm: 1.5, diameterMm: 5 },
      { xCm: 1.5, yCm: 26.5, diameterMm: 5 },
      { xCm: 27.5, yCm: 26.5, diameterMm: 5 },
    ],
  },
  {
    id: 'tramontina-36din',
    brand: 'Tramontina',
    model: 'Quadro 36 DIN',
    description: '36 disjuntores, 3 fileiras de 12',
    exteriorWidthCm: 33,
    exteriorHeightCm: 42,
    interiorWidthCm: 29,
    interiorHeightCm: 38,
    rails: makeRails(3, 29, 23, 3, 4.5, 12.5, 0),
    mountingHoles: [
      { xCm: 1.5, yCm: 1.5, diameterMm: 5 },
      { xCm: 27.5, yCm: 1.5, diameterMm: 5 },
      { xCm: 1.5, yCm: 36.5, diameterMm: 5 },
      { xCm: 27.5, yCm: 36.5, diameterMm: 5 },
    ],
  },
];

export function getEnclosureById(
  id: string,
): EnclosureDefinition | undefined {
  return ENCLOSURE_LIBRARY.find((e) => e.id === id);
}
