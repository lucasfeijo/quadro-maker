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
                viewBox={`0 0 ${enc.exteriorWidthCm} ${enc.exteriorHeightCm}`}
                width="100%"
                height="100%"
              >
                <rect
                  x={0}
                  y={0}
                  width={enc.exteriorWidthCm}
                  height={enc.exteriorHeightCm}
                  rx={0.5}
                  fill="#e0e0e0"
                  stroke="#999"
                  strokeWidth={0.3}
                />
                {(() => {
                  const wallX =
                    (enc.exteriorWidthCm - enc.interiorWidthCm) / 2;
                  const wallY =
                    (enc.exteriorHeightCm - enc.interiorHeightCm) / 2;
                  return (
                    <>
                      <rect
                        x={wallX}
                        y={wallY}
                        width={enc.interiorWidthCm}
                        height={enc.interiorHeightCm}
                        fill="#fafafa"
                        stroke="#bbb"
                        strokeWidth={0.2}
                      />
                      {enc.rails.map((r) => {
                        const fixingCm =
                          (enc.interiorWidthCm - r.usableWidthCm) / 2;
                        return (
                          <rect
                            key={r.id}
                            x={wallX + r.xCm + fixingCm}
                            y={wallY + r.yCm - 0.3}
                            width={r.usableWidthCm}
                            height={0.6}
                            fill="#90a4ae"
                            rx={0.1}
                          />
                        );
                      })}
                      {enc.mountingHoles.map((h, i) => (
                        <circle
                          key={i}
                          cx={wallX + h.xCm}
                          cy={wallY + h.yCm}
                          r={h.diameterMm / 20}
                          fill="none"
                          stroke="#999"
                          strokeWidth={0.15}
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
                {enc.exteriorWidthCm}×{enc.exteriorHeightCm}cm
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
