import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EnergyPalette } from '../EnergyPalette.js';

describe('EnergyPalette', () => {
  it('renderiza 12 botões de emoji + 1 botão "+"', () => {
    render(<EnergyPalette current={null} onPick={jest.fn()} onOpenFullPicker={jest.fn()} />);
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(13);
  });

  it('chama onPick com o emoji clicado', async () => {
    const onPick = jest.fn();
    render(<EnergyPalette current={null} onPick={onPick} onOpenFullPicker={jest.fn()} />);
    const fire = screen.getByRole('menuitem', { name: /em chamas/i });
    await userEvent.click(fire);
    expect(onPick).toHaveBeenCalledWith('🔥');
  });

  it('marca o emoji atual como selecionado (aria-checked)', () => {
    render(<EnergyPalette current="🔥" onPick={jest.fn()} onOpenFullPicker={jest.fn()} />);
    const fire = screen.getByRole('menuitem', { name: /em chamas/i });
    expect(fire).toHaveAttribute('aria-checked', 'true');
  });

  it('chama onOpenFullPicker quando "+" é clicado', async () => {
    const onOpen = jest.fn();
    render(<EnergyPalette current={null} onPick={jest.fn()} onOpenFullPicker={onOpen} />);
    const more = screen.getByRole('menuitem', { name: /mais/i });
    await userEvent.click(more);
    expect(onOpen).toHaveBeenCalled();
  });
});
