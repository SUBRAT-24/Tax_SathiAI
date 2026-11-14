import { type ReactNode, type HTMLAttributes } from 'react';
import styles from './Table.module.css';

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode;
}

export function Table({ className = '', children, ...props }: TableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={`${styles.table} ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}
