/**
 * TaxSathi AI — Scroll-Triggered Animation Hook
 * Uses IntersectionObserver to trigger Framer Motion animations when elements enter the viewport.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseScrollAnimationOptions {
  /** Viewport threshold (0–1) at which the animation triggers. Default: 0.15 */
  threshold?: number;
  /** Root margin for early/late triggering. Default: '0px 0px -50px 0px' */
  rootMargin?: string;
  /** If true, the animation only fires once. Default: true */
  triggerOnce?: boolean;
  /** Delay (ms) after intersection before setting `isVisible`. Default: 0 */
  delay?: number;
}

/**
 * Returns a ref to attach to the element and a boolean `isVisible` that becomes
 * `true` when the element scrolls into view.
 *
 * @example
 * ```tsx
 * const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });
 *
 * return (
 *   <motion.div
 *     ref={ref}
 *     variants={fadeInUp}
 *     initial="hidden"
 *     animate={isVisible ? 'visible' : 'hidden'}
 *   >
 *     Content
 *   </motion.div>
 * );
 * ```
 */
export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
) {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -50px 0px',
    triggerOnce = true,
    delay = 0,
  } = options;

  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => setIsVisible(true), delay);
          } else {
            setIsVisible(true);
          }

          if (triggerOnce) {
            observer.unobserve(entry.target);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      });
    },
    [triggerOnce, delay]
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersection, threshold, rootMargin]);

  return { ref, isVisible };
}

/**
 * Convenience hook — same API but returns props that spread directly onto
 * a `motion.*` component.
 *
 * @example
 * ```tsx
 * const scrollProps = useScrollMotion({ threshold: 0.3 });
 *
 * return (
 *   <motion.section variants={fadeInUp} {...scrollProps}>
 *     Section content
 *   </motion.section>
 * );
 * ```
 */
export function useScrollMotion<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
) {
  const { ref, isVisible } = useScrollAnimation<T>(options);

  return {
    ref,
    initial: 'hidden' as const,
    animate: isVisible ? ('visible' as const) : ('hidden' as const),
  };
}

export default useScrollAnimation;
