/**
 * TaxSathi AI — Reusable Transition Configs
 * Spring, tween, and easing presets for consistent motion throughout the app.
 */

import type { Transition } from 'framer-motion';

// ─── Spring Presets ────────────────────────────

/** Default spring — snappy and responsive */
export const springDefault: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
};

/** Bouncy spring — fun and playful */
export const springBouncy: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 15,
};

/** Gentle spring — soft and elegant */
export const springGentle: Transition = {
  type: 'spring',
  stiffness: 150,
  damping: 25,
};

/** Stiff spring — fast entry */
export const springStiff: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
};

/** Molasses spring — slow and dramatic */
export const springMolasses: Transition = {
  type: 'spring',
  stiffness: 100,
  damping: 30,
  mass: 1.5,
};

// ─── Tween Presets ─────────────────────────────

/** Quick tween — for instant UI feedback */
export const tweenFast: Transition = {
  type: 'tween',
  duration: 0.15,
  ease: 'easeOut',
};

/** Standard tween — general animations */
export const tweenDefault: Transition = {
  type: 'tween',
  duration: 0.3,
  ease: 'easeInOut',
};

/** Slow tween — dramatic reveals */
export const tweenSlow: Transition = {
  type: 'tween',
  duration: 0.6,
  ease: 'easeOut',
};

/** Smooth ease-in-out for page-level animations */
export const tweenPage: Transition = {
  type: 'tween',
  duration: 0.35,
  ease: [0.25, 0.1, 0.25, 1], // custom cubic-bezier
};

// ─── Stagger Presets ───────────────────────────

/** Create a stagger transition with configurable delay */
export function staggerTransition(
  staggerDelay = 0.08,
  initialDelay = 0.1
): Transition {
  return {
    staggerChildren: staggerDelay,
    delayChildren: initialDelay,
  };
}

// ─── Delay Helpers ─────────────────────────────

/** Add delay to any transition */
export function withDelay(transition: Transition, delay: number): Transition {
  return { ...transition, delay };
}

/** Create a repeated animation */
export function repeatForever(transition: Transition): Transition {
  return { ...transition, repeat: Infinity };
}

/** Create a yoyo repeat animation */
export function repeatYoyo(transition: Transition, count = Infinity): Transition {
  return { ...transition, repeat: count, repeatType: 'reverse' as const };
}

// ─── Composite Presets ─────────────────────────

/** Hover lift — smooth upward motion on hover */
export const hoverLift = {
  y: -4,
  transition: springGentle,
};

/** Press down — subtle press feedback */
export const pressDown = {
  scale: 0.97,
  transition: tweenFast,
};

/** Glow pulse — for status indicators */
export const glowPulse: Transition = {
  duration: 2,
  repeat: Infinity,
  ease: 'easeInOut',
};

/** Entrance from below with overshoot */
export const entranceSpring: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 22,
  delay: 0.1,
};

/** Exit upward — for page exits */
export const exitUp: Transition = {
  type: 'tween',
  duration: 0.25,
  ease: 'easeIn',
};
