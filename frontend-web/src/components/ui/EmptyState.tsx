import { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <Icon size={48} strokeWidth={1.5} className={styles.icon} />
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
