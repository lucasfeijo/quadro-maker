import type { PanelIO, PanelEdge, PanelIOType } from '../types';

const WALL_PX = 35;
const IO_BOX_W = 20;
const IO_BOX_H = 14;

export function getIOTypes(io: PanelIO): PanelIOType[] {
  return io.types ?? (io.type != null ? [io.type] : ['phase']);
}

export interface IOPortPosition {
  portId: string;
  x: number;
  y: number;
}

export interface IOBoxPosition {
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  ports: IOPortPosition[];
}

export function getIOPosition(
  io: PanelIO,
  svgWidth: number,
  svgHeight: number,
): IOBoxPosition {
  const types = getIOTypes(io);
  const n = types.length;
  const boxW = IO_BOX_W; // mesma largura para 1, 2 ou 3 fios
  const frac = io.positionPercent / 100;

  switch (io.edge) {
    case 'top': {
      const bx = frac * svgWidth - boxW / 2;
      const by = (WALL_PX - IO_BOX_H) / 2 + 4;
      const portY = WALL_PX + 3;
      const ports = types.map((t, i) => ({
        portId: t,
        x: n <= 1 ? bx + boxW / 2 : bx + 4 + (n > 1 ? (boxW - 8) * (i / (n - 1)) : 0),
        y: portY,
      }));
      return { boxX: bx, boxY: by, boxW, boxH: IO_BOX_H, ports };
    }
    case 'bottom': {
      const bx = frac * svgWidth - boxW / 2;
      const by = svgHeight - (WALL_PX + IO_BOX_H) / 2 - 4;
      const portY = svgHeight - WALL_PX - 3;
      const ports = types.map((t, i) => ({
        portId: t,
        x: n <= 1 ? bx + boxW / 2 : bx + 4 + (n > 1 ? (boxW - 8) * (i / (n - 1)) : 0),
        y: portY,
      }));
      return { boxX: bx, boxY: by, boxW, boxH: IO_BOX_H, ports };
    }
    case 'left': {
      const bx = (WALL_PX - boxW) / 2;
      const by = frac * svgHeight - IO_BOX_H / 2;
      const portX = WALL_PX + 3;
      const ports = types.map((t, i) => ({
        portId: t,
        x: portX,
        y: n <= 1 ? by + IO_BOX_H / 2 : by + 4 + (n > 1 ? (IO_BOX_H - 8) * (i / (n - 1)) : 0),
      }));
      return { boxX: bx, boxY: by, boxW, boxH: IO_BOX_H, ports };
    }
    case 'right': {
      const bx = svgWidth - (WALL_PX + boxW) / 2;
      const by = frac * svgHeight - IO_BOX_H / 2;
      const portX = svgWidth - WALL_PX - 3;
      const ports = types.map((t, i) => ({
        portId: t,
        x: portX,
        y: n <= 1 ? by + IO_BOX_H / 2 : by + 4 + (n > 1 ? (IO_BOX_H - 8) * (i / (n - 1)) : 0),
      }));
      return { boxX: bx, boxY: by, boxW, boxH: IO_BOX_H, ports };
    }
  }
}

export function getIOPortPosition(
  io: PanelIO,
  portId: string,
  svgWidth: number,
  svgHeight: number,
): { x: number; y: number; type: string } | null {
  const pos = getIOPosition(io, svgWidth, svgHeight);
  const types = getIOTypes(io);
  const pid = portId === 'port' && types.length > 0 ? types[0] : portId;
  const p = pos.ports.find((x) => x.portId === pid);
  if (!p) return null;
  return { x: p.x, y: p.y, type: p.portId };
}

export function closestEdge(
  mouseX: number,
  mouseY: number,
  svgWidth: number,
  svgHeight: number,
): { edge: PanelEdge; positionPercent: number } {
  const dTop = mouseY;
  const dBottom = svgHeight - mouseY;
  const dLeft = mouseX;
  const dRight = svgWidth - mouseX;
  const minD = Math.min(dTop, dBottom, dLeft, dRight);

  const clamp = (v: number) => Math.max(5, Math.min(95, v));

  if (minD === dTop) return { edge: 'top', positionPercent: clamp((mouseX / svgWidth) * 100) };
  if (minD === dBottom) return { edge: 'bottom', positionPercent: clamp((mouseX / svgWidth) * 100) };
  if (minD === dLeft) return { edge: 'left', positionPercent: clamp((mouseY / svgHeight) * 100) };
  return { edge: 'right', positionPercent: clamp((mouseY / svgHeight) * 100) };
}

export function findDefaultPositionPercent(existingOnEdge: number[]): number {
  if (existingOnEdge.length === 0) return 50;
  const sorted = [5, ...existingOnEdge.sort((a, b) => a - b), 95];
  let bestGap = 0;
  let bestPos = 50;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1] - sorted[i];
    if (gap > bestGap) {
      bestGap = gap;
      bestPos = (sorted[i] + sorted[i + 1]) / 2;
    }
  }
  return Math.round(bestPos);
}
