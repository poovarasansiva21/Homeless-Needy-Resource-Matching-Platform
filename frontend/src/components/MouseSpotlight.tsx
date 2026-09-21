import React, { useEffect, useState } from 'react';

export const MouseSpotlight: React.FC = () => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Check for pointer precision and reduced motion preference
    const mediaFine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const mediaReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateEligibility = () => {
      setIsEnabled(mediaFine.matches && !mediaReduced.matches);
    };

    updateEligibility();
    mediaFine.addEventListener('change', updateEligibility);
    mediaReduced.addEventListener('change', updateEligibility);

    let rafId: number;
    const handlePointerMove = (e: PointerEvent) => {
      if (!isEnabled) return;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setPosition({ x: e.clientX, y: e.clientY });
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      mediaFine.removeEventListener('change', updateEligibility);
      mediaReduced.removeEventListener('change', updateEligibility);
    };
  }, [isEnabled]);

  if (!isEnabled || !position) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
      style={{
        background: `radial-gradient(650px circle at ${position.x}px ${position.y}px, rgba(25, 173, 102, 0.06), transparent 75%)`,
      }}
      aria-hidden="true"
    />
  );
};

export default MouseSpotlight;
