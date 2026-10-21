/**
 * TaxSathi AI — Animation Variants (HyperFrames Motion Doctrine)
 *
 * Motion law:
 *  - Cut-the-curve: page transitions use +-230px partial travel,
 *    mirrored power4.in (exit) / power4.out (entry) eases — velocity matched.
 *  - Waterfall entry §6: binary 0→1 opacity snap, Y from below, expo.out snap.
 *  - Nudge curve §7: 3-phase ramp/burst/tail via keyframe approximation.
 *  - Z variants: zoom-through §1 (growing=push) / inverse §2 (shrinking=pull).
 *  - Vector law: film current = LEFT. Other directions reserved for meaning.
 */
import type { Variants } from 'framer-motion';

// HyperFrames Custom Easings (GSAP power4/expo approximated in Framer cubic-bezier)
// power4.in  ≈ [0.9, 0, 1, 1]    — slow start, hard acceleration
// power4.out ≈ [0, 0, 0.1, 1]    — hard initial velocity, long settle
// expo.out   ≈ [0.16, 1, 0.3, 1] — instant snap, long feather-tail
const P4I  = [0.9, 0, 1, 1]    as const;
const P4O  = [0, 0, 0.1, 1]    as const;
const EXPO = [0.16, 1, 0.3, 1] as const;
const P3I  = [0.55, 0, 1, 0.45] as const;

// Partial travel ~12% of 1920 = 230px (cut-the-curve rule)
const T = 230;

// --- Page Transitions: Cut-the-Curve (Leftward current) -------------------
// Exit accelerates leftward (power4.in), fades at ~25% of travel.
// Entry arrives from right at 0.35 opacity mid-path (not a pop), decelerates (power4.out).
export const pageVariants: Variants = {
  initial: { opacity: 0.35, x:  T },
  animate: {
    opacity: 1, x: 0,
    transition: {
      opacity: { duration: 0.28, ease: EXPO },
      x:       { duration: 0.34, ease: P4O },
    },
  },
  exit: {
    opacity: 0, x: -T,
    transition: {
      opacity: { duration: 0.18, ease: 'linear' as const },
      x:       { duration: 0.30, ease: P4I },
    },
  },
};

export const pageTransition = { type: 'tween' as const, duration: 0.34 };

// --- Fade In (section headings, isolated reveals) -------------------------
export const fadeInUp: Variants = {
  hidden:  { opacity: 0, y: 48 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EXPO } },
};
export const fadeInDown: Variants = {
  hidden:  { opacity: 0, y: -32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EXPO } },
};
export const fadeInLeft: Variants = {
  hidden:  { opacity: 0.35, x: 40 },
  visible: { opacity: 1,    x: 0,  transition: { duration: 0.38, ease: P4O } },
};
export const fadeInRight: Variants = {
  hidden:  { opacity: 0.35, x: -40 },
  visible: { opacity: 1,    x: 0,  transition: { duration: 0.38, ease: P4O } },
};

// --- Stagger Containers ---------------------------------------------------
// Container stays opaque (stage ground law — no container opacity animation).
export const staggerContainer: Variants = {
  hidden:  { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.09, delayChildren: 0.06 } },
};
export const staggerContainerFast: Variants = {
  hidden:  { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

// --- Waterfall Entry §6 (weight variants) ---------------------------------
// Binary opacity (duration 0.001 = instant set, not tween). expo.out Y snap.
export const staggerItem: Variants = {
  hidden:  { opacity: 0, y: 46 },
  visible: {
    opacity: 1, y: 0,
    transition: { opacity: { duration: 0.001 }, y: { duration: 0.16, ease: EXPO } },
  },
};
export const staggerItemHeavy: Variants = {
  hidden:  { opacity: 0, y: 72 },
  visible: {
    opacity: 1, y: 0,
    transition: { opacity: { duration: 0.001 }, y: { duration: 0.20, ease: EXPO } },
  },
};
export const staggerItemLight: Variants = {
  hidden:  { opacity: 0, y: 32 },
  visible: {
    opacity: 1, y: 0,
    transition: { opacity: { duration: 0.001 }, y: { duration: 0.12, ease: EXPO } },
  },
};

// --- Chat Bubbles (horizontal arrivals) -----------------------------------
export const chatBubbleUser: Variants = {
  hidden:  { opacity: 0, x: 40, scale: 0.97 },
  visible: {
    opacity: 1, x: 0, scale: 1,
    transition: {
      opacity: { duration: 0.001 },
      x:       { duration: 0.18, ease: EXPO },
      scale:   { duration: 0.18, ease: EXPO },
    },
  },
};
export const chatBubbleAI: Variants = {
  hidden:  { opacity: 0, x: -40, scale: 0.97 },
  visible: {
    opacity: 1, x: 0, scale: 1,
    transition: {
      opacity: { duration: 0.001 },
      x:       { duration: 0.18, ease: EXPO },
      scale:   { duration: 0.18, ease: EXPO },
    },
  },
};

// --- Typing Indicator (purposeful idle motion — 6px not 8px) -------------
export const typingDot: Variants = {
  animate: {
    y: [0, -6, 0],
    transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

// --- Card Hover -----------------------------------------------------------
export const cardHover: Variants = {
  rest:  { y: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  hover: {
    y: -5, boxShadow: '0 16px 48px rgba(99,102,241,0.22)',
    transition: { duration: 0.28, ease: EXPO },
  },
};

// --- Button Interactions --------------------------------------------------
export const scaleTap = {
  whileHover: { scale: 1.04, transition: { duration: 0.20, ease: EXPO } },
  whileTap:   { scale: 0.96, transition: { duration: 0.08, ease: 'linear' as const } },
};
export const buttonTap = {
  whileHover: {
    scale: 1.03,
    boxShadow: '0 0 32px rgba(99,102,241,0.45)',
    transition: { duration: 0.22, ease: EXPO },
  },
  whileTap: { scale: 0.97, transition: { duration: 0.08, ease: 'linear' as const } },
};

// --- Modal — Inverse Zoom §2 (payoff beat, Z backward arrival) ------------
// Arrives oversized (1.06) retracts to focal plane. Exit recedes to 0.95.
export const modalOverlay: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22, ease: 'linear' as const } },
  exit:    { opacity: 0, transition: { duration: 0.18, ease: 'linear' as const } },
};
export const modalContent: Variants = {
  hidden:  { opacity: 0.15, scale: 1.06, filter: 'blur(8px)' },
  visible: {
    opacity: 1, scale: 1, filter: 'blur(0px)',
    transition: {
      opacity: { duration: 0.5, ease: EXPO },
      scale:   { duration: 0.5, ease: EXPO },
      filter:  { duration: 0.5, ease: EXPO },
    },
  },
  exit: {
    opacity: 0, scale: 0.95, filter: 'blur(4px)',
    transition: {
      opacity: { duration: 0.18, ease: P4I },
      scale:   { duration: 0.18, ease: P4I },
    },
  },
};

// --- Sidebar (leftward slide — the current) -------------------------------
export const sidebarVariants: Variants = {
  closed: {
    x: -280, opacity: 0.35,
    transition: { duration: 0.28, ease: P4I },
  },
  open: {
    x: 0, opacity: 1,
    transition: {
      x:       { duration: 0.34, ease: P4O },
      opacity: { duration: 0.22, ease: EXPO },
    },
  },
};

// --- Navbar (downward entry — elevation = reveals from above) -------------
export const navbarVariants: Variants = {
  visible: { y: 0,   opacity: 1, transition: { duration: 0.34, ease: EXPO } },
  hidden:  { y: -80, opacity: 0, transition: { duration: 0.22, ease: P4I } },
};

// --- Counter (inverse zoom arrival — payoff beat) -------------------------
export const counterVariants: Variants = {
  hidden:  { opacity: 0.15, scale: 1.05 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EXPO } },
};

// --- Accordion / Expand --------------------------------------------------
export const expandVariants: Variants = {
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  expanded: {
    height: 'auto', opacity: 1,
    transition: {
      height:  { duration: 0.30, ease: P4O },
      opacity: { duration: 0.22, ease: EXPO, delay: 0.06 },
    },
  },
};

// --- Notification Badge (minimal idle — motion must perform, not breathe) -
export const badgePulse: Variants = {
  animate: {
    scale: [1, 1.12, 1],
    transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// --- Suggestion Chips §6 Waterfall Entry ---------------------------------
export const chipStagger: Variants = {
  hidden:  { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.28 } },
};
export const chipItem: Variants = {
  hidden:  { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { opacity: { duration: 0.001 }, y: { duration: 0.14, ease: EXPO } },
  },
};

// --- Table Row (leftward waterfall) ---------------------------------------
export const tableRowStagger: Variants = {
  hidden:  { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
export const tableRowItem: Variants = {
  hidden:  { opacity: 0, x: -40 },
  visible: {
    opacity: 1, x: 0,
    transition: { opacity: { duration: 0.001 }, x: { duration: 0.14, ease: P4O } },
  },
};

// --- Timeline (upward cascade — elevation = conclusion rises) ------------
export const timelineContainer: Variants = {
  hidden:  { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};
export const timelineItem: Variants = {
  hidden:  { opacity: 0, y: 40 },
  visible: {
    opacity: 1, y: 0,
    transition: { opacity: { duration: 0.001 }, y: { duration: 0.18, ease: EXPO } },
  },
};

// --- Hero Word Reveal §6 Waterfall Entry ---------------------------------
// Words whip from below, shrinking gaps, binary opacity snap.
export const wordRevealContainer: Variants = {
  hidden:  { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.065, delayChildren: 0.1 } },
};
export const wordReveal: Variants = {
  hidden:  { opacity: 0, y: 48 },
  visible: {
    opacity: 1, y: 0,
    transition: { opacity: { duration: 0.001 }, y: { duration: 0.16, ease: EXPO } },
  },
};

// --- Progress Bar (nudge curve §7 approximation) -------------------------
// Keyframe times: 0% ramp (implicit) / 65% burst / 25% tail.
export const progressFill: Variants = {
  hidden: { width: '0%', opacity: 0 },
  visible: (custom: number) => ({
    width: ['0%', `${custom * 0.65}%`, `${custom}%`],
    opacity: 1,
    transition: {
      width:   { duration: 1.1, ease: P4O, delay: 0.25, times: [0, 0.28, 1] },
      opacity: { duration: 0.001, delay: 0.25 },
    },
  }),
};

// --- Shake (error feedback) ----------------------------------------------
export const shake: Variants = {
  shake: {
    x: [0, -10, 10, -10, 10, -5, 5, 0],
    transition: { duration: 0.5 },
  },
};

// --- Heatmap Cell -------------------------------------------------------
export const heatmapCell: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: (custom: { delay: number }) => ({
    opacity: 1, scale: 1,
    transition: { delay: custom.delay, duration: 0.14, ease: EXPO },
  }),
};

// --- Spin ---------------------------------------------------------------
export const spinAnimation = {
  animate:    { rotate: 360 },
  transition: { duration: 1, repeat: Infinity, ease: 'linear' as const },
};

// --- Zoom-Through §1 (Z forward, within-scene text swap) ----------------
// Growing = push toward camera. Use to progress deeper into same thought.
export const zoomThroughExit: Variants = {
  hidden: { scale: 1,    filter: 'blur(0px)', opacity: 1 },
  exit:   {
    scale: 1.2, filter: 'blur(10px)', opacity: 0,
    transition: {
      scale:   { duration: 0.2, ease: P3I },
      filter:  { duration: 0.2, ease: P3I },
      opacity: { duration: 0.2, ease: 'linear' as const },
    },
  },
};
export const zoomThroughEntry: Variants = {
  hidden:  { scale: 0.75, filter: 'blur(10px)', opacity: 0.15 },
  visible: { scale: 1, filter: 'blur(0px)', opacity: 1, transition: { duration: 0.5, ease: EXPO } },
};

// --- Inverse Zoom-Through §2 (Z backward, arrival/payoff) ---------------
// Shrinking = pull from camera. Spend on ARRIVAL beats only.
export const inverseZoomEntry: Variants = {
  hidden:  { scale: 1.25, filter: 'blur(10px)', opacity: 0.15 },
  visible: { scale: 1, filter: 'blur(0px)', opacity: 1, transition: { duration: 0.5, ease: EXPO } },
};
