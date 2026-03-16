import { PlacedModule } from '../types';
import { getModuleById } from '../data/modules';

export const PX_PER_MM = 1;

export function snapToMm(valueMm: number): number {
  return Math.round(valueMm);
}

export function pxToMm(px: number): number {
  return Math.round(px / PX_PER_MM);
}

export function mmToPx(mm: number): number {
  return mm * PX_PER_MM;
}

export function getModuleRange(
  mod: PlacedModule,
): { start: number; end: number } | null {
  const def = getModuleById(mod.moduleId);
  if (!def) return null;
  return { start: mod.positionMm, end: mod.positionMm + def.widthMm };
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
  positionMm: number,
  widthMm: number,
  usableWidthMm: number,
): boolean {
  return positionMm >= 0 && positionMm + widthMm <= usableWidthMm;
}

export function canPlace(
  modules: PlacedModule[],
  positionMm: number,
  widthMm: number,
  usableWidthMm: number,
  excludeInstanceId?: string,
): boolean {
  if (!fitsInRail(positionMm, widthMm, usableWidthMm)) return false;
  return !hasOverlap(
    modules,
    positionMm,
    positionMm + widthMm,
    excludeInstanceId,
  );
}

/**
 * If the desired position overlaps a neighbor, clamp to the nearest
 * edge so the module "sticks" next to it instead of being rejected.
 */
export function clampToNeighbors(
  modules: PlacedModule[],
  desiredMm: number,
  widthMm: number,
  usableWidthMm: number,
  excludeInstanceId?: string,
): number {
  let pos = desiredMm;

  const neighbors = modules
    .filter((m) => !excludeInstanceId || m.instanceId !== excludeInstanceId)
    .map((m) => getModuleRange(m))
    .filter((r): r is { start: number; end: number } => r !== null);

  for (const nb of neighbors) {
    const oStart = pos;
    const oEnd = pos + widthMm;
    if (oStart < nb.end && oEnd > nb.start) {
      const snapLeft = nb.start - widthMm;
      const snapRight = nb.end;
      if (Math.abs(snapLeft - desiredMm) <= Math.abs(snapRight - desiredMm)) {
        pos = snapLeft;
      } else {
        pos = snapRight;
      }
    }
  }

  pos = Math.max(0, Math.min(pos, usableWidthMm - widthMm));
  pos = snapToMm(pos);

  if (canPlace(modules, pos, widthMm, usableWidthMm, excludeInstanceId)) {
    return pos;
  }
  return desiredMm;
}
