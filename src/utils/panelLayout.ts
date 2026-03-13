import { PanelState, ResolvedLayout } from '../types';
import { getEnclosureById } from '../data/enclosures';

const ROW_HEIGHT_CM = 10;
const ROW_SPACING_CM = 3;
const WALL_THICKNESS_CM = 3;
const DEFAULT_FIXING_MARGIN = 3;
const RAIL_INSET_CM = 1.5;

export function resolveLayout(state: PanelState): ResolvedLayout {
  if (state.enclosureId) {
    return resolveEnclosureLayout(state.enclosureId);
  }
  return resolveCustomLayout(state.widthUnits, state.rowCount);
}

function resolveEnclosureLayout(enclosureId: string): ResolvedLayout {
  const enc = getEnclosureById(enclosureId)!;
  const origWallX = (enc.exteriorWidthCm - enc.interiorWidthCm) / 2;
  const origWallY = (enc.exteriorHeightCm - enc.interiorHeightCm) / 2;
  const minWall = WALL_THICKNESS_CM;
  const extraX = Math.max(0, minWall - origWallX);
  const extraY = Math.max(0, minWall - origWallY);

  return {
    exteriorWidthCm: enc.exteriorWidthCm + extraX * 2,
    exteriorHeightCm: enc.exteriorHeightCm + extraY * 2,
    interiorWidthCm: enc.interiorWidthCm,
    interiorHeightCm: enc.interiorHeightCm,
    interiorOffsetXCm: origWallX + extraX,
    interiorOffsetYCm: origWallY + extraY,
    rails: enc.rails.map((r) => ({
      ...r,
      xCm: 0,
      widthCm: enc.interiorWidthCm,
      usableWidthCm: enc.interiorWidthCm - r.fixingMarginCm * 2,
    })),
    mountingHoles: enc.mountingHoles,
    isEnclosure: true,
  };
}

function resolveCustomLayout(
  widthUnits: number,
  rowCount: number,
): ResolvedLayout {
  const usableWidth = widthUnits * 3;
  const interiorWidth = usableWidth + DEFAULT_FIXING_MARGIN * 2;
  const interiorHeight =
    rowCount * ROW_HEIGHT_CM + (rowCount - 1) * ROW_SPACING_CM;
  const exteriorWidth = interiorWidth + WALL_THICKNESS_CM * 2;
  const exteriorHeight = interiorHeight + WALL_THICKNESS_CM * 2;

  // Rail ocupa toda a largura do interior; área útil = interior - zonas de fixação
  const rails = Array.from({ length: rowCount }, (_, i) => ({
    id: `row-${i}`,
    xCm: 0,
    yCm: i * (ROW_HEIGHT_CM + ROW_SPACING_CM) + ROW_HEIGHT_CM / 2 - 0.5,
    widthCm: interiorWidth,
    usableWidthCm: interiorWidth - DEFAULT_FIXING_MARGIN * 2,
    fixingMarginCm: DEFAULT_FIXING_MARGIN,
  }));

  return {
    exteriorWidthCm: exteriorWidth,
    exteriorHeightCm: exteriorHeight,
    interiorWidthCm: interiorWidth,
    interiorHeightCm: interiorHeight,
    interiorOffsetXCm: WALL_THICKNESS_CM,
    interiorOffsetYCm: WALL_THICKNESS_CM,
    rails,
    mountingHoles: [],
    isEnclosure: false,
  };
}
