import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

export const FitToWidthIcon: React.FC<IconProps> = ({ className, size = '1em' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" />
    <line x1="6" y1="12" x2="18" y2="12" />
    <polyline points="9,9 6,12 9,15" />
    <polyline points="15,9 18,12 15,15" />
  </svg>
);

export const FitToContainerIcon: React.FC<IconProps> = ({ className, size = '1em' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" />
    <rect x="6" y="6" width="12" height="12" />
  </svg>
);
