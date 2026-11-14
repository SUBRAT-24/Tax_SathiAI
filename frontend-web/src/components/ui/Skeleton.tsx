import { type HTMLAttributes } from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'heading' | 'button' | 'card' | 'avatar';
}

export function Skeleton({ variant = 'text', className = '', ...props }: SkeletonProps) {
  const classes = [
    styles.skeleton,
    styles[variant],
    className
  ].filter(Boolean).join(' ');

  return <div className={classes} aria-busy="true" aria-live="polite" {...props} />;
}
