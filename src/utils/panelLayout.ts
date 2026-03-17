import type { ResolvedLayout } from '../types';

type LayoutInput = Pick<import('../types').PanelState, 'enclosureId' | 'widthUnits' | 'rowCount' | 'rows'>;
import { getEnclosureById, DIN_MODULE_1P_MM } from '../data/enclosures';

const ROW_HEIGHT_MM = 100;
const ROW_SPACING_MM = 30;
const WALL_THICKNESS_MM = 30;
const DEFAULT_FIXING_MARGIN_MM = 30;
const VERTICAL_PADDING_MM = 40;

export function resolveLayout(state: LayoutInput): ResolvedLayout {
  return state.enclosureId
    ? resolveEnclosureLayout(state.enclosureId)
    : resolveCustomLayout(state.widthUnits, state.rowCount);
}

function resolveEnclosureLayout(enclosureId: string): ResolvedLayout {
  const enc = getEnclosureById(enclosureId)!;
  const origWallX = (enc.exteriorWidthMm - enc.interiorWidthMm) / 2;
  const origWallY = (enc.exteriorHeightMm - enc.interiorHeightMm) / 2;
  const minWall = WALL_THICKNESS_MM;
  const extraX = Math.max(0, minWall - origWallX);
  const extraY = Math.max(0, minWall - origWallY);

  return {
    exteriorWidthMm: enc.exteriorWidthMm + extraX * 2,
    exteriorHeightMm: enc.exteriorHeightMm + extraY * 2,
    interiorWidthMm: enc.interiorWidthMm,
    interiorHeightMm: enc.interiorHeightMm,
    interiorOffsetXMm: origWallX + extraX,
    interiorOffsetYMm: origWallY + extraY,
    rails: enc.rails.map((r) => {
      const fixingMarginMm = (enc.interiorWidthMm - r.usableWidthMm) / 2;
      return {
        ...r,
        xMm: 0,
        widthMm: enc.interiorWidthMm,
        usableWidthMm: r.usableWidthMm,
        fixingMarginMm,
      };
    }),
    mountingHoles: enc.mountingHoles,
    isEnclosure: true,
  };
}

function resolveCustomLayout(
  widthUnits: number,
  rowCount: number,
): ResolvedLayout {
  const usableWidth = widthUnits * DIN_MODULE_1P_MM;
  const interiorWidth = usableWidth + DEFAULT_FIXING_MARGIN_MM * 2;
  const interiorHeight =
    VERTICAL_PADDING_MM * 2 + rowCount * ROW_HEIGHT_MM + (rowCount - 1) * ROW_SPACING_MM;
  const exteriorWidth = interiorWidth + WALL_THICKNESS_MM * 2;
  const exteriorHeight = interiorHeight + WALL_THICKNESS_MM * 2;

  const rails = Array.from({ length: rowCount }, (_, i) => ({
    id: `row-${i}`,
    xMm: 0,
    yMm: VERTICAL_PADDING_MM + i * (ROW_HEIGHT_MM + ROW_SPACING_MM) + ROW_HEIGHT_MM / 2 - 5,
    widthMm: interiorWidth,
    usableWidthMm: interiorWidth - DEFAULT_FIXING_MARGIN_MM * 2,
    fixingMarginMm: DEFAULT_FIXING_MARGIN_MM,
  }));

  return {
    exteriorWidthMm: exteriorWidth,
    exteriorHeightMm: exteriorHeight,
    interiorWidthMm: interiorWidth,
    interiorHeightMm: interiorHeight,
    interiorOffsetXMm: WALL_THICKNESS_MM,
    interiorOffsetYMm: WALL_THICKNESS_MM,
    rails,
    mountingHoles: [],
    isEnclosure: false,
  };
}
