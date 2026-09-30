import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { isReducedMotion } from './cinematicMotion';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || isReducedMotion()) return;

    gsap.fromTo(
      containerRef.current,
      { opacity: 0, x: 28, y: 10 },
      { opacity: 1, x: 0, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform' }
    );
  }, [location.pathname]);

  return (
    <div ref={containerRef} className="w-full flex-1 flex flex-col min-h-0">
      {children}
    </div>
  );
};

export default PageTransition;
