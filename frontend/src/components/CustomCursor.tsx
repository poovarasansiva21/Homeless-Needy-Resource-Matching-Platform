import React, { useEffect, useState, useRef } from 'react';

export const CustomCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [cursorText, setCursorText] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const posRef = useRef({ x: -100, y: -100 });
  const followerPosRef = useRef({ x: -100, y: -100 });

  useEffect(() => {
    // Media query checks for desktop mouse pointer & reduced motion preference
    const mediaFine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const mediaReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateEligibility = () => {
      setIsEnabled(mediaFine.matches && !mediaReduced.matches);
    };

    updateEligibility();
    mediaFine.addEventListener('change', updateEligibility);
    mediaReduced.addEventListener('change', updateEligibility);

    let animationFrameId: number;

    const handlePointerMove = (e: PointerEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };

      // Check if target or parent has interactive cursor attributes
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactiveEl = target.closest('button, a, [data-cursor], input, select, textarea');
        if (interactiveEl) {
          setIsHovered(true);
          const cursorAttr = interactiveEl.getAttribute('data-cursor');
          setCursorText(cursorAttr || '');
        } else {
          setIsHovered(false);
          setCursorText('');
        }
      }
    };

    // Smooth lerp loop for the follower circle
    const loop = () => {
      followerPosRef.current.x += (posRef.current.x - followerPosRef.current.x) * 0.18;
      followerPosRef.current.y += (posRef.current.y - followerPosRef.current.y) * 0.18;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (followerRef.current) {
        followerRef.current.style.transform = `translate3d(${followerPosRef.current.x}px, ${followerPosRef.current.y}px, 0) translate(-50%, -50%)`;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      mediaFine.removeEventListener('change', updateEligibility);
      mediaReduced.removeEventListener('change', updateEligibility);
    };
  }, []);

  if (!isEnabled) return null;

  return (
    <>
      {/* Small precise cursor dot */}
      <div
        ref={dotRef}
        className={`pointer-events-none fixed top-0 left-0 z-[9999] rounded-full bg-[#D97732] transition-transform duration-75 ease-out ${
          isHovered ? 'w-2 h-2 opacity-60' : 'w-2.5 h-2.5 opacity-90'
        }`}
        style={{ willChange: 'transform' }}
      />

      {/* Trailing follower circle / badge */}
      <div
        ref={followerRef}
        className={`pointer-events-none fixed top-0 left-0 z-[9998] flex items-center justify-center rounded-full border border-[#D97732]/50 bg-[#D97732]/10 backdrop-blur-[1px] transition-[width,height,background-color,border-color,opacity] duration-300 ${
          isHovered
            ? cursorText
              ? 'w-16 h-16 bg-[#3B2418]/90 border-[#D97732] text-white shadow-lg'
              : 'w-12 h-12 bg-[#D97732]/20 border-[#D97732]'
            : 'w-8 h-8 bg-transparent border-[#D97732]/40'
        }`}
        style={{ willChange: 'transform' }}
      >
        {cursorText && (
          <span className="text-[9px] font-black uppercase tracking-widest text-[#D97732] animate-in fade-in">
            {cursorText}
          </span>
        )}
      </div>
    </>
  );
};

export default CustomCursor;
