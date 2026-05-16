import { useEffect, useRef } from 'react';

import { STICKY_COLOR_HEX } from '../types.js';
import type { StickyColor } from '../types.js';

import styles from './StickyColorPicker.module.css';

interface StickyColorPickerProps {
  availableColors: StickyColor[];
  onSelect: (color: StickyColor) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function StickyColorPicker({
  availableColors,
  onSelect,
  onClose,
  anchorRef,
}: StickyColorPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (availableColors.length === 0) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      const insidePicker = containerRef.current?.contains(target);
      const insideAnchor = anchorRef.current?.contains(target);
      if (!insidePicker && !insideAnchor) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose, anchorRef, availableColors.length]);

  if (availableColors.length === 0) return null;

  const rect = anchorRef.current?.getBoundingClientRect();
  // Add button vive na borda DIREITA da página. Abrir o picker pra direita
  // jogava ele fora do viewport. Posiciona à esquerda do botão.
  // Largura aproximada do picker: 4 círculos × 20px + 3 gaps × 8 + padding 16 = 116px.
  const PICKER_WIDTH = 120;
  const style = rect
    ? { left: Math.max(8, rect.left - PICKER_WIDTH - 8), top: rect.top }
    : { left: 24, top: 16 };

  return (
    <div ref={containerRef} className={styles.picker} style={style}>
      {availableColors.map((color, index) => (
        <button
          key={color}
          type="button"
          className={styles.circle}
          style={{ background: STICKY_COLOR_HEX[color] }}
          aria-label={`Adicionar post-it ${color.toUpperCase()}`}
          autoFocus={index === 0}
          onClick={() => {
            onSelect(color);
            onClose();
          }}
        />
      ))}
    </div>
  );
}
