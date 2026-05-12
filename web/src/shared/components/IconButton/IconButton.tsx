import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './IconButton.module.css';

type IconButtonBaseProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'aria-labelledby'
> & {
  children: ReactNode;
  variant?: 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

// Discriminated union: either aria-label OR aria-labelledby is required
type WithAriaLabel = IconButtonBaseProps & { 'aria-label': string; 'aria-labelledby'?: never };
type WithAriaLabelledBy = IconButtonBaseProps & {
  'aria-label'?: never;
  'aria-labelledby': string;
};

export type IconButtonProps = WithAriaLabel | WithAriaLabelledBy;

export function IconButton({
  children,
  variant = 'ghost',
  size = 'sm',
  type = 'button',
  className,
  ...rest
}: IconButtonProps) {
  const classList = [styles.button, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classList} {...rest}>
      {children}
    </button>
  );
}
