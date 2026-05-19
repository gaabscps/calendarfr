import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuthPage } from '../AuthPage';

const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
  },
}));

beforeEach(() => {
  mockSignInWithPassword.mockReset();
  mockSignUp.mockReset();
});

describe('AuthPage', () => {
  it('renders login mode by default', () => {
    render(<AuthPage />);
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('toggles to signup mode', async () => {
    render(<AuthPage />);
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(screen.getByRole('button', { name: /^criar conta$/i })).toBeInTheDocument();
  });

  it('blocks submit and shows email error when email invalid', async () => {
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'invalid');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(screen.getByText('Email inválido.')).toBeInTheDocument();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('blocks submit and shows password error when too short', async () => {
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(screen.getByText(/ao menos 8 caracteres/i)).toBeInTheDocument();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('calls signInWithPassword in login mode with valid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: '12345678' });
  });

  it('calls signUp in signup mode with valid credentials', async () => {
    mockSignUp.mockResolvedValue({ data: {}, error: null });
    render(<AuthPage />);
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /^criar conta$/i }));
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'a@b.com', password: '12345678' });
  });

  it('displays mapped error message when Supabase returns invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    });
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(screen.getByText('Email ou senha incorretos.')).toBeInTheDocument());
  });

  it('disables submit while submitting', async () => {
    mockSignInWithPassword.mockReturnValue(new Promise(() => {}));
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /entrar/i })).toBeDisabled());
  });

  it('uses autoComplete=current-password in login, new-password in signup', async () => {
    render(<AuthPage />);
    expect(screen.getByLabelText(/senha/i)).toHaveAttribute('autocomplete', 'current-password');
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(screen.getByLabelText(/senha/i)).toHaveAttribute('autocomplete', 'new-password');
  });

  it('blocks submit and shows both errors when both fields are empty', async () => {
    render(<AuthPage />);
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(screen.getByText('Email é obrigatório.')).toBeInTheDocument();
    expect(screen.getByText('Senha é obrigatória.')).toBeInTheDocument();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('translates "user already registered" error on signup', async () => {
    mockSignUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } });
    render(<AuthPage />);
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /^criar conta$/i }));
    await waitFor(() =>
      expect(screen.getByText('Este email já tem conta. Faça login.')).toBeInTheDocument(),
    );
  });

  it('shows generic error when supabase call throws (network)', async () => {
    mockSignInWithPassword.mockRejectedValue(new Error('Network failed'));
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() =>
      expect(screen.getByText('Algo deu errado. Tente novamente.')).toBeInTheDocument(),
    );
  });

  it('re-enables submit button after error so user can retry', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { message: 'Invalid login credentials' },
    });
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(screen.getByText('Email ou senha incorretos.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /entrar/i })).not.toBeDisabled();
  });

  it('clears formError when user toggles mode after a failed submit', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    });
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(screen.getByText('Email ou senha incorretos.')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(screen.queryByText('Email ou senha incorretos.')).not.toBeInTheDocument();
  });

  it('preserves email and password values when toggling mode', async () => {
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(screen.getByLabelText(/email/i)).toHaveValue('a@b.com');
    expect(screen.getByLabelText(/senha/i)).toHaveValue('12345678');
  });

  it('clears stale field error after user corrects the field and re-submits', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'invalid');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(screen.getByText('Email inválido.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/email/i));
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(screen.queryByText('Email inválido.')).not.toBeInTheDocument();
  });

  it('formError region announces to screen readers (role=alert)', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    });
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Email ou senha incorretos.');
  });
});
