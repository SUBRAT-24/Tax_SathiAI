import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  iconOnly?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, iconOnly = false, className = '', children, disabled, ...props }, ref) => {
    const classes = [
      styles.button,
      styles[variant],
      styles[size],
      loading && styles.loading,
      iconOnly && styles.iconOnly,
      className
    ].filter(Boolean).join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
