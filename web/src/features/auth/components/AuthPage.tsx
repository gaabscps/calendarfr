import { useState, type FormEvent } from 'react';

import { supabase } from '@/lib/supabase';
import { Button } from '@/shared/components/Button';
import { PaperSheet } from '@/shared/components/PaperSheet';
import { TextField } from '@/shared/components/TextField';
import { supabaseErrorMessage } from '@/shared/lib/supabaseErrorMessage';
import { validate } from '@/shared/lib/validate';

import styles from './AuthPage.module.css';

type Mode = 'login' | 'signup';

/**
 * Full-screen login + signup page. Toggles between modes; same email/password
 * fields. Field validation is local (validate util); auth errors come from
 * Supabase and are mapped to PT-BR via supabaseErrorMessage.
 */
export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setFormError(null);
    setEmailError(undefined);
    setPasswordError(undefined);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return; // belt-and-suspenders against Enter-spam
    const eErr = validate('email', email);
    const pErr = validate('password', password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const { error } =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (error) {
        setFormError(supabaseErrorMessage(error));
      }
    } catch (err) {
      setFormError(supabaseErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = mode === 'login' ? 'Entrar' : 'Criar conta';
  const toggleLabel = mode === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar';
  const heading = mode === 'login' ? 'Entre com sua conta' : 'Crie sua conta';

  return (
    <div className={styles.container}>
      <div className={styles.sheet}>
        <PaperSheet ariaLabel={heading}>
          <h1 className={styles.title}>CalendárioFR</h1>
          <h2 className={styles.heading}>{heading}</h2>
          <form
            className={styles.form}
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            noValidate
          >
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              disabled={submitting}
              required
              {...(emailError ? { error: emailError } : {})}
            />
            <TextField
              label="Senha"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={submitting}
              required
              {...(passwordError ? { error: passwordError } : {})}
            />
            <Button type="submit" variant="primary" disabled={submitting} className={styles.submit}>
              {submitLabel}
            </Button>
            {formError ? (
              <p className={styles.formError} role="alert" aria-live="polite">
                {formError}
              </p>
            ) : null}
          </form>
          <button type="button" onClick={toggleMode} className={styles.toggle}>
            {toggleLabel}
          </button>
        </PaperSheet>
      </div>
    </div>
  );
}
