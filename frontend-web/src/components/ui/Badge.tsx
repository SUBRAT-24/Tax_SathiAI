import { type HTMLAttributes, type ReactNode } from 'react';
import styles from './Badge.module.css';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  const classes = [
    styles.badge,
    styles[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
