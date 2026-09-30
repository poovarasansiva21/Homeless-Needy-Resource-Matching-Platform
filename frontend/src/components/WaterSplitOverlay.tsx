import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface WaterSplitOverlayProps {
  isDarkTarget: boolean;
  clickCoords: { x: number; y: number } | null;
  onComplete: () => void;
}

export const WaterSplitOverlay: React.FC<WaterSplitOverlayProps> = ({
  isDarkTarget,
  clickCoords,
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<SVGSVGElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);
  const rippleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!containerRef.current || !circleRef.current) return;

    const x = clickCoords?.x ?? window.innerWidth / 2;
    const y = clickCoords?.y ?? window.innerHeight / 2;

    // Calculate max radius needed to cover entire screen from click point
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const tl = gsap.timeline({
      onComplete: () => {
        onComplete();
      },
    });

    // 1. Initial liquid water wave drop expansion
    tl.fromTo(
      circleRef.current,
      {
        cx: x,
        cy: y,
        r: 0,
        opacity: 0.95,
      },
      {
        r: maxRadius * 1.25,
        opacity: 1,
        duration: 0.65,
        ease: 'power3.inOut',
      }
    );

    // 2. Secondary water ripple ring split effect
    if (rippleRef.current) {
      tl.fromTo(
        rippleRef.current,
        {
          cx: x,
          cy: y,
          r: 0,
          opacity: 0.8,
          strokeWidth: 20,
        },
        {
          r: maxRadius * 0.9,
          opacity: 0,
          strokeWidth: 2,
          duration: 0.55,
          ease: 'power2.out',
        },
        '-=0.55'
      );
    }

    // 3. Smooth fade out of overlay container after theme swap completes
    tl.to(
      containerRef.current,
      {
        opacity: 0,
        duration: 0.25,
        ease: 'power1.out',
      },
      '-=0.15'
    );

    return () => {
      tl.kill();
    };
  }, [clickCoords, isDarkTarget, onComplete]);

  const targetBgColor = isDarkTarget ? '#0D0D0D' : '#F9F6F0';
  const rippleColor = isDarkTarget ? '#F25C38' : '#159B5B';

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 z-[99999] pointer-events-none overflow-hidden"
    >
      <svg
        ref={waveRef}
        className="w-full h-full"
        viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="water-fluid-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="fluid-goo"
            />
          </filter>
        </defs>

        <g filter="url(#water-fluid-blur)">
          {/* Main Expanding Liquid Water Fill */}
          <circle
            ref={circleRef}
            fill={targetBgColor}
            cx={clickCoords?.x ?? window.innerWidth / 2}
            cy={clickCoords?.y ?? window.innerHeight / 2}
            r="0"
          />

          {/* Liquid Water Ripple Split Outer Ring */}
          <circle
            ref={rippleRef}
            fill="none"
            stroke={rippleColor}
            strokeWidth="10"
            cx={clickCoords?.x ?? window.innerWidth / 2}
            cy={clickCoords?.y ?? window.innerHeight / 2}
            r="0"
          />
        </g>
      </svg>
    </div>
  );
};

export default WaterSplitOverlay;
