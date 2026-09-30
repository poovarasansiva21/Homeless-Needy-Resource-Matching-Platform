import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initLenis, setupScrollReveals, cleanupLenisAndScrollTriggers } from './cinematicMotion';

export const useCinematicAnimation = () => {
  const location = useLocation();

  useEffect(() => {
    // 1. Initialize Lenis Smooth Scroll
    const lenis = initLenis();

    // 2. Setup GSAP ScrollTrigger Reveals
    const cleanupReveals = setupScrollReveals();

    // 3. Scroll to top on route change if no hash
    if (!location.hash && lenis) {
      lenis.scrollTo(0, { immediate: true });
    }

    return () => {
      cleanupReveals();
      cleanupLenisAndScrollTriggers();
    };
  }, [location.pathname]);
};

export default useCinematicAnimation;
