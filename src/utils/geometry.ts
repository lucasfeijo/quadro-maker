import { PlacedModule } from '../types';
import { getModuleById } from '../data/modules';

export const PX_PER_CM = 10;

const SNAP_STEP_CM = 0.1;

export function snapToCm(valueCm: number): number {
  return Math.round(valueCm / SNAP_STEP_CM) * SNAP_STEP_CM;
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

/**
 * If the desired position overlaps a neighbor, clamp to the nearest
 * edge so the module "sticks" next to it instead of being rejected.
 */
export function clampToNeighbors(
  modules: PlacedModule[],
  desiredCm: number,
  widthCm: number,
  usableWidthCm: number,
  excludeInstanceId?: string,
): number {
  let pos = desiredCm;
  const newEnd = pos + widthCm;

  const neighbors = modules
    .filter((m) => !excludeInstanceId || m.instanceId !== excludeInstanceId)
    .map((m) => getModuleRange(m))
    .filter((r): r is { start: number; end: number } => r !== null);

  for (const nb of neighbors) {
    const oStart = pos;
    const oEnd = pos + widthCm;
    if (oStart < nb.end && oEnd > nb.start) {
      const snapLeft = nb.start - widthCm;
      const snapRight = nb.end;
      if (Math.abs(snapLeft - desiredCm) <= Math.abs(snapRight - desiredCm)) {
        pos = snapLeft;
      } else {
        pos = snapRight;
      }
    }
  }

  pos = Math.max(0, Math.min(pos, usableWidthCm - widthCm));
  pos = snapToCm(pos);

  if (canPlace(modules, pos, widthCm, usableWidthCm, excludeInstanceId)) {
    return pos;
  }
  return desiredCm;
}
