import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EnergyPalette } from '../EnergyPalette.js';

describe('EnergyPalette', () => {
  it('renderiza 12 botões de emoji (menuitemradio) + 1 botão "+" (menuitem)', () => {
    render(<EnergyPalette current={null} onPick={jest.fn()} onOpenFullPicker={jest.fn()} />);
    const radios = screen.getAllByRole('menuitemradio');
    const more = screen.getAllByRole('menuitem');
    expect(radios).toHaveLength(12);
    expect(more).toHaveLength(1);
  });

  it('chama onPick com o emoji clicado', async () => {
    const onPick = jest.fn();
    render(<EnergyPalette current={null} onPick={onPick} onOpenFullPicker={jest.fn()} />);
    const fire = screen.getByRole('menuitemradio', { name: /em chamas/i });
    await userEvent.click(fire);
    expect(onPick).toHaveBeenCalledWith('🔥');
  });

  it('marca o emoji atual como selecionado (aria-checked)', () => {
    render(<EnergyPalette current="🔥" onPick={jest.fn()} onOpenFullPicker={jest.fn()} />);
    const fire = screen.getByRole('menuitemradio', { name: /em chamas/i });
    expect(fire).toHaveAttribute('aria-checked', 'true');
  });

  it('chama onOpenFullPicker quando "+ outros emojis" é clicado', async () => {
    const onOpen = jest.fn();
    render(<EnergyPalette current={null} onPick={jest.fn()} onOpenFullPicker={onOpen} />);
    const more = screen.getByRole('menuitem', { name: /outros emojis/i });
    await userEvent.click(more);
    expect(onOpen).toHaveBeenCalled();
  });
});

describe('EnergyPalette — descriptions', () => {
  it('renderiza título "Como foi essa hora?"', () => {
    render(<EnergyPalette current={null} onPick={jest.fn()} onOpenFullPicker={jest.fn()} />);
    expect(screen.getByText(/como foi essa hora\?/i)).toBeInTheDocument();
  });

  it('mostra placeholder no slot de description quando nada hovered', () => {
    render(<EnergyPalette current={null} onPick={jest.fn()} onOpenFullPicker={jest.fn()} />);
    expect(screen.getByText(/passe o mouse num adesivo/i)).toBeInTheDocument();
  });

  it('hover em sticker mostra a description correspondente', async () => {
    render(<EnergyPalette current={null} onPick={jest.fn()} onOpenFullPicker={jest.fn()} />);
    const fire = screen.getByRole('menuitemradio', { name: /em chamas/i });
    await userEvent.hover(fire);
    expect(screen.getByText(/hora de pico/i)).toBeInTheDocument();
  });

  it('focus em sticker (teclado) também mostra description', async () => {
    render(<EnergyPalette current={null} onPick={jest.fn()} onOpenFullPicker={jest.fn()} />);
    const focado = screen.getByRole('menuitemradio', { name: /focado/i });
    await userEvent.click(focado);
    // onFocus fires on click; verify description slot
    expect(screen.getByText(/trabalho concentrado/i)).toBeInTheDocument();
  });

  it('mouseleave restaura placeholder', async () => {
    render(<EnergyPalette current={null} onPick={jest.fn()} onOpenFullPicker={jest.fn()} />);
    const fire = screen.getByRole('menuitemradio', { name: /em chamas/i });
    await userEvent.hover(fire);
    await userEvent.unhover(fire);
    expect(screen.getByText(/passe o mouse num adesivo/i)).toBeInTheDocument();
  });

  it('botão "+ outros emojis" tem o novo texto', () => {
    render(<EnergyPalette current={null} onPick={jest.fn()} onOpenFullPicker={jest.fn()} />);
    expect(screen.getByRole('menuitem', { name: /outros emojis/i })).toBeInTheDocument();
  });
});
