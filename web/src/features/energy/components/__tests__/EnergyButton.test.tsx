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
