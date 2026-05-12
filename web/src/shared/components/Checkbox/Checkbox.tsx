import type { ChangeEvent } from 'react';

import styles from './Checkbox.module.css';

interface CheckboxBaseProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
}

type CheckboxWithLabel = CheckboxBaseProps & {
  'aria-label': string;
  'aria-labelledby'?: never;
};

type CheckboxWithLabelledBy = CheckboxBaseProps & {
  'aria-label'?: never;
  'aria-labelledby': string;
};

export type CheckboxProps = CheckboxWithLabel | CheckboxWithLabelledBy;

export function Checkbox({ checked, onChange, disabled = false, ...ariaProps }: CheckboxProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(e.target.checked);
    }
  };

  return (
    <label className={styles.wrapper} data-disabled={disabled || undefined}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        {...ariaProps}
      />
      <span className={styles.box} aria-hidden="true" />
    </label>
  );
}
