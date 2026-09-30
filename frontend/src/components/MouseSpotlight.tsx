import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export const MouseSpotlight: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const mediaFine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const mediaReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateEligibility = () => {
      setIsEnabled(mediaFine.matches && !mediaReduced.matches);
    };

    updateEligibility();
    mediaFine.addEventListener('change', updateEligibility);
    mediaReduced.addEventListener('change', updateEligibility);

    if (!mediaFine.matches || mediaReduced.matches) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let rafId: number;

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const animate = () => {
      // Smooth lerp (0.15 factor) for fluid organic motion
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;

      if (containerRef.current) {
        containerRef.current.style.background = `radial-gradient(650px circle at ${currentX}px ${currentY}px, rgba(242, 92, 56, 0.07), transparent 75%)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      mediaFine.removeEventListener('change', updateEligibility);
      mediaReduced.removeEventListener('change', updateEligibility);
    };
  }, []);

  if (!isEnabled) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 gpu-accelerated"
      aria-hidden="true"
    />
  );
};

export default MouseSpotlight;
