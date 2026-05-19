import { useId } from 'react';

import styles from './TextField.module.css';

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password';
  error?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  error,
  autoComplete,
  disabled,
  required,
  id,
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const inputClassName = [styles.input, error && styles.inputError].filter(Boolean).join(' ');

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
        {...(autoComplete ? { autoComplete } : {})}
        {...(disabled ? { disabled } : {})}
        {...(required ? { required } : {})}
        {...(error ? { 'aria-invalid': true, 'aria-describedby': errorId } : {})}
      />
      {error ? (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
