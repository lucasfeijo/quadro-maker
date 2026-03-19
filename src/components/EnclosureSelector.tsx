import React, { useState } from 'react';
import { ENCLOSURE_LIBRARY } from '../data/enclosures';

interface Props {
  onSelect: (enclosureId: string) => void;
}

export const EnclosureSelector: React.FC<Props> = ({ onSelect }) => {
  const brands = [...new Set(ENCLOSURE_LIBRARY.map((e) => e.brand))];
  const [filterBrand, setFilterBrand] = useState<string>('');

  const filtered = filterBrand
    ? ENCLOSURE_LIBRARY.filter((e) => e.brand === filterBrand)
    : ENCLOSURE_LIBRARY;

  return (
    <div className="enclosure-selector">
      <div className="enclosure-filter">
        <label>Marca:</label>
        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
        >
          <option value="">Todas</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="enclosure-grid">
        {filtered.map((enc) => (
          <div
            key={enc.id}
            className="enclosure-card"
            onClick={() => onSelect(enc.id)}
          >
            <div className="enclosure-card-preview">
              <svg
                viewBox={`0 0 ${enc.exteriorWidthMm} ${enc.exteriorHeightMm}`}
                width="100%"
                height="100%"
              >
                <rect
                  x={0}
                  y={0}
                  width={enc.exteriorWidthMm}
                  height={enc.exteriorHeightMm}
                  rx={2}
                  fill="#fafafa"
                  stroke="#999"
                  strokeWidth={2}
                />
                {(() => {
                  const wallX =
                    (enc.exteriorWidthMm - enc.interiorWidthMm) / 2;
                  const wallY =
                    (enc.exteriorHeightMm - enc.interiorHeightMm) / 2;
                  return (
                    <>
                      {enc.rails.map((r) => {
                        const railH = 35;
                        const fixingMm =
                          (enc.interiorWidthMm - r.usableWidthMm) / 2;
                        const usableX = wallX + r.xMm + fixingMm;
                        const barX = usableX - r.barOverhangLeftMm;
                        const barW = r.barOverhangLeftMm + r.usableWidthMm + r.barOverhangRightMm;
                        const barY = wallY + r.yMm;
                        const slotW = 18;
                        const slotH = 6;
                        const slotSpacing = 25;
                        const slotStartX = barX - 9;
                        const slotY = barY + (railH - slotH) / 2;
                        const slotRx = slotH / 2;
                        const slotCount = Math.ceil((barW + 9) / slotSpacing) + 1;
                        const clipId = `enc-rail-clip-${enc.id}-${r.id}`;
                        return (
                          <g key={r.id}>
                            {/* Rail bar */}
                            <rect
                              x={barX}
                              y={barY}
                              width={barW}
                              height={railH}
                              rx={1}
                              fill="#b0bec5"
                              stroke="#78909c"
                              strokeWidth={1}
                            />
                            {/* Rail slots */}
                            <defs>
                              <clipPath id={clipId}>
                                <rect x={barX + 1} y={barY + 1} width={barW - 2} height={railH - 2} rx={1} />
                              </clipPath>
                            </defs>
                            <g clipPath={`url(#${clipId})`}>
                              {Array.from({ length: slotCount }, (_, i) => (
                                <rect
                                  key={i}
                                  x={slotStartX + i * slotSpacing}
                                  y={slotY}
                                  width={slotW}
                                  height={slotH}
                                  rx={slotRx}
                                  fill="#90a4ae"
                                  stroke="#7d949e"
                                  strokeWidth={0.8}
                                />
                              ))}
                            </g>
                          </g>
                        );
                      })}
                      {enc.mountingHoles.map((h, i) => (
                        <circle
                          key={i}
                          cx={wallX + h.xMm}
                          cy={wallY + h.yMm}
                          r={h.diameterMm / 2}
                          fill="none"
                          stroke="#999"
                          strokeWidth={1.5}
                        />
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="enclosure-card-info">
              <div className="enclosure-brand">{enc.brand}</div>
              <div className="enclosure-model">{enc.model}</div>
              <div className="enclosure-desc">{enc.description}</div>
              <div className="enclosure-dims">
                {enc.exteriorWidthMm}×{enc.exteriorHeightMm}mm
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
