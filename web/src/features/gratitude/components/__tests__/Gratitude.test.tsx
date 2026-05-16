import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

import { Gratitude } from '../Gratitude.js';

// ─── Framer Motion mock ───────────────────────────────────────────────────────
let reducedMotion = false;
let autoComplete = true;
const pendingCallbacks: Array<() => void> = [];

jest.mock('framer-motion', () => {
  const ReactMod = jest.requireActual<typeof import('react')>('react');

  function MotionDiv({
    children,
    onAnimationComplete,
    style,
    className,
    initial: _initial,
    animate: _animate,
    exit: _exit,
    transition: _transition,
    variants: _variants,
    ...rest
  }: React.HTMLAttributes<HTMLDivElement> & {
    onAnimationComplete?: () => void;
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    transition?: unknown;
    variants?: unknown;
  }) {
    ReactMod.useEffect(() => {
      if (!onAnimationComplete) return;
      if (autoComplete) {
        onAnimationComplete();
      } else {
        pendingCallbacks.push(onAnimationComplete);
      }
    });
    return ReactMod.createElement(
      'div',
      { style, className, 'data-testid': 'motion-div', ...rest },
      children,
    );
  }

  function AnimatePresence({ children }: { children: ReactNode }) {
    return ReactMod.createElement(ReactMod.Fragment, null, children);
  }

  function MotionConfig({ children }: { children: ReactNode }) {
    return ReactMod.createElement(ReactMod.Fragment, null, children);
  }

  return {
    motion: { div: MotionDiv },
    AnimatePresence,
    MotionConfig,
    useReducedMotion: () => reducedMotion,
  };
});

// Capture the first editor's focus spy so we can assert on it.
let firstEditorFocusSpy: jest.Mock | null = null;

// RichTextBlock is heavy (Tiptap) — mock to test container contract.
jest.mock('@/features/rich-text-line', () => ({
  RichTextBlock: ({
    value,
    onChange,
    placeholder,
    ariaLabel,
    editorRef,
  }: {
    value: string;
    onChange: (_html: string) => void;
    placeholder?: string;
    ariaLabel?: string;
    editorRef?: { current: { commands: { focus: () => void } } | null };
  }) => {
    // Expose a Tiptap-shaped ref if provided.
    if (editorRef && !editorRef.current) {
      const focusSpy = jest.fn();
      editorRef.current = { commands: { focus: focusSpy } };
      // Capture the first editor's spy for focus-on-open assertions.
      if (firstEditorFocusSpy === null) {
        firstEditorFocusSpy = focusSpy;
      }
    }
    return (
      <div
        data-testid="rtb"
        data-value={value}
        data-placeholder={placeholder}
        aria-label={ariaLabel}
      >
        <button onClick={() => onChange('<p>nova</p>')}>edit</button>
      </div>
    );
  },
}));

beforeEach(() => {
  firstEditorFocusSpy = null;
  reducedMotion = false;
  autoComplete = true;
  pendingCallbacks.length = 0;
});

describe('Gratitude — folded/unfolded state machine', () => {
  it('mounts in folded state with aria-expanded=false', () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    const btn = screen.getByRole('button', { name: /abrir cartão de gratidão/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('folded card does NOT render editor content in DOM (NFR-003 zero-leak)', () => {
    render(
      <Gratitude
        value={[
          { id: 'a', text: '<p>segredo</p>' },
          { id: 'b', text: '' },
        ]}
        onChange={jest.fn()}
      />,
    );
    const container = document.body;
    expect(container.innerHTML).not.toContain('segredo');
    expect(container.innerHTML).not.toContain('rtb');
  });

  it('click on folded card opens the card (shows editors)', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    const btn = screen.getByRole('button', { name: /abrir cartão de gratidão/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(screen.getAllByTestId('rtb')).toHaveLength(3);
  });

  it('Enter on folded card opens the card', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    const btn = screen.getByRole('button', { name: /abrir cartão de gratidão/i });
    await act(async () => {
      fireEvent.keyDown(btn, { key: 'Enter' });
    });
    expect(screen.getAllByTestId('rtb')).toHaveLength(3);
  });

  it('Space on folded card opens the card', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    const btn = screen.getByRole('button', { name: /abrir cartão de gratidão/i });
    await act(async () => {
      fireEvent.keyDown(btn, { key: ' ' });
    });
    expect(screen.getAllByTestId('rtb')).toHaveLength(3);
  });

  it('close button folds the card back', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    const openBtn = screen.getByRole('button', { name: /abrir cartão de gratidão/i });
    await act(async () => {
      fireEvent.click(openBtn);
    });
    const closeBtn = screen.getByRole('button', { name: /dobrar cartão de gratidão/i });
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    expect(screen.getByRole('button', { name: /abrir cartão de gratidão/i })).toBeInTheDocument();
    expect(screen.queryAllByTestId('rtb')).toHaveLength(0);
  });

  it('Escape closes the card', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    const openBtn = screen.getByRole('button', { name: /abrir cartão de gratidão/i });
    await act(async () => {
      fireEvent.click(openBtn);
    });
    const unfolded = screen.getByLabelText(/gratidão do dia/i);
    await act(async () => {
      fireEvent.keyDown(unfolded, { key: 'Escape' });
    });
    expect(screen.getByRole('button', { name: /abrir cartão de gratidão/i })).toBeInTheDocument();
    expect(screen.queryAllByTestId('rtb')).toHaveLength(0);
  });

  it('unfolded close button has aria-expanded=true and shows close affordance', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir/i }));
    });
    const closeBtn = screen.getByRole('button', { name: /dobrar cartão de gratidão/i });
    expect(closeBtn).toHaveAttribute('aria-expanded', 'true');
    expect(closeBtn).toBeInTheDocument();
  });

  it('external value update while unfolded does NOT close the card', async () => {
    const { rerender } = render(
      <Gratitude value={[{ id: 'a', text: '<p>texto</p>' }]} onChange={jest.fn()} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir/i }));
    });
    expect(screen.getAllByTestId('rtb')).toHaveLength(3);

    rerender(<Gratitude value={[{ id: 'a', text: '<p>atualizado</p>' }]} onChange={jest.fn()} />);
    expect(screen.getAllByTestId('rtb')).toHaveLength(3);
  });

  it('onChange propagates edits through the pipeline', async () => {
    const onChange = jest.fn();
    render(<Gratitude value={[]} onChange={onChange} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir/i }));
    });
    const rtbs = screen.getAllByTestId('rtb');
    rtbs[0]!.querySelector('button')?.click();
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as Array<{ text: string }>;
    expect(emitted[0]!.text).toBe('<p>nova</p>');
  });

  it('always renders 3 editor slots when unfolded', async () => {
    render(<Gratitude value={[{ id: 'a', text: '<p>um</p>' }]} onChange={jest.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir/i }));
    });
    expect(screen.getAllByTestId('rtb')).toHaveLength(3);
  });

  it('each editor slot has distinct aria-label when unfolded', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir/i }));
    });
    expect(screen.getByLabelText('Gratidão 1 de 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Gratidão 2 de 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Gratidão 3 de 3')).toBeInTheDocument();
  });

  it('folded aria-label includes filled count indicator', () => {
    render(
      <Gratitude
        value={[
          { id: 'a', text: '<p>café</p>' },
          { id: 'b', text: '<p>sol</p>' },
        ]}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /2 escritas/i })).toBeInTheDocument();
  });

  it('folded aria-label shows "vazio" when no items filled', () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: /vazio/i })).toBeInTheDocument();
  });

  it('new mount is always folded regardless of previous interaction', async () => {
    const { unmount } = render(<Gratitude value={[]} onChange={jest.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir/i }));
    });
    unmount();
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: /abrir cartão de gratidão/i })).toBeInTheDocument();
    expect(screen.queryAllByTestId('rtb')).toHaveLength(0);
  });

  it('folded card root receives focus after close flow completes (AC-005)', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    const openBtn = screen.getByRole('button', { name: /abrir cartão de gratidão/i });
    await act(async () => {
      fireEvent.click(openBtn);
    });
    const closeBtn = screen.getByRole('button', { name: /dobrar cartão de gratidão/i });
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    const foldedRoot = screen.getByRole('button', { name: /abrir cartão de gratidão/i });
    expect(foldedRoot).toHaveFocus();
  });

  it('first editor commands.focus() is called after open (AC-003)', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    const openBtn = screen.getByRole('button', { name: /abrir cartão de gratidão/i });
    await act(async () => {
      fireEvent.click(openBtn);
    });
    expect(firstEditorFocusSpy).not.toBeNull();
    expect(firstEditorFocusSpy).toHaveBeenCalled();
  });

  it('does not steal focus on mount', () => {
    const sentinel = document.createElement('button');
    document.body.appendChild(sentinel);
    sentinel.focus();
    expect(sentinel).toHaveFocus();

    render(<Gratitude value={[]} onChange={jest.fn()} />);

    expect(sentinel).toHaveFocus();
    document.body.removeChild(sentinel);
  });

  it('no-op re-render does not call focus again', async () => {
    const value: never[] = [];
    const onChange = jest.fn();
    const { rerender } = render(<Gratitude value={value} onChange={onChange} />);
    const openBtn = screen.getByRole('button', { name: /abrir cartão de gratidão/i });
    await act(async () => {
      fireEvent.click(openBtn);
    });
    expect(firstEditorFocusSpy).toHaveBeenCalledTimes(1);

    rerender(<Gratitude value={value} onChange={onChange} />);

    expect(firstEditorFocusSpy).toHaveBeenCalledTimes(1);
  });
});
