/**
 * FloatingToolbar — BubbleMenu-based accessible floating toolbar.
 *
 * Renders 4 format buttons (Negrito/Itálico/Sublinhado/Riscado) inside a
 * Tiptap BubbleMenu.  The BubbleMenu handles show/hide based on text
 * selection; we layer ARIA semantics (role="toolbar", aria-pressed, PT-BR
 * labels) and WAI-ARIA APG keyboard navigation on top.
 *
 * Covers: AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-027, AC-030.
 *
 * AC-030: rich-text-line is the only abstraction over Tiptap — IconButton
 * (shared atom) does NOT import Tiptap; the glue lives here only.
 */

import type { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react';
import { useRef, useCallback } from 'react';

import { IconButton } from '@/shared/components/IconButton';

import styles from './FloatingToolbar.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FloatingToolbarProps {
  /** The Tiptap editor instance. Must be non-null when this component renders. */
  editor: Editor;
}

// ---------------------------------------------------------------------------
// Button configuration
// ---------------------------------------------------------------------------

type MarkName = 'bold' | 'italic' | 'underline' | 'strike';

interface ToolbarButton {
  mark: MarkName;
  label: string;
  icon: string;
  /** Local CSS Module class applied to the icon span for per-mark visual style. */
  iconClass?: string;
  toggle: (editor: Editor) => void;
}

const BUTTONS: ToolbarButton[] = [
  {
    mark: 'bold',
    label: 'Negrito',
    icon: 'B',
    toggle: (ed) => ed.chain().focus().toggleBold().run(),
  },
  {
    mark: 'italic',
    label: 'Itálico',
    icon: 'I',
    iconClass: 'iconItalic',
    toggle: (ed) => ed.chain().focus().toggleItalic().run(),
  },
  {
    mark: 'underline',
    label: 'Sublinhado',
    icon: 'U',
    iconClass: 'iconUnderline',
    toggle: (ed) => ed.chain().focus().toggleUnderline().run(),
  },
  {
    mark: 'strike',
    label: 'Riscado',
    icon: 'S',
    iconClass: 'iconStrike',
    toggle: (ed) => ed.chain().focus().toggleStrike().run(),
  },
];

// ---------------------------------------------------------------------------
// FloatingToolbar component
// ---------------------------------------------------------------------------

/**
 * Accessible floating toolbar that appears over selected text.
 *
 * BubbleMenu (from @tiptap/react) handles positioning and show/hide via
 * tippy.js — it mounts into the DOM only while there is a non-empty selection
 * inside the editor (AC-006, AC-007).
 *
 * The toolbar container implements the WAI-ARIA APG "Toolbar" widget pattern:
 * - role="toolbar" with aria-label (AC-008).
 * - Each button: aria-pressed reflecting active mark state (AC-009).
 * - onMouseDown with preventDefault keeps focus on the editor after click (AC-010).
 * - Arrow key navigation with wrap-around + Home/End (AC-011).
 * - Roving tabindex: first button tabIndex=0, rest tabIndex=-1 (AC-011).
 */
export function FloatingToolbar({ editor }: FloatingToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // WAI-ARIA APG: Arrow key navigation among toolbar buttons (AC-011).
  // ArrowRight → next; ArrowLeft → previous; both wrap around.
  // Home → first; End → last.
  // ---------------------------------------------------------------------------
  const handleArrowNav = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const buttons = Array.from(container.querySelectorAll('button'));
    const currentIdx = buttons.findIndex((b) => b === document.activeElement);

    let nextIdx: number | null = null;

    if (e.key === 'ArrowRight') {
      nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % buttons.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = currentIdx <= 0 ? buttons.length - 1 : currentIdx - 1;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = buttons.length - 1;
    }

    if (nextIdx !== null) {
      e.preventDefault();
      buttons[nextIdx]?.focus();
    }
  }, []);

  return (
    <BubbleMenu editor={editor} tippyOptions={{ duration: 150 }}>
      {/* role="toolbar" container — AC-008 */}
      <div
        ref={containerRef}
        role="toolbar"
        aria-label="Formatação de texto"
        className={styles.toolbar}
        onKeyDown={handleArrowNav}
      >
        {BUTTONS.map((btn, index) => (
          <IconButton
            key={btn.mark}
            aria-label={btn.label}
            aria-pressed={editor.isActive(btn.mark)}
            variant="ghost"
            size="sm"
            className={styles.button}
            // Roving tabindex: first button focusable via Tab; rest via arrow keys.
            tabIndex={index === 0 ? 0 : -1}
            // AC-010: onMouseDown with preventDefault keeps focus on the editor.
            // Without this, clicking the button would steal focus from the editor.
            onMouseDown={(e) => {
              e.preventDefault(); // Prevents focus from moving to button.
              btn.toggle(editor);
            }}
            onClick={(e) => {
              // Prevent the click event that follows mousedown from re-firing the
              // toggle command (mousedown already ran it).
              e.preventDefault();
            }}
          >
            <span
              className={[
                styles.icon,
                btn.iconClass ? styles[btn.iconClass as keyof typeof styles] : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden="true"
            >
              {btn.icon}
            </span>
          </IconButton>
        ))}
      </div>
    </BubbleMenu>
  );
}
