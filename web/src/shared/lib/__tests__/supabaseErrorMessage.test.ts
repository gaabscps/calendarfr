import { supabaseErrorMessage } from '../supabaseErrorMessage';

describe('supabaseErrorMessage', () => {
  it('returns generic message for null', () => {
    expect(supabaseErrorMessage(null)).toBe('Algo deu errado. Tente novamente.');
  });

  it('returns generic message for undefined', () => {
    expect(supabaseErrorMessage(undefined)).toBe('Algo deu errado. Tente novamente.');
  });

  it('returns generic message for non-object error', () => {
    expect(supabaseErrorMessage('a string')).toBe('Algo deu errado. Tente novamente.');
  });

  it('returns generic message for object without message property', () => {
    expect(supabaseErrorMessage({})).toBe('Algo deu errado. Tente novamente.');
  });

  it('maps invalid login credentials', () => {
    expect(supabaseErrorMessage({ message: 'Invalid login credentials' })).toBe(
      'Email ou senha incorretos.',
    );
  });

  it('maps user already registered', () => {
    expect(supabaseErrorMessage({ message: 'User already registered' })).toBe(
      'Este email já tem conta. Faça login.',
    );
  });

  it('maps email confirmation required', () => {
    expect(supabaseErrorMessage({ message: 'Email not confirmed' })).toBe(
      'Confirme seu email antes de entrar.',
    );
  });

  it('maps rate limit error', () => {
    expect(supabaseErrorMessage({ message: 'Email rate limit exceeded' })).toBe(
      'Muitas tentativas. Aguarde alguns minutos.',
    );
  });

  it('maps "too many" requests error', () => {
    expect(supabaseErrorMessage({ message: 'Too many requests' })).toBe(
      'Muitas tentativas. Aguarde alguns minutos.',
    );
  });

  it('maps JWT expired', () => {
    expect(supabaseErrorMessage({ message: 'JWT expired' })).toBe(
      'Sua sessão expirou. Faça login novamente.',
    );
  });

  it('maps RLS policy violation (row-level security)', () => {
    expect(supabaseErrorMessage({ message: 'new row violates row-level security policy' })).toBe(
      'Você não tem acesso a esse recurso.',
    );
  });

  it('maps permission denied', () => {
    expect(supabaseErrorMessage({ message: 'permission denied for table days' })).toBe(
      'Você não tem acesso a esse recurso.',
    );
  });

  it('returns generic message for unknown error', () => {
    expect(supabaseErrorMessage({ message: 'Some unrecognized error' })).toBe(
      'Algo deu errado. Tente novamente.',
    );
  });

  it('case-insensitive match', () => {
    expect(supabaseErrorMessage({ message: 'INVALID LOGIN CREDENTIALS' })).toBe(
      'Email ou senha incorretos.',
    );
  });
});
