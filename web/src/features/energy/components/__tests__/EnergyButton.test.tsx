import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EnergyButton } from '../EnergyButton.js';

describe('EnergyButton', () => {
  it('renderiza "+" quando energy é null e não há sugestão', () => {
    render(<EnergyButton energy={null} suggestion={null} onChange={jest.fn()} hour={14} />);
    const btn = screen.getByRole('button', { name: /definir energy.*14/i });
    expect(btn).toHaveTextContent('+');
  });

  it('renderiza emoji setado', () => {
    render(
      <EnergyButton energy={{ emoji: '🔥' }} suggestion={null} onChange={jest.fn()} hour={14} />,
    );
    expect(screen.getByRole('button', { name: /energy da hora 14/i })).toHaveTextContent('🔥');
  });

  it('renderiza ghost suggestion (data-suggestion) quando energy=null e suggestion presente', () => {
    render(<EnergyButton energy={null} suggestion="🎯" onChange={jest.fn()} hour={14} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('🎯');
    expect(btn).toHaveAttribute('data-suggestion', 'true');
  });

  it('clique aceita sugestão e chama onChange', async () => {
    const onChange = jest.fn();
    render(<EnergyButton energy={null} suggestion="🎯" onChange={onChange} hour={14} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith({ emoji: '🎯' });
  });

  it('clique abre paleta quando energy setado e sem sugestão', async () => {
    render(
      <EnergyButton energy={{ emoji: '🔥' }} suggestion={null} onChange={jest.fn()} hour={14} />,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('menu', { name: /paleta/i })).toBeInTheDocument();
  });

  it('clique direito limpa energy', async () => {
    const onChange = jest.fn();
    render(
      <EnergyButton energy={{ emoji: '🔥' }} suggestion={null} onChange={onChange} hour={14} />,
    );
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByRole('button') });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('escolher emoji da paleta fecha o popover e chama onChange', async () => {
    const onChange = jest.fn();
    render(<EnergyButton energy={null} suggestion={null} onChange={onChange} hour={14} />);
    await userEvent.click(screen.getByRole('button', { name: /definir energy.*14/i }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: /em chamas/i }));
    expect(onChange).toHaveBeenCalledWith({ emoji: '🔥' });
    expect(screen.queryByRole('menu', { name: /paleta/i })).not.toBeInTheDocument();
  });

  it('clique fora do wrapper fecha o popover', async () => {
    render(
      <div>
        <EnergyButton energy={{ emoji: '🔥' }} suggestion={null} onChange={jest.fn()} hour={14} />
        <button type="button">outside</button>
      </div>,
    );
    // Abre popover
    await userEvent.click(screen.getByRole('button', { name: /energy da hora 14/i }));
    expect(screen.getByRole('menu', { name: /paleta/i })).toBeInTheDocument();
    // Click outside
    await userEvent.click(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('menu', { name: /paleta/i })).not.toBeInTheDocument();
  });

  it('ESC fecha o popover', async () => {
    render(
      <EnergyButton energy={{ emoji: '🔥' }} suggestion={null} onChange={jest.fn()} hour={14} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /energy da hora 14/i }));
    expect(screen.getByRole('menu', { name: /paleta/i })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu', { name: /paleta/i })).not.toBeInTheDocument();
  });
});

describe('EnergyButton — data-state', () => {
  it('data-state="set" quando energy presente', () => {
    render(
      <EnergyButton energy={{ emoji: '🔥' }} suggestion={null} onChange={jest.fn()} hour={14} />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'set');
  });

  it('sem data-state quando energy null e sem sugestão', () => {
    render(<EnergyButton energy={null} suggestion={null} onChange={jest.fn()} hour={14} />);
    expect(screen.getByRole('button')).not.toHaveAttribute('data-state');
  });

  it('sem data-state quando suggestion presente (data-suggestion ainda dispara)', () => {
    render(<EnergyButton energy={null} suggestion="🎯" onChange={jest.fn()} hour={14} />);
    const btn = screen.getByRole('button');
    expect(btn).not.toHaveAttribute('data-state');
    expect(btn).toHaveAttribute('data-suggestion', 'true');
  });
});

describe('EnergyButton — popover placement (flip up/down)', () => {
  function mockButtonRect(rect: { top?: number; bottom?: number }) {
    const original = HTMLButtonElement.prototype.getBoundingClientRect;
    HTMLButtonElement.prototype.getBoundingClientRect = function () {
      return {
        top: rect.top ?? 0,
        bottom: rect.bottom ?? 0,
        left: 0,
        right: 0,
        width: 28,
        height: 28,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as ReturnType<HTMLButtonElement['getBoundingClientRect']>;
    };
    return () => {
      HTMLButtonElement.prototype.getBoundingClientRect = original;
    };
  }

  function mockInnerHeight(height: number) {
    const original = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: height,
    });
    return () => {
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        writable: true,
        value: original,
      });
    };
  }

  it('placement=bottom (default) quando há espaço abaixo', async () => {
    const restoreH = mockInnerHeight(800);
    const restoreRect = mockButtonRect({ top: 100, bottom: 128 });
    try {
      render(
        <EnergyButton energy={{ emoji: '🔥' }} suggestion={null} onChange={jest.fn()} hour={14} />,
      );
      await userEvent.click(screen.getByRole('button', { name: /energy da hora 14/i }));
      const menu = screen.getByRole('menu', { name: /paleta/i });
      const popover = menu.parentElement;
      expect(popover).toHaveAttribute('data-placement', 'bottom');
    } finally {
      restoreRect();
      restoreH();
    }
  });

  it('placement=top quando o botão está perto da borda inferior', async () => {
    const restoreH = mockInnerHeight(800);
    // Botão a 52px da borda inferior — sem espaço pra popover de 320px
    const restoreRect = mockButtonRect({ top: 720, bottom: 748 });
    try {
      render(
        <EnergyButton energy={{ emoji: '🔥' }} suggestion={null} onChange={jest.fn()} hour={14} />,
      );
      await userEvent.click(screen.getByRole('button', { name: /energy da hora 14/i }));
      const menu = screen.getByRole('menu', { name: /paleta/i });
      const popover = menu.parentElement;
      expect(popover).toHaveAttribute('data-placement', 'top');
    } finally {
      restoreRect();
      restoreH();
    }
  });

  it('flips quando ambos lados estão apertados mas há mais espaço acima', async () => {
    const restoreH = mockInnerHeight(400);
    // spaceBelow=172, spaceAbove=200. Ambos < 320 mas espaço acima > abaixo → top.
    const restoreRect = mockButtonRect({ top: 200, bottom: 228 });
    try {
      render(
        <EnergyButton energy={{ emoji: '🔥' }} suggestion={null} onChange={jest.fn()} hour={14} />,
      );
      await userEvent.click(screen.getByRole('button', { name: /energy da hora 14/i }));
      const menu = screen.getByRole('menu', { name: /paleta/i });
      const popover = menu.parentElement;
      expect(popover).toHaveAttribute('data-placement', 'top');
    } finally {
      restoreRect();
      restoreH();
    }
  });
});
