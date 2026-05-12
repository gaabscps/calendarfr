import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  describe('AC-021 — API: checked, onChange, aria-label ou aria-labelledby, disabled', () => {
    it('renders a checkbox input (role=checkbox)', () => {
      render(
        <Checkbox checked={false} onChange={() => undefined} aria-label="Item de prioridade" />,
      );
      expect(screen.getByRole('checkbox', { name: 'Item de prioridade' })).toBeInTheDocument();
    });

    it('reflects checked state as true', () => {
      render(<Checkbox checked={true} onChange={() => undefined} aria-label="Concluído" />);
      const input = screen.getByRole('checkbox', { name: 'Concluído' });
      expect(input).toBeChecked();
    });

    it('reflects checked state as false', () => {
      render(<Checkbox checked={false} onChange={() => undefined} aria-label="Pendente" />);
      const input = screen.getByRole('checkbox', { name: 'Pendente' });
      expect(input).not.toBeChecked();
    });

    it('calls onChange with next value (true) when unchecked checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<Checkbox checked={false} onChange={onChange} aria-label="Toggle" />);
      await user.click(screen.getByRole('checkbox', { name: 'Toggle' }));
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('calls onChange with next value (false) when checked checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<Checkbox checked={true} onChange={onChange} aria-label="Toggle" />);
      await user.click(screen.getByRole('checkbox', { name: 'Toggle' }));
      expect(onChange).toHaveBeenCalledWith(false);
    });

    it('accepts aria-labelledby instead of aria-label', () => {
      render(
        <>
          <span id="lbl">Rótulo externo</span>
          <Checkbox checked={false} onChange={() => undefined} aria-labelledby="lbl" />
        </>,
      );
      expect(screen.getByRole('checkbox', { name: 'Rótulo externo' })).toBeInTheDocument();
    });

    it('renders disabled when disabled prop is true', () => {
      render(
        <Checkbox checked={false} onChange={() => undefined} aria-label="Disabled" disabled />,
      );
      expect(screen.getByRole('checkbox', { name: 'Disabled' })).toBeDisabled();
    });

    it('does not call onChange when disabled checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<Checkbox checked={false} onChange={onChange} aria-label="Disabled" disabled />);
      await user.click(screen.getByRole('checkbox', { name: 'Disabled' }));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('AC-020 — Structure: native input + accessible', () => {
    it('renders an input element of type checkbox', () => {
      render(<Checkbox checked={false} onChange={() => undefined} aria-label="Check" />);
      const input = screen.getByRole('checkbox', { name: 'Check' });
      expect(input.tagName).toBe('INPUT');
      expect((input as HTMLInputElement).type).toBe('checkbox');
    });
  });

  describe('AC-022 — Keyboard: Space toggles (native behavior)', () => {
    it('calls onChange when Space key is pressed on focused checkbox', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<Checkbox checked={false} onChange={onChange} aria-label="Space toggle" />);
      const input = screen.getByRole('checkbox', { name: 'Space toggle' });
      input.focus();
      await user.keyboard(' ');
      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe('AC-021 — Click on visible .box (label wrapper) toggles checkbox', () => {
    it('calls onChange when the label wrapper (visible box area) is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const { container } = render(
        <Checkbox checked={false} onChange={onChange} aria-label="Box click" />,
      );
      // The label wrapper wraps the sr-only input + visible .box span
      // Clicking the label triggers the native input change
      const label = container.querySelector('label');
      expect(label).toBeInTheDocument();
      await user.click(label!);
      expect(onChange).toHaveBeenCalledWith(true);
    });
  });
});
