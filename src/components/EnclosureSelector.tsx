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
                  rx={5}
                  fill="#e0e0e0"
                  stroke="#999"
                  strokeWidth={3}
                />
                {(() => {
                  const wallX =
                    (enc.exteriorWidthMm - enc.interiorWidthMm) / 2;
                  const wallY =
                    (enc.exteriorHeightMm - enc.interiorHeightMm) / 2;
                  return (
                    <>
                      <rect
                        x={wallX}
                        y={wallY}
                        width={enc.interiorWidthMm}
                        height={enc.interiorHeightMm}
                        fill="#fafafa"
                        stroke="#bbb"
                        strokeWidth={2}
                      />
                      {enc.rails.map((r) => {
                        const fixingMm =
                          (enc.interiorWidthMm - r.usableWidthMm) / 2;
                        return (
                          <rect
                            key={r.id}
                            x={wallX + r.xMm + fixingMm}
                            y={wallY + r.yMm - 3}
                            width={r.usableWidthMm}
                            height={6}
                            fill="#90a4ae"
                            rx={1}
                          />
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
