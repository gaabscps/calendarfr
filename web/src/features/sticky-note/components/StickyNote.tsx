import { useEffect, useRef, useState } from 'react';

import { useDrag } from '../hooks/useDrag.js';
import { useMultiStickyNote } from '../hooks/useMultiStickyNote.js';
import { useStickyNote } from '../hooks/useStickyNote.js';
import type { StickyColor } from '../types.js';

import { StickyColorPicker } from './StickyColorPicker.js';
import styles from './StickyNote.module.css';
import { StickyPanel } from './StickyPanel.js';
import { StickyTab } from './StickyTab.js';

// Default positions staggered so multiple panels don't overlap initially
const DEFAULT_POSITIONS: Record<StickyColor, { x: number; y: number }> = {
  y: { x: 32, y: 80 },
  r: { x: 64, y: 100 },
  g: { x: 96, y: 120 },
  b: { x: 128, y: 140 },
};

// Internal component — must be a separate component (not inline) because
// hooks (useStickyNote, useDrag) cannot be called inside a .map() callback.
interface StickyNoteInstanceProps {
  color: StickyColor;
  isOpen: boolean;
  zIndex: number;
  onBringToFront: () => void;
  onClose?: () => void;
  onLoadingChange?: (color: StickyColor, isLoading: boolean) => void;
}

function StickyNoteInstance({
  color,
  isOpen,
  zIndex,
  onBringToFront,
  onClose,
  onLoadingChange,
}: StickyNoteInstanceProps) {
  const { items, notesApi, panelRef, isLoading } = useStickyNote(color);
  const { position, isDragging, dragHandleProps } = useDrag(color, DEFAULT_POSITIONS[color]);

  // Use a ref to hold onLoadingChange so the useEffect does not need it as a dep,
  // preventing infinite update loops when the parent passes an inline arrow function.
  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;

  useEffect(() => {
    onLoadingChangeRef.current?.(color, isLoading);
  }, [color, isLoading]);

  // exactOptionalPropertyTypes: only spread onClose when defined (AC-036)
  const closeProps = onClose !== undefined ? { onClose } : {};

  return (
    <StickyPanel
      isOpen={isOpen}
      color={color}
      items={items}
      notesApi={notesApi}
      panelRef={panelRef}
      position={position}
      zIndex={zIndex}
      isDragging={isDragging}
      dragHandleProps={dragHandleProps}
      onBringToFront={onBringToFront}
      {...closeProps}
    />
  );
}

export function StickyNote() {
  const {
    activeColors,
    openStates,
    zIndices,
    availableColors,
    addColor,
    removeColor,
    toggleOpen,
    bringToFront,
    closeAll,
  } = useMultiStickyNote();

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Partial<Record<StickyColor, boolean>>>({});
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const tabContainerRef = useRef<HTMLDivElement | null>(null);

  // AC-012: global click-away — close all panels when clicking outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (tabContainerRef.current?.contains(target)) return;
      const panels = document.querySelectorAll('[aria-label="Painel de anotações globais"]');
      for (const panel of panels) {
        if (panel.contains(target)) return;
      }
      closeAll();
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [closeAll]);

  return (
    <>
      {/* Tab container — fixed left edge */}
      <div ref={tabContainerRef} className={styles.tabContainer}>
        {/* AC-006: one tab per active color */}
        {activeColors.map((color) => (
          <StickyTab
            key={color}
            color={color}
            isOpen={openStates[color] ?? false}
            isLoading={loadingStates[color] ?? false}
            tabRef={{ current: null }}
            onToggle={() => toggleOpen(color)}
          />
        ))}

        {/* AC-016: add button hidden when all 4 colors active */}
        {activeColors.length < 4 && (
          <button
            ref={addButtonRef}
            type="button"
            className={styles.addButton}
            onClick={() => setColorPickerOpen(true)}
            aria-label="Adicionar cor de post-it"
          >
            +
          </button>
        )}

        {/* AC-013/014/015: color picker anchored to add button */}
        {colorPickerOpen && (
          <StickyColorPicker
            availableColors={availableColors}
            onSelect={(color) => {
              addColor(color);
              setColorPickerOpen(false);
            }}
            onClose={() => setColorPickerOpen(false)}
            anchorRef={addButtonRef}
          />
        )}
      </div>

      {/* AC-006/007/011: one panel instance per active color */}
      {activeColors.map((color) => {
        // AC-011/AC-036: yellow is permanent — no close; others get removeColor
        const instanceCloseProps = color !== 'y' ? { onClose: () => removeColor(color) } : {};
        return (
          <StickyNoteInstance
            key={color}
            color={color}
            isOpen={openStates[color] ?? false}
            zIndex={zIndices[color] ?? 1}
            onBringToFront={() => bringToFront(color)}
            onLoadingChange={(c, loading) =>
              setLoadingStates((prev) => ({ ...prev, [c]: loading }))
            }
            {...instanceCloseProps}
          />
        );
      })}
    </>
  );
}
