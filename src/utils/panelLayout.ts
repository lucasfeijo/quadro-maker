import { PanelState, ResolvedLayout } from '../types';
import { getEnclosureById } from '../data/enclosures';

const ROW_HEIGHT_CM = 10;
const ROW_SPACING_CM = 3;
const WALL_THICKNESS_CM = 2;
const DEFAULT_FIXING_MARGIN = 3;

export function resolveLayout(state: PanelState): ResolvedLayout {
  if (state.enclosureId) {
    return resolveEnclosureLayout(state.enclosureId);
  }
  return resolveCustomLayout(state.widthUnits, state.rowCount);
}

function resolveEnclosureLayout(enclosureId: string): ResolvedLayout {
  const enc = getEnclosureById(enclosureId)!;
  const wallX = (enc.exteriorWidthCm - enc.interiorWidthCm) / 2;
  const wallY = (enc.exteriorHeightCm - enc.interiorHeightCm) / 2;

  return {
    exteriorWidthCm: enc.exteriorWidthCm,
    exteriorHeightCm: enc.exteriorHeightCm,
    interiorWidthCm: enc.interiorWidthCm,
    interiorHeightCm: enc.interiorHeightCm,
    interiorOffsetXCm: wallX,
    interiorOffsetYCm: wallY,
    rails: enc.rails.map((r) => ({ ...r })),
    mountingHoles: enc.mountingHoles,
    isEnclosure: true,
  };
}

function resolveCustomLayout(
  widthUnits: number,
  rowCount: number,
): ResolvedLayout {
  const usableWidth = widthUnits * 3;
  const railWidth = usableWidth + DEFAULT_FIXING_MARGIN * 2;
  const interiorWidth = railWidth;
  const interiorHeight =
    rowCount * ROW_HEIGHT_CM + (rowCount - 1) * ROW_SPACING_CM;
  const exteriorWidth = interiorWidth + WALL_THICKNESS_CM * 2;
  const exteriorHeight = interiorHeight + WALL_THICKNESS_CM * 2;

  const rails = Array.from({ length: rowCount }, (_, i) => ({
    id: `row-${i}`,
    xCm: 0,
    yCm: i * (ROW_HEIGHT_CM + ROW_SPACING_CM) + ROW_HEIGHT_CM / 2 - 0.5,
    widthCm: railWidth,
    usableWidthCm: usableWidth,
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
