import React, { useCallback, useRef, useState } from 'react';
import type { TextAnnotation } from '../types';
import { usePanelStore } from '../store/panelStore';

interface TextAnnotationLayerProps {
  annotations: TextAnnotation[];
  selectedAnnotationId: string | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onSelect: (id: string) => void;
}

const FONT_OPTIONS = [
  { value: 'sans-serif', label: 'Sans-serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monospace' },
  { value: "'Courier New', monospace", label: 'Courier New' },
  { value: "'Georgia', serif", label: 'Georgia' },
  { value: "'Arial', sans-serif", label: 'Arial' },
];

export { FONT_OPTIONS };

function AnnotationItem({
  ann,
  selected,
  svgRef,
  onSelect,
}: {
  ann: TextAnnotation;
  selected: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onSelect: (id: string) => void;
}) {
  const moveAnnotation = usePanelStore((s) => s.moveTextAnnotation);
  const dragRef = useRef<{ startX: number; startY: number; annX: number; annY: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  const getSvgPoint = useCallback((ev: React.PointerEvent | PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const ctm = svg.getScreenCTM()?.inverse();
    if (!ctm) return { x: pt.x, y: pt.y };
    const svgPt = pt.matrixTransform(ctm);
    return { x: svgPt.x, y: svgPt.y };
  }, [svgRef]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(ann.id);
    const pt = getSvgPoint(e);
    dragRef.current = { startX: pt.x, startY: pt.y, annX: ann.x, annY: ann.y };
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  }, [ann.id, ann.x, ann.y, getSvgPoint, onSelect]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const pt = getSvgPoint(e);
    const dx = pt.x - dragRef.current.startX;
    const dy = pt.y - dragRef.current.startY;
    moveAnnotation(ann.id, dragRef.current.annX + dx, dragRef.current.annY + dy);
  }, [ann.id, getSvgPoint, moveAnnotation]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const svgFontSize = ann.fontSize * 0.28;
  const fontWeight = ann.bold ? 700 : 400;
  const fontStyle = ann.italic ? 'italic' : 'normal';

  const lines = ann.text.split('\n');
  const lineHeight = svgFontSize * 1.3;

  return (
    <g
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={(e) => e.stopPropagation()}
      style={{ cursor: 'grab' }}
    >
      {selected && (
        <rect
          x={ann.x - 2}
          y={ann.y - svgFontSize - 1}
          width={Math.max(20, ann.text.length * svgFontSize * 0.6)}
          height={lines.length * lineHeight + 4}
          fill="none"
          stroke="#ffd600"
          strokeWidth={0.5}
          strokeDasharray="2 1"
          rx={1}
        />
      )}
      {lines.map((line, i) => (
        <text
          key={i}
          x={ann.x}
          y={ann.y + i * lineHeight}
          fontSize={svgFontSize}
          fontWeight={fontWeight}
          fontStyle={fontStyle}
          fontFamily={ann.fontFamily}
          fill={ann.color}
          stroke="#fff"
          strokeWidth={svgFontSize * 0.35}
          paintOrder="stroke"
          dominantBaseline="hanging"
          style={{
            pointerEvents: 'all',
            userSelect: 'none',
            opacity: hovered && !selected ? 0.8 : 1,
          }}
        >
          {line || '\u00A0'}
        </text>
      ))}
    </g>
  );
}

export const TextAnnotationLayer: React.FC<TextAnnotationLayerProps> = ({
  annotations,
  selectedAnnotationId,
  svgRef,
  onSelect,
}) => {
  if (annotations.length === 0) return null;
  return (
    <g className="text-annotation-layer">
      {annotations.map((ann) => (
        <AnnotationItem
          key={ann.id}
          ann={ann}
          selected={ann.id === selectedAnnotationId}
          svgRef={svgRef}
          onSelect={onSelect}
        />
      ))}
    </g>
  );
};
