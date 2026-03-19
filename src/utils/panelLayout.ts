import type { ResolvedLayout } from '../types';

type LayoutInput = Pick<import('../types').PanelState, 'enclosureId' | 'widthUnits' | 'rowCount' | 'rows' | 'exteriorWidthMm' | 'exteriorHeightMm' | 'railYOverridesMm' | 'barOverhangMm'>;
import { getEnclosureById, DIN_MODULE_1P_MM } from '../data/enclosures';

export const ROW_HEIGHT_MM = 100;
export const ROW_SPACING_MM = 30;
export const WALL_THICKNESS_MM = 30;
export const DEFAULT_FIXING_MARGIN_MM = 30;
export const VERTICAL_PADDING_MM = 40;
export const DEFAULT_BAR_OVERHANG_MM = 15;
export const RAIL_BRACKET_SPACE_MM = 15;

/** Absolute minimum exterior dimensions — just enough for usable rail + walls */
export function getMinExteriorDimensions(widthUnits: number, rowCount: number) {
  const usableWidth = widthUnits * DIN_MODULE_1P_MM;
  const contentHeight = rowCount * ROW_HEIGHT_MM + (rowCount - 1) * ROW_SPACING_MM;
  return {
    width: usableWidth + WALL_THICKNESS_MM * 2,
    height: contentHeight + WALL_THICKNESS_MM * 2,
  };
}

export function resolveLayout(state: LayoutInput): ResolvedLayout {
  return state.enclosureId
    ? resolveEnclosureLayout(state.enclosureId)
    : resolveCustomLayout(
        state.widthUnits,
        state.rowCount,
        state.exteriorWidthMm,
        state.exteriorHeightMm,
        state.railYOverridesMm,
        state.barOverhangMm,
      );
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
      const barOvh = Math.max(0, fixingMarginMm - RAIL_BRACKET_SPACE_MM);
      return {
        ...r,
        xMm: 0,
        widthMm: enc.interiorWidthMm,
        usableWidthMm: r.usableWidthMm,
        fixingMarginMm,
        barOverhangLeftMm: barOvh,
        barOverhangRightMm: barOvh,
      };
    }),
    mountingHoles: enc.mountingHoles,
    isEnclosure: true,
  };
}

export function resolveCustomLayout(
  widthUnits: number,
  rowCount: number,
  exteriorWidthMm?: number,
  exteriorHeightMm?: number,
  railYOverridesMm?: Record<string, number>,
  barOverhangMm?: number,
): ResolvedLayout {
  const overhang = barOverhangMm ?? DEFAULT_BAR_OVERHANG_MM;
  const usableWidth = widthUnits * DIN_MODULE_1P_MM;
  const contentHeight = rowCount * ROW_HEIGHT_MM + (rowCount - 1) * ROW_SPACING_MM;

  let exteriorWidth: number;
  let exteriorHeight: number;
  let interiorWidth: number;
  let interiorHeight: number;
  let interiorOffsetXMm: number;
  let interiorOffsetYMm: number;
  let railFixingMarginMm: number;
  let railStartYMm: number;

  if (
    exteriorWidthMm != null &&
    exteriorHeightMm != null &&
    exteriorWidthMm > 0 &&
    exteriorHeightMm > 0
  ) {
    exteriorWidth = exteriorWidthMm;
    exteriorHeight = exteriorHeightMm;
    interiorWidth = exteriorWidth - WALL_THICKNESS_MM * 2;
    interiorHeight = exteriorHeight - WALL_THICKNESS_MM * 2;
    interiorOffsetXMm = WALL_THICKNESS_MM;
    interiorOffsetYMm = WALL_THICKNESS_MM;
    railFixingMarginMm = Math.max(0, (interiorWidth - usableWidth) / 2);
    railStartYMm = Math.max(0, (interiorHeight - contentHeight) / 2);
  } else {
    const computedFixing = RAIL_BRACKET_SPACE_MM + overhang;
    const baseInteriorWidth = usableWidth + computedFixing * 2;
    const baseInteriorHeight = VERTICAL_PADDING_MM * 2 + contentHeight;
    exteriorWidth = baseInteriorWidth + WALL_THICKNESS_MM * 2;
    exteriorHeight = baseInteriorHeight + WALL_THICKNESS_MM * 2;
    interiorWidth = baseInteriorWidth;
    interiorHeight = baseInteriorHeight;
    interiorOffsetXMm = WALL_THICKNESS_MM;
    interiorOffsetYMm = WALL_THICKNESS_MM;
    railFixingMarginMm = computedFixing;
    railStartYMm = VERTICAL_PADDING_MM;
  }

  const railFixing = railFixingMarginMm;
  const railWidthMm = usableWidth + railFixing * 2;
  const railXMm = (interiorWidth - railWidthMm) / 2;

  const effectiveOverhang = Math.min(overhang, railFixing);

  const rails = Array.from({ length: rowCount }, (_, i) => {
    const id = `row-${i}`;
    const defaultY = railStartYMm + i * (ROW_HEIGHT_MM + ROW_SPACING_MM) + ROW_HEIGHT_MM / 2 - 17.5;
    return {
      id,
      xMm: railXMm,
      yMm: railYOverridesMm?.[id] ?? defaultY,
      widthMm: railWidthMm,
      usableWidthMm: usableWidth,
      fixingMarginMm: railFixing,
      barOverhangLeftMm: effectiveOverhang,
      barOverhangRightMm: effectiveOverhang,
    };
  });

  return {
    exteriorWidthMm: exteriorWidth,
    exteriorHeightMm: exteriorHeight,
    interiorWidthMm: interiorWidth,
    interiorHeightMm: interiorHeight,
    interiorOffsetXMm,
    interiorOffsetYMm,
    rails,
    mountingHoles: [],
    isEnclosure: false,
  };
}
