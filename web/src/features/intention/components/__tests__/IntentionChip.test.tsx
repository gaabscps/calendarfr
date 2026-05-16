import { fireEvent, render, screen } from '@testing-library/react';

import { INTENTION_EMPTY_LABEL, INTENTION_HELP } from '../../lib/constants.js';
import { IntentionChip } from '../IntentionChip.js';

describe('IntentionChip', () => {
  it('renderiza placeholder "palavra do dia" quando value é null', () => {
    render(<IntentionChip value={null} onChange={jest.fn()} />);
    const trigger = screen.getByRole('button', { name: /adicionar palavra do dia/i });
    expect(trigger).toHaveAttribute('data-empty', 'true');
    expect(trigger).toHaveTextContent(INTENTION_EMPTY_LABEL);
  });

  it('renderiza valor preenchido com aria-label que cobre o texto', () => {
    render(<IntentionChip value="foco" onChange={jest.fn()} />);
    const trigger = screen.getByRole('button', { name: /palavra do dia: foco/i });
    expect(trigger).toHaveAttribute('data-empty', 'false');
    expect(trigger).toHaveTextContent('foco');
  });

  it('tooltip (title) explica propósito e timing tanto no chip vazio quanto preenchido', () => {
    const { rerender } = render(<IntentionChip value={null} onChange={jest.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('title', INTENTION_HELP);
    rerender(<IntentionChip value="foco" onChange={jest.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('title', INTENTION_HELP);
  });

  it('entra em modo de edição ao clicar e foca o input', () => {
    render(<IntentionChip value={null} onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox', { name: /palavra do dia/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('input vazio mostra placeholder "ex: <exemplo>"', () => {
    render(<IntentionChip value={null} onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.placeholder).toMatch(/^ex: /);
  });

  it('Enter commita e chama onChange com texto trimmed', () => {
    const onChange = jest.fn();
    render(<IntentionChip value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  foco  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('foco');
  });

  it('input vazio commita como null (limpa intenção)', () => {
    const onChange = jest.fn();
    render(<IntentionChip value="foco" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('Escape cancela e NÃO chama onChange', () => {
    const onChange = jest.fn();
    render(<IntentionChip value="foco" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'novo valor' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
    // Volta pro modo botão
    expect(screen.getByRole('button')).toHaveTextContent('foco');
  });

  it('blur commita igual ao Enter', () => {
    const onChange = jest.fn();
    render(<IntentionChip value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'gratidão' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('gratidão');
  });

  it('NÃO chama onChange quando valor é igual ao atual', () => {
    const onChange = jest.fn();
    render(<IntentionChip value="foco" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('input respeita maxLength do MAX_INTENTION_LENGTH', () => {
    render(<IntentionChip value={null} onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.maxLength).toBe(40);
  });
});
