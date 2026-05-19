/**
 * Integration suite — exercises AuthPage against MSW handlers shaped like real
 * Supabase auth responses. supabase-js is the real implementation here (NOT
 * mocked), so the supabase module needs valid env at import time. We inject
 * env BEFORE any dynamic import so the supabase singleton initialises against
 * the URL our MSW handlers target.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { server } from '@/test-utils/msw';

// Stable test URL; supabase-js issues HTTPS requests so we keep https here.
const SUPABASE_URL = 'https://auth-itest.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key';

process.env['VITE_SUPABASE_URL'] = SUPABASE_URL;
process.env['VITE_SUPABASE_ANON_KEY'] = SUPABASE_ANON_KEY;

// AuthPage is required AFTER env is set so the supabase module init succeeds.
// Resolved lazily inside beforeAll to defer module evaluation.
type AuthPageComponent = (typeof import('../AuthPage'))['AuthPage'];
let AuthPage: AuthPageComponent;

beforeAll(async () => {
  const mod = await import('../AuthPage');
  AuthPage = mod.AuthPage;
});

describe('AuthPage — integration via MSW', () => {
  it('login success: POST /auth/v1/token returns session and no error shows', async () => {
    server.use(
      http.post(`${SUPABASE_URL}/auth/v1/token`, () =>
        HttpResponse.json({
          access_token: 't',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'r',
          user: { id: 'u1', email: 'a@b.com' },
        }),
      ),
    );
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(screen.queryByText('Email ou senha incorretos.')).not.toBeInTheDocument();
      expect(screen.queryByText('Algo deu errado. Tente novamente.')).not.toBeInTheDocument();
    });
  });

  it('login failure: 400 invalid_grant shows translated error', async () => {
    server.use(
      http.post(`${SUPABASE_URL}/auth/v1/token`, () =>
        HttpResponse.json(
          { error: 'invalid_grant', error_description: 'Invalid login credentials' },
          { status: 400 },
        ),
      ),
    );
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(screen.getByText('Email ou senha incorretos.')).toBeInTheDocument());
  });

  it('signup failure: 422 already_registered shows translated error', async () => {
    server.use(
      http.post(`${SUPABASE_URL}/auth/v1/signup`, () =>
        HttpResponse.json(
          { msg: 'User already registered', code: 'user_already_exists' },
          { status: 422 },
        ),
      ),
    );
    render(<AuthPage />);
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /^criar conta$/i }));
    await waitFor(() =>
      expect(screen.getByText('Este email já tem conta. Faça login.')).toBeInTheDocument(),
    );
  });

  it('rate limit: 429 shows translated error', async () => {
    server.use(
      http.post(`${SUPABASE_URL}/auth/v1/token`, () =>
        HttpResponse.json({ msg: 'Email rate limit exceeded' }, { status: 429 }),
      ),
    );
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() =>
      expect(screen.getByText('Muitas tentativas. Aguarde alguns minutos.')).toBeInTheDocument(),
    );
  });

  it('network error: request rejected → generic translated error', async () => {
    // supabase-js logs the underlying fetch failure via console.error. That's
    // expected for this test path — suppress to keep output clean. The
    // jest.setup.js interceptor only throws on "Warning:"-prefixed strings,
    // so this is safe.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    server.use(http.post(`${SUPABASE_URL}/auth/v1/token`, () => HttpResponse.error()));
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() =>
      expect(screen.getByText('Algo deu errado. Tente novamente.')).toBeInTheDocument(),
    );
    errorSpy.mockRestore();
  });
});
