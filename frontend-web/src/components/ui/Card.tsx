import { type HTMLAttributes, type ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  shadow?: boolean;
  interactive?: boolean;
  children: ReactNode;
}

export function Card({ shadow = false, interactive = false, className = '', children, ...props }: CardProps) {
  const classes = [
    styles.card,
    shadow && styles.shadow,
    interactive && styles.interactive,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
