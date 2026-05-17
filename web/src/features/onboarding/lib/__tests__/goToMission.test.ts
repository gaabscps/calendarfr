import type { MissionId } from '../../types.js';
import { goToMission } from '../goToMission.js';

function makeClassList() {
  const classes = new Set<string>();
  return {
    add(cls: string) {
      classes.add(cls);
    },
    remove(cls: string) {
      classes.delete(cls);
    },
    contains(cls: string) {
      return classes.has(cls);
    },
  };
}

function makeElement(overrides?: Partial<HTMLElement>): HTMLElement {
  const el = {
    scrollIntoView: jest.fn(),
    focus: jest.fn(),
    classList: makeClassList(),
    querySelector: jest.fn().mockReturnValue(null),
    ...overrides,
  } as unknown as HTMLElement;
  return el;
}

function makeFocusable(overrides?: Partial<HTMLElement>): HTMLElement {
  return {
    focus: jest.fn(),
    classList: makeClassList(),
    ...overrides,
  } as unknown as HTMLElement;
}

describe('goToMission', () => {
  let querySelectorSpy: jest.SpyInstance;
  let element: HTMLElement;

  beforeEach(() => {
    element = makeElement();
    querySelectorSpy = jest.spyOn(document, 'querySelector').mockReturnValue(element);
  });

  afterEach(() => {
    querySelectorSpy.mockRestore();
    jest.useRealTimers();
  });

  it('calls scrollIntoView with smooth behavior when reduced motion is false', () => {
    goToMission('M-INTENTION', false);
    expect(element.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('AC-025: calls scrollIntoView with auto behavior when reduced motion is true', () => {
    goToMission('M-INTENTION', true);
    expect(element.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
  });

  it('AC-027: does nothing when querySelector returns null (silent no-op)', () => {
    querySelectorSpy.mockReturnValue(null);
    expect(() => goToMission('M-MOOD', false)).not.toThrow();
  });

  it('AC-028: swallows error when scrollIntoView throws', () => {
    (element.scrollIntoView as jest.Mock).mockImplementation(() => {
      throw new Error('browser error');
    });
    expect(() => goToMission('M-PRIORITY', false)).not.toThrow();
  });

  it('AC-024: adds onboarding-pulse class immediately', () => {
    jest.useFakeTimers();
    goToMission('M-INTENTION', false);
    expect(element.classList.contains('onboarding-pulse')).toBe(true);
  });

  it('AC-024: removes onboarding-pulse class after 800ms', () => {
    jest.useFakeTimers();
    goToMission('M-INTENTION', false);
    expect(element.classList.contains('onboarding-pulse')).toBe(true);
    jest.advanceTimersByTime(800);
    expect(element.classList.contains('onboarding-pulse')).toBe(false);
  });

  it('AC-024: M-MOOD (focus:self) calls focus on the container element', () => {
    goToMission('M-MOOD', false);
    expect(element.focus).toHaveBeenCalled();
  });

  it('AC-024: M-INTENTION (focus:input) queries for input/textarea/contenteditable', () => {
    const input = makeFocusable();
    (element.querySelector as jest.Mock).mockReturnValue(input);
    goToMission('M-INTENTION', false);
    expect(element.querySelector).toHaveBeenCalledWith('input, textarea, [contenteditable="true"]');
    expect(input.focus).toHaveBeenCalled();
  });

  it('AC-024: M-PRIORITY (focus:firstRichText) queries for textbox/contenteditable', () => {
    const richText = makeFocusable();
    (element.querySelector as jest.Mock).mockReturnValue(richText);
    goToMission('M-PRIORITY', false);
    expect(element.querySelector).toHaveBeenCalledWith(
      '[role="textbox"], [contenteditable="true"]',
    );
    expect(richText.focus).toHaveBeenCalled();
  });

  it('AC-024: M-CHECK (focus:firstCheckbox) queries for checkbox role or native checkbox', () => {
    const checkbox = makeFocusable();
    (element.querySelector as jest.Mock).mockReturnValue(checkbox);
    goToMission('M-CHECK', false);
    expect(element.querySelector).toHaveBeenCalledWith('input[type="checkbox"], [role="checkbox"]');
    expect(checkbox.focus).toHaveBeenCalled();
  });

  it('AC-024: M-GRATITUDE (focus:firstRichTextOrButton) queries for textbox/button/role=button', () => {
    const btn = makeFocusable();
    (element.querySelector as jest.Mock).mockReturnValue(btn);
    goToMission('M-GRATITUDE', false);
    expect(element.querySelector).toHaveBeenCalledWith(
      '[role="textbox"], [contenteditable="true"], button, [role="button"]',
    );
    expect(btn.focus).toHaveBeenCalled();
  });

  it('AC-030: works for completed missions (no gating)', () => {
    goToMission('M-WRITE', false);
    expect(element.scrollIntoView).toHaveBeenCalled();
  });

  describe('all 7 mission IDs resolve a selector', () => {
    const ids: MissionId[] = [
      'M-INTENTION',
      'M-MOOD',
      'M-PRIORITY',
      'M-FORMAT',
      'M-CHECK',
      'M-WRITE',
      'M-GRATITUDE',
    ];
    it.each(ids)('%s — scrollIntoView called', (id) => {
      goToMission(id, false);
      expect(document.querySelector).toHaveBeenCalledWith(
        expect.stringContaining('[data-onboarding-target='),
      );
    });
  });

  describe('AC-026: M-FORMAT hint visual', () => {
    it('adds onboarding-pulse-format class for M-FORMAT', () => {
      jest.useFakeTimers();
      goToMission('M-FORMAT', false);
      expect(element.classList.contains('onboarding-pulse-format')).toBe(true);
    });

    it('removes onboarding-pulse-format class after 800ms for M-FORMAT', () => {
      jest.useFakeTimers();
      goToMission('M-FORMAT', false);
      jest.advanceTimersByTime(800);
      expect(element.classList.contains('onboarding-pulse-format')).toBe(false);
    });

    it('does NOT add onboarding-pulse-format for other missions', () => {
      jest.useFakeTimers();
      goToMission('M-PRIORITY', false);
      expect(element.classList.contains('onboarding-pulse-format')).toBe(false);
    });
  });

  describe('AC-028: granular try/catch — pulse always runs', () => {
    it('adds onboarding-pulse on the focus target even when focus() throws', () => {
      jest.useFakeTimers();
      (element.scrollIntoView as jest.Mock).mockImplementation(() => {});
      const focusEl = makeFocusable({
        focus: jest.fn().mockImplementation(() => {
          throw new Error('focus error');
        }) as unknown as HTMLElement['focus'],
      });
      (element.querySelector as jest.Mock).mockReturnValue(focusEl);
      expect(() => goToMission('M-INTENTION', false)).not.toThrow();
      expect(focusEl.classList.contains('onboarding-pulse')).toBe(true);
      // Pulse went on the inner focus element, NOT on the container.
      expect(element.classList.contains('onboarding-pulse')).toBe(false);
    });
  });

  describe('bug-fix: pulse targets the focused element, not the giant container', () => {
    it('applies onboarding-pulse on the resolved focus target (M-PRIORITY)', () => {
      jest.useFakeTimers();
      const richText = makeFocusable();
      (element.querySelector as jest.Mock).mockReturnValue(richText);
      goToMission('M-PRIORITY', false);
      expect(richText.classList.contains('onboarding-pulse')).toBe(true);
      expect(element.classList.contains('onboarding-pulse')).toBe(false);
    });

    it('falls back to the container when no inner focus target resolves (M-INTENTION display mode)', () => {
      jest.useFakeTimers();
      // querySelector returns null for input AND for button → resolveFocusTarget returns null.
      (element.querySelector as jest.Mock).mockReturnValue(null);
      goToMission('M-INTENTION', false);
      expect(element.classList.contains('onboarding-pulse')).toBe(true);
    });

    it('applies onboarding-pulse on the container when focus mode is self (M-MOOD)', () => {
      jest.useFakeTimers();
      // focus:self → focusEl === container → pulse on container is intentional (it IS small).
      goToMission('M-MOOD', false);
      expect(element.classList.contains('onboarding-pulse')).toBe(true);
    });

    it('M-FORMAT: pulse and pulse-format both go on the rich-text editor, not the column', () => {
      jest.useFakeTimers();
      const richText = makeFocusable();
      (element.querySelector as jest.Mock).mockReturnValue(richText);
      goToMission('M-FORMAT', false);
      expect(richText.classList.contains('onboarding-pulse')).toBe(true);
      expect(richText.classList.contains('onboarding-pulse-format')).toBe(true);
      expect(element.classList.contains('onboarding-pulse')).toBe(false);
      expect(element.classList.contains('onboarding-pulse-format')).toBe(false);
    });
  });

  describe('M-CHECK: pulse lifts from sr-only checkbox input to visible label hit-area', () => {
    it('applies pulse on the closest <label> ancestor of an input[type=checkbox]', () => {
      jest.useFakeTimers();
      // Build a real <label><input type="checkbox"/></label> structure so closest() works.
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      label.appendChild(checkbox);
      document.body.appendChild(label);
      try {
        (element.querySelector as jest.Mock).mockReturnValue(checkbox);
        goToMission('M-CHECK', false);
        expect(label.classList.contains('onboarding-pulse')).toBe(true);
        expect(checkbox.classList.contains('onboarding-pulse')).toBe(false);
        expect(element.classList.contains('onboarding-pulse')).toBe(false);
      } finally {
        document.body.removeChild(label);
      }
    });

    it('falls back to the input itself when no <label> ancestor exists', () => {
      jest.useFakeTimers();
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      document.body.appendChild(checkbox);
      try {
        (element.querySelector as jest.Mock).mockReturnValue(checkbox);
        goToMission('M-CHECK', false);
        expect(checkbox.classList.contains('onboarding-pulse')).toBe(true);
      } finally {
        document.body.removeChild(checkbox);
      }
    });

    it('does NOT lift to label for non-checkbox inputs (e.g. text inputs from M-INTENTION)', () => {
      jest.useFakeTimers();
      const label = document.createElement('label');
      const textInput = document.createElement('input');
      textInput.type = 'text';
      label.appendChild(textInput);
      document.body.appendChild(label);
      try {
        (element.querySelector as jest.Mock).mockReturnValue(textInput);
        goToMission('M-INTENTION', false);
        // Text inputs are visible themselves — pulse stays on the input, not lifted.
        expect(textInput.classList.contains('onboarding-pulse')).toBe(true);
        expect(label.classList.contains('onboarding-pulse')).toBe(false);
      } finally {
        document.body.removeChild(label);
      }
    });
  });

  describe('T-005 LR f-001: M-INTENTION display mode — button.click then rAF focus', () => {
    it('clicks button trigger when input not found in display mode', () => {
      const trigger = { click: jest.fn(), focus: jest.fn() } as unknown as HTMLElement;
      (element.querySelector as jest.Mock).mockImplementation((sel: string) => {
        if (sel === 'input, textarea, [contenteditable="true"]') return null;
        if (sel === 'button') return trigger;
        return null;
      });
      goToMission('M-INTENTION', false);
      expect(trigger.click).toHaveBeenCalled();
    });

    it('focuses input after rAF when input appears post-click', () => {
      const newInput = { focus: jest.fn() } as unknown as HTMLElement;
      const trigger = { click: jest.fn(), focus: jest.fn() } as unknown as HTMLElement;
      let callCount = 0;
      (element.querySelector as jest.Mock).mockImplementation((sel: string) => {
        if (sel === 'input, textarea, [contenteditable="true"]') {
          callCount += 1;
          return callCount === 1 ? null : newInput;
        }
        if (sel === 'button') return trigger;
        return null;
      });
      const rafCbs: ((_time: number) => void)[] = [];
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCbs.push(cb);
        return 0;
      });
      goToMission('M-INTENTION', false);
      expect(rafCbs.length).toBe(1);
      rafCbs[0]!(0);
      expect(newInput.focus).toHaveBeenCalled();
      (window.requestAnimationFrame as jest.Mock).mockRestore();
    });
  });

  describe('T-005 LR f-002: M-CHECK native checkbox', () => {
    it('focuses native input[type=checkbox] when no role=checkbox present', () => {
      const nativeCheckbox = { focus: jest.fn() } as unknown as HTMLElement;
      (element.querySelector as jest.Mock).mockImplementation((sel: string) => {
        if (sel === 'input[type="checkbox"], [role="checkbox"]') return nativeCheckbox;
        return null;
      });
      goToMission('M-CHECK', false);
      expect(nativeCheckbox.focus).toHaveBeenCalled();
    });
  });

  describe('T-005 LR f-003: M-GRATITUDE folded div[role=button]', () => {
    it('focuses div[role=button] when no textbox/button present', () => {
      const roleBtn = { focus: jest.fn() } as unknown as HTMLElement;
      (element.querySelector as jest.Mock).mockImplementation((sel: string) => {
        if (sel === '[role="textbox"], [contenteditable="true"], button, [role="button"]')
          return roleBtn;
        return null;
      });
      goToMission('M-GRATITUDE', false);
      expect(roleBtn.focus).toHaveBeenCalled();
    });
  });
});
