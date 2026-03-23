import React, { useCallback, useMemo, useState } from 'react';
import { CustomPanelPreview } from './CustomPanelPreview';
import { DIN_MODULE_1P_MM } from '../data/enclosures';
import { resolveCustomLayout, DEFAULT_BAR_OVERHANG_MM, getMinExteriorDimensions } from '../utils/panelLayout';

interface PanelConfiguratorProps {
  initialWidthUnits: number;
  initialRowCount: number;
  initialExteriorWidthMm?: number;
  initialExteriorHeightMm?: number;
  initialRailYOverrides?: Record<string, number>;
  initialBarOverhangMm?: number;
  onApply: (config: {
    widthUnits: number;
    rowCount: number;
    exteriorWidthMm?: number;
    exteriorHeightMm?: number;
    railYOverrides: Record<string, number>;
    barOverhangMm?: number;
  }) => void;
  applyLabel?: string;
}

export const PanelConfigurator: React.FC<PanelConfiguratorProps> = ({
  initialWidthUnits,
  initialRowCount,
  initialExteriorWidthMm,
  initialExteriorHeightMm,
  initialRailYOverrides,
  initialBarOverhangMm,
  onApply,
  applyLabel = 'Aplicar',
}) => {
  const [widthUnits, setWidthUnits] = useState(initialWidthUnits);
  const [rowCount, setRowCount] = useState(initialRowCount);
  const [exteriorWidthMm, setExteriorWidthMm] = useState<number | undefined>(initialExteriorWidthMm);
  const [exteriorHeightMm, setExteriorHeightMm] = useState<number | undefined>(initialExteriorHeightMm);
  const [railYOverrides, setRailYOverrides] = useState<Record<string, number>>(initialRailYOverrides ?? {});
  const [barOverhangMm, setBarOverhangMm] = useState<number | undefined>(initialBarOverhangMm);

  const defaultLayout = useMemo(
    () => resolveCustomLayout(widthUnits, rowCount, undefined, undefined, undefined, barOverhangMm),
    [widthUnits, rowCount, barOverhangMm],
  );

  const minDimensions = useMemo(
    () => getMinExteriorDimensions(widthUnits, rowCount),
    [widthUnits, rowCount],
  );

  const previewLayout = useMemo(
    () => resolveCustomLayout(widthUnits, rowCount, exteriorWidthMm, exteriorHeightMm, railYOverrides, barOverhangMm),
    [widthUnits, rowCount, exteriorWidthMm, exteriorHeightMm, railYOverrides, barOverhangMm],
  );

  const handleWidthChange = useCallback((v: number) => {
    setWidthUnits(v);
  }, []);

  const handleRowCountChange = useCallback((v: number) => {
    setRowCount(v);
    setRailYOverrides({});
  }, []);

  const handleResizeExterior = useCallback((w: number, h: number) => {
    setExteriorWidthMm(w);
    setExteriorHeightMm(h);
  }, []);

  const handleRailYChange = useCallback((railId: string, yMm: number) => {
    setRailYOverrides(prev => ({ ...prev, [railId]: yMm }));
  }, []);

  const handleRailYReset = useCallback((railId: string) => {
    setRailYOverrides(prev => {
      const next = { ...prev };
      delete next[railId];
      return next;
    });
  }, []);

  const handleApply = () => {
    onApply({
      widthUnits,
      rowCount,
      exteriorWidthMm,
      exteriorHeightMm,
      railYOverrides,
      barOverhangMm,
    });
  };

  return (
    <div className="custom-config">
      <div className="custom-config-controls">
        <div className="config-field">
          <label>Largura: {widthUnits}P</label>
          <input
            type="range"
            min={2}
            max={36}
            step={1}
            value={widthUnits}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            className="row-slider"
          />
          <div className="slider-ticks width-ticks">
            {[4, 8, 10, 12, 14, 16, 18, 20, 24, 30, 36].map(n => (
              <span
                key={n}
                className={n === widthUnits ? 'active' : ''}
                style={{ left: `${((n - 2) / 34) * 100}%` }}
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        <div className="config-field">
          <label>Quantidade de Trilhos: {rowCount}</label>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={rowCount}
            onChange={(e) => handleRowCountChange(Number(e.target.value))}
            className="row-slider"
          />
          <div className="slider-ticks">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <span key={n} className={n === rowCount ? 'active' : ''}>{n}</span>
            ))}
          </div>
        </div>

        <div className="config-field config-dimensions">
          <label>Dimensões exteriores (mm):</label>
          <div className="dimension-inputs">
            <div className="dim-input-group">
              <input
                type="number"
                min={minDimensions.width}
                max={1000}
                step={10}
                value={exteriorWidthMm ?? ''}
                placeholder={String(defaultLayout.widthMm)}
                onChange={(e) => {
                  const v = e.target.value;
                  setExteriorWidthMm(v === '' ? undefined : Math.max(minDimensions.width, Number(v)));
                }}
              />
              <span className="dim-label">largura</span>
            </div>
            <span className="dim-separator">×</span>
            <div className="dim-input-group">
              <input
                type="number"
                min={minDimensions.height}
                max={1000}
                step={10}
                value={exteriorHeightMm ?? ''}
                placeholder={String(defaultLayout.heightMm)}
                onChange={(e) => {
                  const v = e.target.value;
                  setExteriorHeightMm(v === '' ? undefined : Math.max(minDimensions.height, Number(v)));
                }}
              />
              <span className="dim-label">altura</span>
            </div>
          </div>
        </div>

        <div className="config-field config-dimensions">
          <label>Sobra do trilho (mm):</label>
          <div className="dimension-inputs">
            <div className="dim-input-group">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={barOverhangMm ?? ''}
                placeholder={String(DEFAULT_BAR_OVERHANG_MM)}
                onChange={(e) => {
                  const v = e.target.value;
                  setBarOverhangMm(v === '' ? undefined : Math.max(0, Number(v)));
                }}
              />
              <span className="dim-label">cada lado</span>
            </div>
          </div>
        </div>

        <div className="config-summary">
          <p>
            Trilho DIN: {widthUnits * DIN_MODULE_1P_MM}mm utilizável + {barOverhangMm ?? DEFAULT_BAR_OVERHANG_MM}mm
            sobra cada lado
          </p>
        </div>
        <button className="start-btn" onClick={handleApply}>
          {applyLabel}
        </button>
      </div>

      <div className="custom-config-preview">
        <CustomPanelPreview
          layout={previewLayout}
          defaultLayout={defaultLayout}
          railYOverrides={railYOverrides}
          widthUnits={widthUnits}
          minExteriorWidth={minDimensions.width}
          minExteriorHeight={minDimensions.height}
          onWidthUnitsChange={handleWidthChange}
          onResizeExterior={handleResizeExterior}
          onRailYChange={handleRailYChange}
          onRailYReset={handleRailYReset}
        />
      </div>
    </div>
  );
};
