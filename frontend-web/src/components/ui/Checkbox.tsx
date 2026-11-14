import { forwardRef, type InputHTMLAttributes } from 'react';
import styles from './Checkbox.module.css';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');
    
    return (
      <label className={`${styles.wrapper} ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={styles.checkbox}
          {...props}
        />
        {label && <span className={styles.label}>{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
