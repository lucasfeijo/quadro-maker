import React from 'react';
import type { DisplayMode } from '../types';

interface ModuleIconProps {
  icon?: string;
  imageUrl?: string;
  displayMode: DisplayMode;
  size: number;
  color?: string;
  /** When true, renders SVG elements (<g>) for embedding inside an existing SVG */
  inline?: boolean;
  /** Position offsets for inline SVG mode */
  x?: number;
  y?: number;
}

const ICON_PATHS: Record<string, (s: number) => React.ReactNode> = {
  breaker: (s) => {
    const cx = s / 2, cy = s / 2, r = s * 0.18;
    return (
      <>
        <line x1={cx} y1={s * 0.15} x2={cx} y2={cy - r} stroke="currentColor" strokeWidth={s * 0.06} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={s * 0.06} />
        <line x1={cx} y1={cy + r} x2={cx} y2={s * 0.85} stroke="currentColor" strokeWidth={s * 0.06} strokeLinecap="round" />
        <line x1={cx} y1={cy - r} x2={cx - s * 0.2} y2={s * 0.15} stroke="currentColor" strokeWidth={s * 0.06} strokeLinecap="round" />
      </>
    );
  },

  dr: (s) => {
    const cx = s / 2, cy = s / 2, r = s * 0.16;
    return (
      <>
        <line x1={cx} y1={s * 0.1} x2={cx} y2={cy - r} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={s * 0.05} />
        <line x1={cx} y1={cy + r} x2={cx} y2={s * 0.9} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
        <line x1={cx - s * 0.22} y1={cy - s * 0.08} x2={cx + s * 0.22} y2={cy - s * 0.08} stroke="currentColor" strokeWidth={s * 0.04} strokeDasharray={`${s * 0.06} ${s * 0.04}`} />
        <path d={`M${cx - s * 0.15} ${cy + s * 0.06} Q${cx} ${cy + s * 0.18} ${cx + s * 0.15} ${cy + s * 0.06}`} fill="none" stroke="currentColor" strokeWidth={s * 0.04} />
      </>
    );
  },

  dps: (s) => {
    const cx = s / 2;
    return (
      <>
        <line x1={cx} y1={s * 0.1} x2={cx} y2={s * 0.3} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
        <polygon
          points={`${cx - s * 0.08},${s * 0.3} ${cx + s * 0.12},${s * 0.48} ${cx - s * 0.02},${s * 0.48} ${cx + s * 0.08},${s * 0.66} ${cx - s * 0.16},${s * 0.46} ${cx - s * 0.02},${s * 0.46} ${cx - s * 0.08},${s * 0.3}`}
          fill="currentColor"
        />
        <line x1={cx} y1={s * 0.7} x2={cx} y2={s * 0.9} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
        <line x1={cx - s * 0.15} y1={s * 0.9} x2={cx + s * 0.15} y2={s * 0.9} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
      </>
    );
  },

  contactor: (s) => {
    const cx = s / 2, cy = s / 2;
    return (
      <>
        <line x1={cx} y1={s * 0.1} x2={cx} y2={s * 0.32} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
        <rect x={cx - s * 0.18} y={cy - s * 0.15} width={s * 0.36} height={s * 0.3} rx={s * 0.03} fill="none" stroke="currentColor" strokeWidth={s * 0.05} />
        <path d={`M${cx - s * 0.1} ${cy - s * 0.04} Q${cx} ${cy + s * 0.08} ${cx + s * 0.1} ${cy - s * 0.04}`} fill="none" stroke="currentColor" strokeWidth={s * 0.04} />
        <path d={`M${cx - s * 0.1} ${cy + s * 0.04} Q${cx} ${cy + s * 0.16} ${cx + s * 0.1} ${cy + s * 0.04}`} fill="none" stroke="currentColor" strokeWidth={s * 0.04} />
        <line x1={cx} y1={cy + s * 0.15} x2={cx} y2={s * 0.9} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
      </>
    );
  },

  relay: (s) => {
    const cx = s / 2, cy = s / 2;
    return (
      <>
        <line x1={cx} y1={s * 0.1} x2={cx} y2={s * 0.3} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
        <rect x={cx - s * 0.2} y={s * 0.3} width={s * 0.4} height={s * 0.4} rx={s * 0.04} fill="none" stroke="currentColor" strokeWidth={s * 0.05} />
        <text x={cx} y={cy + s * 0.06} textAnchor="middle" dominantBaseline="middle" fontSize={s * 0.22} fill="currentColor" fontWeight={700}>K</text>
        <line x1={cx} y1={s * 0.7} x2={cx} y2={s * 0.9} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
      </>
    );
  },

  timer: (s) => {
    const cx = s / 2, cy = s / 2, r = s * 0.25;
    return (
      <>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={s * 0.05} />
        <line x1={cx} y1={cy} x2={cx} y2={cy - r * 0.65} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={cx + r * 0.5} y2={cy + r * 0.2} stroke="currentColor" strokeWidth={s * 0.04} strokeLinecap="round" />
        <line x1={cx} y1={s * 0.1} x2={cx} y2={cy - r} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
        <line x1={cx} y1={cy + r} x2={cx} y2={s * 0.9} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
      </>
    );
  },

  terminal: (s) => {
    const cx = s / 2, cy = s / 2, r = s * 0.12;
    return (
      <>
        <line x1={cx} y1={s * 0.15} x2={cx} y2={cy - r} stroke="currentColor" strokeWidth={s * 0.06} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={r} fill="currentColor" />
        <line x1={cx} y1={cy + r} x2={cx} y2={s * 0.85} stroke="currentColor" strokeWidth={s * 0.06} strokeLinecap="round" />
      </>
    );
  },

  ats: (s) => {
    const cx = s / 2;
    return (
      <>
        <line x1={cx - s * 0.2} y1={s * 0.1} x2={cx - s * 0.2} y2={s * 0.35} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
        <line x1={cx + s * 0.2} y1={s * 0.1} x2={cx + s * 0.2} y2={s * 0.35} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
        <line x1={cx - s * 0.2} y1={s * 0.35} x2={cx} y2={s * 0.55} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
        <circle cx={cx - s * 0.2} cy={s * 0.35} r={s * 0.04} fill="currentColor" />
        <circle cx={cx + s * 0.2} cy={s * 0.35} r={s * 0.04} fill="currentColor" />
        <line x1={cx} y1={s * 0.6} x2={cx} y2={s * 0.9} stroke="currentColor" strokeWidth={s * 0.05} strokeLinecap="round" />
        <circle cx={cx} cy={s * 0.6} r={s * 0.04} fill="currentColor" />
      </>
    );
  },
};

export const ModuleIcon: React.FC<ModuleIconProps> = ({
  icon,
  imageUrl,
  displayMode,
  size,
  color = '#fff',
  inline = false,
  x = 0,
  y = 0,
}) => {
  const wantImage = displayMode === 'image';
  const showImage = wantImage && imageUrl;
  const showIcon = !showImage && icon && ICON_PATHS[icon];
  const fallbackImage = !wantImage && imageUrl;

  if (inline) {
    if (showImage || (!showIcon && fallbackImage)) {
      const src = (showImage ? imageUrl : fallbackImage) as string;
      return (
        <image
          href={src}
          x={x}
          y={y}
          width={size}
          height={size}
          preserveAspectRatio="xMidYMid meet"
        />
      );
    }
    if (showIcon) {
      return (
        <g transform={`translate(${x}, ${y})`} style={{ color }}>
          {ICON_PATHS[icon!](size)}
        </g>
      );
    }
    return null;
  }

  if (showImage || (!showIcon && fallbackImage)) {
    const src = (showImage ? imageUrl : fallbackImage) as string;
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
      />
    );
  }

  if (showIcon) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ color, display: 'block' }}>
        {ICON_PATHS[icon!](size)}
      </svg>
    );
  }

  return null;
};
