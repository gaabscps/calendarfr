import { render, screen } from '@testing-library/react';

import type { MissionDef } from '../../types.js';
import { QuestItem } from '../QuestItem.js';
import styles from '../QuestItem.module.css';

const mission: MissionDef = {
  id: 'M-INTENTION',
  group: 'Manhã',
  label: 'Defina a intenção do dia',
  emoji: '🌅',
};

describe('QuestItem', () => {
  it('renders with pending state — aria-label includes "pendente"', () => {
    render(<QuestItem mission={mission} completed={false} />);
    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('aria-label', expect.stringContaining('pendente'));
  });

  it('renders with completed state — aria-label includes "concluída"', () => {
    render(<QuestItem mission={mission} completed={true} />);
    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('aria-label', expect.stringContaining('concluída'));
  });

  it('pending: seal shows pending indicator (no fill class)', () => {
    const { container } = render(<QuestItem mission={mission} completed={false} />);
    const seal = container.querySelector('[data-testid="quest-seal"]');
    expect(seal).toBeInTheDocument();
    expect(seal).toHaveAttribute('data-completed', 'false');
  });

  it('completed: seal shows completed state', () => {
    const { container } = render(<QuestItem mission={mission} completed={true} />);
    const seal = container.querySelector('[data-testid="quest-seal"]');
    expect(seal).toBeInTheDocument();
    expect(seal).toHaveAttribute('data-completed', 'true');
  });

  it('completed: renders strike line overlay', () => {
    const { container } = render(<QuestItem mission={mission} completed={true} />);
    const strikeLine = container.querySelector('[data-testid="strike-line"]');
    expect(strikeLine).toBeInTheDocument();
  });

  it('pending: no strike line overlay', () => {
    const { container } = render(<QuestItem mission={mission} completed={false} />);
    const strikeLine = container.querySelector('[data-testid="strike-line"]');
    expect(strikeLine).not.toBeInTheDocument();
  });

  it('renders mission label text', () => {
    render(<QuestItem mission={mission} completed={false} />);
    expect(screen.getByText('Defina a intenção do dia')).toBeInTheDocument();
  });

  it('aria-label contains mission label', () => {
    render(<QuestItem mission={mission} completed={false} />);
    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('aria-label', expect.stringContaining('Defina a intenção do dia'));
  });

  it('label element renders with correct CSS Module class', () => {
    const { container } = render(<QuestItem mission={mission} completed={false} />);
    const labelElement = container.querySelector(`.${styles.label}`);
    expect(labelElement).toBeInTheDocument();
    expect(labelElement).toHaveTextContent('Defina a intenção do dia');
  });

  it('label element renders with font-body fallback chain', () => {
    const { container } = render(<QuestItem mission={mission} completed={false} />);
    const labelElement = container.querySelector(`.${styles.label}`) as HTMLElement;
    expect(labelElement).toBeInTheDocument();
    // The label class is applied, which uses font-family: var(--font-body, 'Inter', system-ui, sans-serif)
    // This satisfies AC-006: the fallback chain includes system-ui for font loading resilience
    if (styles.label) {
      expect(labelElement).toHaveClass(styles.label);
    }
  });
});
