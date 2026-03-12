import type { PanelIO, PanelEdge } from '../types';

const WALL_PX = 35;
const IO_BOX_W = 20;
const IO_BOX_H = 14;

export interface IOBoxPosition {
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  portX: number;
  portY: number;
}

export function getIOPosition(
  io: PanelIO,
  svgWidth: number,
  svgHeight: number,
): IOBoxPosition {
  const frac = io.positionPercent / 100;

  switch (io.edge) {
    case 'top': {
      const bx = frac * svgWidth - IO_BOX_W / 2;
      const by = (WALL_PX - IO_BOX_H) / 2 + 4;
      return { boxX: bx, boxY: by, boxW: IO_BOX_W, boxH: IO_BOX_H, portX: bx + IO_BOX_W / 2, portY: WALL_PX + 3 };
    }
    case 'bottom': {
      const bx = frac * svgWidth - IO_BOX_W / 2;
      const by = svgHeight - (WALL_PX + IO_BOX_H) / 2 - 4;
      return { boxX: bx, boxY: by, boxW: IO_BOX_W, boxH: IO_BOX_H, portX: bx + IO_BOX_W / 2, portY: svgHeight - WALL_PX - 3 };
    }
    case 'left': {
      const bx = (WALL_PX - IO_BOX_W) / 2;
      const by = frac * svgHeight - IO_BOX_H / 2;
      return { boxX: bx, boxY: by, boxW: IO_BOX_W, boxH: IO_BOX_H, portX: WALL_PX + 3, portY: by + IO_BOX_H / 2 };
    }
    case 'right': {
      const bx = svgWidth - (WALL_PX + IO_BOX_W) / 2;
      const by = frac * svgHeight - IO_BOX_H / 2;
      return { boxX: bx, boxY: by, boxW: IO_BOX_W, boxH: IO_BOX_H, portX: svgWidth - WALL_PX - 3, portY: by + IO_BOX_H / 2 };
    }
  }
}

export function getIOPortPosition(
  io: PanelIO,
  svgWidth: number,
  svgHeight: number,
): { x: number; y: number; type: string } {
  const pos = getIOPosition(io, svgWidth, svgHeight);
  return { x: pos.portX, y: pos.portY, type: io.type };
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
