import { validate, EMAIL_RE, MIN_PASSWORD_LENGTH } from '../validate';

describe('validate', () => {
  describe("field 'email'", () => {
    it('returns error when empty', () => {
      expect(validate('email', '')).toBe('Email é obrigatório.');
    });

    it('returns error for invalid format (no @)', () => {
      expect(validate('email', 'invalid')).toBe('Email inválido.');
    });

    it('returns error for invalid format (no dot)', () => {
      expect(validate('email', 'foo@bar')).toBe('Email inválido.');
    });

    it('returns undefined for valid email', () => {
      expect(validate('email', 'user@example.com')).toBeUndefined();
    });
  });

  describe("field 'password'", () => {
    it('returns error when empty', () => {
      expect(validate('password', '')).toBe('Senha é obrigatória.');
    });

    it('returns error when shorter than minimum', () => {
      expect(validate('password', 'short')).toBe(
        `Senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
    });

    it('returns undefined for password meeting minimum length', () => {
      expect(validate('password', '12345678')).toBeUndefined();
    });
  });

  it('exports EMAIL_RE constant', () => {
    expect(EMAIL_RE).toBeInstanceOf(RegExp);
    expect(EMAIL_RE.test('a@b.co')).toBe(true);
  });

  it('exports MIN_PASSWORD_LENGTH constant', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });
});
