import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TextField } from '../TextField';

describe('TextField', () => {
  it('renders label and input', () => {
    render(<TextField label="Email" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders with default type="text"', () => {
    render(<TextField label="Name" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Name')).toHaveAttribute('type', 'text');
  });

  it('forwards type prop (email)', () => {
    render(<TextField label="Email" type="email" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
  });

  it('forwards type prop (password)', () => {
    render(<TextField label="Senha" type="password" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('reflects controlled value', () => {
    render(<TextField label="Email" value="user@example.com" onChange={() => {}} />);
    expect(screen.getByLabelText('Email')).toHaveValue('user@example.com');
  });

  it('calls onChange with new string value', async () => {
    const handleChange = jest.fn();
    render(<TextField label="Email" value="" onChange={handleChange} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a');
    expect(handleChange).toHaveBeenCalledWith('a');
  });

  it('renders error message and sets aria-invalid', () => {
    render(<TextField label="Email" value="" onChange={() => {}} error="Email inválido." />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Email inválido.')).toBeInTheDocument();
  });

  it('does not set aria-invalid when no error', () => {
    render(<TextField label="Email" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('forwards autoComplete', () => {
    render(
      <TextField label="Senha" value="" onChange={() => {}} autoComplete="current-password" />,
    );
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password');
  });

  it('forwards disabled', () => {
    render(<TextField label="Email" value="" onChange={() => {}} disabled />);
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('uses provided id', () => {
    render(<TextField id="my-email" label="Email" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'my-email');
  });

  it('generates stable id when not provided', () => {
    render(<TextField label="Email" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('id')).toBeTruthy();
  });

  it('forwards required attribute to the input', () => {
    render(<TextField label="Email" value="" onChange={() => {}} required />);
    expect(screen.getByLabelText('Email')).toBeRequired();
  });

  it('does not set required when prop omitted', () => {
    render(<TextField label="Email" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Email')).not.toBeRequired();
  });
});
