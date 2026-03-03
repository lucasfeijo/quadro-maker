import { PlacedModule } from '../types';
import { getModuleById } from '../data/modules';

export const PX_PER_CM = 10;

export function snapToCm(valueCm: number): number {
  return Math.round(valueCm);
}

export function pxToCm(px: number): number {
  return px / PX_PER_CM;
}

export function cmToPx(cm: number): number {
  return cm * PX_PER_CM;
}

export function getModuleRange(
  mod: PlacedModule,
): { start: number; end: number } | null {
  const def = getModuleById(mod.moduleId);
  if (!def) return null;
  return { start: mod.positionCm, end: mod.positionCm + def.widthCm };
}

export function hasOverlap(
  modules: PlacedModule[],
  newStart: number,
  newEnd: number,
  excludeInstanceId?: string,
): boolean {
  return modules.some((m) => {
    if (excludeInstanceId && m.instanceId === excludeInstanceId) return false;
    const range = getModuleRange(m);
    if (!range) return false;
    return newStart < range.end && newEnd > range.start;
  });
}

export function fitsInRail(
  positionCm: number,
  widthCm: number,
  usableWidthCm: number,
): boolean {
  return positionCm >= 0 && positionCm + widthCm <= usableWidthCm;
}

export function canPlace(
  modules: PlacedModule[],
  positionCm: number,
  widthCm: number,
  usableWidthCm: number,
  excludeInstanceId?: string,
): boolean {
  if (!fitsInRail(positionCm, widthCm, usableWidthCm)) return false;
  return !hasOverlap(
    modules,
    positionCm,
    positionCm + widthCm,
    excludeInstanceId,
  );
}
