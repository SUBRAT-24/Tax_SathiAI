/**
 * TaxSathi — Restrained Motion Variants
 * 
 * Simple, purposeful transitions:
 * - Page transitions: 150-200ms opacity + 6px translateY
 * - Hover: 120ms color/underline
 * - Accordions: smooth height transitions
 * - Streaming: typing cursor effect
 */
import type { Variants } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1] as const; // expo.out

// Page transitions (simple fade + minimal slide)
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: EASE }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12 }
  }
};

// Legacy export for compatibility (will be removed in Phase 2+)
export const pageTransition = { type: 'tween' as const, duration: 0.18 };

// List stagger (for search results, sessions, etc.)
export const listStagger: Variants = {
  animate: {
    transition: { staggerChildren: 0.04 }
  }
};

export const listItem: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15, ease: EASE }
  }
};

// Accordion expand/collapse
export const accordionVariants: Variants = {
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.2, ease: EASE },
      opacity: { duration: 0.15, ease: EASE, delay: 0.05 }
    }
  }
};

// Modal overlay and content
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.12 } }
};

export const modalContent: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: EASE }
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.12 }
  }
};

// Sidebar slide
export const sidebarVariants: Variants = {
  closed: { x: -280, transition: { duration: 0.18, ease: EASE } },
  open: { x: 0, transition: { duration: 0.2, ease: EASE } }
};

// ========== Legacy Exports (Compatibility Layer - Will Be Removed) ==========
// These are stub exports to prevent build errors. They'll be removed as pages are updated.

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: EASE } }
};

export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.04 } }
};

export const staggerContainerFast: Variants = {
  animate: { transition: { staggerChildren: 0.03 } }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.15, ease: EASE } }
};

export const staggerItemHeavy: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: EASE } }
};

export const chatBubbleUser: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.15, ease: EASE } }
};

export const chatBubbleAI: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.15, ease: EASE } }
};

export const chipStagger: Variants = {
  animate: { transition: { staggerChildren: 0.05 } }
};

export const chipItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.12, ease: EASE } }
};

export const expandVariants: Variants = accordionVariants;

export const scaleTap = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 }
};

export const buttonTap = scaleTap;

export const wordRevealContainer: Variants = staggerContainer;
export const wordReveal: Variants = staggerItem;
export const counterVariants: Variants = fadeInUp;
export const navbarVariants: Variants = {
  visible: { y: 0, opacity: 1 },
  hidden: { y: -80, opacity: 0 }
};

export const tableRowStagger: Variants = staggerContainer;
export const tableRowItem: Variants = staggerItem;
export const timelineContainer: Variants = staggerContainer;
export const timelineItem: Variants = staggerItem;
export const heatmapCell: Variants = staggerItem;

