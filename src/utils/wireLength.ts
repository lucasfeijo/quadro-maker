import type { Wire, PlacedModule, PanelIO, ExternalDevice, ResolvedRail } from '../types';
import { getModuleById } from '../data/modules';
import { mmToPx } from './geometry';
import { getIOPortPosition } from './panelIO';
import { getExternalDevicePortPosition } from '../components/ExternalDeviceLayer';

const DEFAULT_MODULE_HEIGHT_MM = 70;

/**
 * Calcula o comprimento total de um caminho de fio a partir dos pontos.
 * Como PX_PER_MM = 1, as coordenadas já estão em mm.
 */
export function calculatePathLength(points: { x: number; y: number }[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

function getPortAbsolutePosition(
  mod: PlacedModule,
  portId: string,
  rowIndex: number,
  rails: ResolvedRail[],
  interiorOffsetXPx: number,
  interiorOffsetYPx: number,
): { x: number; y: number } | null {
  const def = getModuleById(mod.moduleId);
  if (!def) return null;
  const port = def.ports.find((p) => p.id === portId);
  if (!port) return null;

  const rail = rails[rowIndex];
  if (!rail) return null;

  const railLeftPx = interiorOffsetXPx + mmToPx(rail.xMm);
  const fixingPx = mmToPx(rail.fixingMarginMm);
  const usableOffsetXPx = railLeftPx + fixingPx;
  const railTopPx = interiorOffsetYPx + mmToPx(rail.yMm);
  const railHeightPx = mmToPx(35);
  const railCenterY = railTopPx + railHeightPx / 2;

  const modH = def.heightMm ?? DEFAULT_MODULE_HEIGHT_MM;
  const moduleX = usableOffsetXPx + mmToPx(mod.positionMm);
  const moduleY = railCenterY - mmToPx(modH / 2);
  const moduleH = mmToPx(modH);

  const hasVerticalOffset = port.offsetYMm !== undefined;
  const x = moduleX + mmToPx(port.offsetXMm);
  const y = hasVerticalOffset
    ? moduleY + mmToPx(port.offsetYMm!)
    : port.side === 'top'
      ? moduleY - 2
      : moduleY + moduleH + 2;

  return { x, y };
}

export interface WireLengthContext {
  rows: { id: string; modules: PlacedModule[] }[];
  rails: ResolvedRail[];
  panelIOs: PanelIO[];
  externalDevices: ExternalDevice[];
  interiorOffsetXPx: number;
  interiorOffsetYPx: number;
  svgWidth: number;
  svgHeight: number;
}

function resolveEndpoint(
  instanceId: string,
  portId: string,
  ctx: WireLengthContext,
): { x: number; y: number } | null {
  if (instanceId.startsWith('panel-io:')) {
    const ioId = instanceId.replace('panel-io:', '');
    const io = ctx.panelIOs.find((i) => i.id === ioId);
    if (!io) return null;
    const pos = getIOPortPosition(io, portId, ctx.svgWidth, ctx.svgHeight);
    if (!pos) return null;
    return { x: pos.x, y: pos.y };
  }

  const extDev = ctx.externalDevices.find((d) => d.instanceId === instanceId);
  if (extDev) {
    return getExternalDevicePortPosition(extDev, portId);
  }

  for (let i = 0; i < ctx.rows.length; i++) {
    const mod = ctx.rows[i].modules.find((m) => m.instanceId === instanceId);
    if (mod) {
      return getPortAbsolutePosition(mod, portId, i, ctx.rails, ctx.interiorOffsetXPx, ctx.interiorOffsetYPx);
    }
  }
  return null;
}

/**
 * Cores padrão por tipo de porta (mesma lógica do WireLayer).
 */
export const WIRE_COLORS: Record<string, string> = {
  phase: '#333',
  neutral: '#2196f3',
  ground: '#4caf50',
  any: '#ff9800',
};

/**
 * Resolve o tipo da porta de origem de um fio.
 */
export function resolveSourcePortType(
  instanceId: string,
  portId: string,
  ctx: WireLengthContext,
): string | null {
  if (instanceId.startsWith('panel-io:')) {
    const ioId = instanceId.replace('panel-io:', '');
    const io = ctx.panelIOs.find((i) => i.id === ioId);
    if (!io) return null;
    const pos = getIOPortPosition(io, portId, ctx.svgWidth, ctx.svgHeight);
    return pos?.type ?? null;
  }

  const extDev = ctx.externalDevices.find((d) => d.instanceId === instanceId);
  if (extDev) {
    const def = getModuleById(extDev.moduleId);
    const port = def?.ports.find((p) => p.id === portId);
    return port?.type ?? 'any';
  }

  for (const row of ctx.rows) {
    const mod = row.modules.find((m) => m.instanceId === instanceId);
    if (mod) {
      const def = getModuleById(mod.moduleId);
      const port = def?.ports.find((p) => p.id === portId);
      return port?.type ?? 'any';
    }
  }
  return null;
}

/**
 * Resolve a cor efetiva de um fio (mesma lógica do WireLayer).
 * Se wireColor é definido, usa ele. Senão, usa a cor padrão do tipo de porta.
 */
export function resolveWireColor(wire: Wire, ctx: WireLengthContext): string {
  if (wire.wireColor) return wire.wireColor;
  const srcType = resolveSourcePortType(wire.sourceInstanceId, wire.sourcePortId, ctx);
  return WIRE_COLORS[srcType ?? ''] ?? '#333';
}

/**
 * Calcula o comprimento de um fio em mm.
 * Para fios com waypoints, calcula o caminho exato (src → waypoints → tgt).
 * Para fios auto-roteados (sem waypoints), calcula distância Manhattan como estimativa.
 */
export function computeWireLengthMm(wire: Wire, ctx: WireLengthContext): number | null {
  const src = resolveEndpoint(wire.sourceInstanceId, wire.sourcePortId, ctx);
  const tgt = resolveEndpoint(wire.targetInstanceId, wire.targetPortId, ctx);
  if (!src || !tgt) return null;

  const waypoints = wire.waypoints ?? [];
  if (waypoints.length > 0) {
    const points = [src, ...waypoints, tgt];
    return calculatePathLength(points);
  }

  // Estimativa Manhattan para fios auto-roteados
  const dx = Math.abs(tgt.x - src.x);
  const dy = Math.abs(tgt.y - src.y);
  return dx + dy;
}
