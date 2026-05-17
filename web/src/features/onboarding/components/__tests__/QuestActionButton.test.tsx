import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { QuestActionButton } from '../QuestActionButton.js';

describe('QuestActionButton', () => {
  it('renders a visible button with correct aria-label', () => {
    const onClick = jest.fn();
    render(
      <QuestActionButton
        missionId="M-INTENTION"
        missionLabel="Defina a intenção do dia"
        onClick={onClick}
      />,
    );
    const btn = screen.getByRole('button', { name: 'Ir para missão: Defina a intenção do dia' });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeVisible();
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    render(
      <QuestActionButton missionId="M-MOOD" missionLabel="Escolha seu humor" onClick={onClick} />,
    );
    const btn = screen.getByRole('button', { name: 'Ir para missão: Escolha seu humor' });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter key is pressed', async () => {
    const onClick = jest.fn();
    render(
      <QuestActionButton
        missionId="M-PRIORITY"
        missionLabel="Anote uma prioridade"
        onClick={onClick}
      />,
    );
    const btn = screen.getByRole('button', { name: 'Ir para missão: Anote uma prioridade' });
    btn.focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Space key is pressed', async () => {
    const onClick = jest.fn();
    render(
      <QuestActionButton missionId="M-WRITE" missionLabel="Escreva na agenda" onClick={onClick} />,
    );
    const btn = screen.getByRole('button', { name: 'Ir para missão: Escreva na agenda' });
    btn.focus();
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('button has type="button" (does not submit forms)', () => {
    render(
      <QuestActionButton
        missionId="M-GRATITUDE"
        missionLabel="Registre uma linha de gratidão"
        onClick={jest.fn()}
      />,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('aria-label is dynamic — reflects missionLabel prop', () => {
    render(
      <QuestActionButton
        missionId="M-FORMAT"
        missionLabel="Use a barra flutuante"
        onClick={jest.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Ir para missão: Use a barra flutuante' }),
    ).toBeInTheDocument();
  });
});
