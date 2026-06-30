/**
 * TaxSathi AI — Framer Motion Animation Variants
 * All reusable animation variants for the entire app.
 */

import type { Variants } from 'framer-motion';

// ─── Page Transitions ──────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const pageTransition = {
  type: 'tween' as const,
  ease: 'easeInOut' as const,
  duration: 0.3,
};

// ─── Fade In Up ────────────────────────────────
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

// ─── Stagger Container ────────────────────────
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

// ─── Chat Bubble ───────────────────────────────
export const chatBubbleUser: Variants = {
  hidden: { opacity: 0, x: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

export const chatBubbleAI: Variants = {
  hidden: { opacity: 0, x: -30, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

// ─── Typing Indicator ──────────────────────────
export const typingDot: Variants = {
  animate: {
    y: [0, -8, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ─── Card Hover ────────────────────────────────
export const cardHover: Variants = {
  rest: { y: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  hover: {
    y: -4,
    boxShadow: '0 12px 40px rgba(99,102,241,0.2)',
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// ─── Scale Tap ─────────────────────────────────
export const scaleTap = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
};

export const buttonTap = {
  whileHover: { scale: 1.02, boxShadow: '0 0 30px rgba(99,102,241,0.4)' },
  whileTap: { scale: 0.98 },
};

// ─── Modal ─────────────────────────────────────
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.9, y: 20 },
};

// ─── Sidebar ───────────────────────────────────
export const sidebarVariants: Variants = {
  closed: { x: -280, opacity: 0 },
  open: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 200, damping: 25 },
  },
};

// ─── Navbar ────────────────────────────────────
export const navbarVariants: Variants = {
  visible: { y: 0, opacity: 1, transition: { duration: 0.3 } },
  hidden: { y: -100, opacity: 0, transition: { duration: 0.3 } },
};

// ─── Counter Animation ─────────────────────────
export const counterVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 15 },
  },
};

// ─── Accordion / Expand ────────────────────────
export const expandVariants: Variants = {
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
};

// ─── Notification Badge ────────────────────────
export const badgePulse: Variants = {
  animate: {
    scale: [1, 1.15, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

// ─── Suggestion Chips ──────────────────────────
export const chipStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.3 },
  },
};

export const chipItem: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
};

// ─── Table Row ─────────────────────────────────
export const tableRowStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

export const tableRowItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

// ─── Timeline ──────────────────────────────────
export const timelineContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

export const timelineItem: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 200, damping: 20 },
  },
};

// ─── Hero Word Reveal ──────────────────────────
export const wordRevealContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

export const wordReveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

// ─── Progress Bar Fill ─────────────────────────
export const progressFill: Variants = {
  hidden: { width: '0%' },
  visible: (custom: number) => ({
    width: `${custom}%`,
    transition: { duration: 1, ease: 'easeOut', delay: 0.3 },
  }),
};

// ─── Shake ─────────────────────────────────────
export const shake: Variants = {
  shake: {
    x: [0, -10, 10, -10, 10, -5, 5, 0],
    transition: { duration: 0.5 },
  },
};

// ─── Heatmap Cell ──────────────────────────────
export const heatmapCell: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: (custom: { delay: number }) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: custom.delay, duration: 0.2 },
  }),
};

// ─── Spin ──────────────────────────────────────
export const spinAnimation = {
  animate: { rotate: 360 },
  transition: { duration: 1, repeat: Infinity, ease: 'linear' as const },
};
