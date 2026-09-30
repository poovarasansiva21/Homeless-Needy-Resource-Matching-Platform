import React, { useEffect, useState } from 'react';
import gsap from 'gsap';
import { isReducedMotion } from '../animation/cinematicMotion';

export const ScrollProgressBar: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || isReducedMotion()) return;

    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div 
      aria-hidden="true" 
      className="fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none bg-transparent overflow-hidden"
    >
      <div 
        className="h-full bg-gradient-to-r from-[#F25C38] via-amber-500 to-[#E04925] transition-transform duration-75 ease-out origin-left"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
};

export default ScrollProgressBar;
