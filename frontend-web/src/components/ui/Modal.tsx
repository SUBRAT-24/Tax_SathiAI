import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { modalOverlay, modalContent } from '../../animations/variants';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large';
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ isOpen, onClose, title, size = 'medium', children, footer }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          variants={modalOverlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className={`${styles.content} ${styles[size]}`}
            variants={modalContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
          >
            {title && (
              <div className={styles.header}>
                <h2 id="modal-title" className={styles.title}>{title}</h2>
                <button
                  className={styles.closeButton}
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>
            )}
            <div className={styles.body}>
              {children}
            </div>
            {footer && (
              <div className={styles.footer}>
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
