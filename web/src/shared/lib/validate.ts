/**
 * Global field validator. API: `validate('email', value)` → string | undefined.
 *
 * Constraints (read before extending):
 * - Returns the first failing rule per field; does NOT compose rules.
 * - Messages are PT-BR hard-coded; no i18n layer.
 * - If you reach 5+ registered fields OR need composite rules
 *   (`email + maxLen + not-tempmail`), STOP adding here and revisit the
 *   abstraction (Zod, builder, or per-feature validators). Growing this
 *   indefinitely turns it into a god module.
 */

type Field = 'email' | 'password';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

const validators: Record<Field, (value: string) => string | undefined> = {
  email: (value) => {
    if (!value) return 'Email é obrigatório.';
    if (!EMAIL_RE.test(value)) return 'Email inválido.';
    return undefined;
  },
  password: (value) => {
    if (!value) return 'Senha é obrigatória.';
    if (value.length < MIN_PASSWORD_LENGTH) {
      return `Senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    return undefined;
  },
};

export function validate(field: Field, value: string): string | undefined {
  return validators[field](value);
}

export type { Field };
