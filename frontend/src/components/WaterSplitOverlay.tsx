import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface WaterSplitOverlayProps {
  isDarkTarget: boolean;
  clickCoords: { x: number; y: number } | null;
  onComplete: () => void;
}

/**
 * Generates an organic fluid liquid blob path centered at (cx, cy) with radius r & distortion multiplier
 */
const generateLiquidBlobPath = (cx: number, cy: number, r: number, distortionFactor = 1.0): string => {
  if (r <= 0) return `M ${cx} ${cy} Z`;
  const pointsCount = 8;
  const distortionOffsets = [1.0, 1.28 * distortionFactor, 0.85 * distortionFactor, 1.22 * distortionFactor, 0.9 * distortionFactor, 1.32 * distortionFactor, 0.88 * distortionFactor, 1.15 * distortionFactor];

  const points: Array<[number, number]> = [];
  for (let i = 0; i < pointsCount; i++) {
    const angle = (i / pointsCount) * Math.PI * 2;
    const dist = r * distortionOffsets[i % distortionOffsets.length];
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    points.push([px, py]);
  }

  let path = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const p0 = points[(i - 1 + points.length) % points.length];
    const p3 = points[(i + 2) % points.length];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  path += ' Z';
  return path;
};

export const WaterSplitOverlay: React.FC<WaterSplitOverlayProps> = ({
  isDarkTarget,
  clickCoords,
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const blobPath1Ref = useRef<SVGPathElement>(null);
  const blobPath2Ref = useRef<SVGPathElement>(null);
  const rippleCircleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!containerRef.current || !blobPath1Ref.current) return;

    const x = clickCoords?.x ?? window.innerWidth / 2;
    const y = clickCoords?.y ?? window.innerHeight / 2;

    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    ) * 1.35;

    const tl = gsap.timeline({
      onComplete: () => {
        onComplete();
      },
    });

    const progressObj = { radius: 0, distortion: 1.4 };

    // 1. Fluid Liquid Blob Morph Expansion with GSAP update loop
    tl.to(progressObj, {
      radius: maxRadius,
      distortion: 1.0,
      duration: 0.7,
      ease: 'power3.inOut',
      onUpdate: () => {
        if (blobPath1Ref.current) {
          const d1 = generateLiquidBlobPath(x, y, progressObj.radius, progressObj.distortion);
          blobPath1Ref.current.setAttribute('d', d1);
        }
        if (blobPath2Ref.current) {
          const d2 = generateLiquidBlobPath(x, y, progressObj.radius * 0.85, progressObj.distortion * 1.2);
          blobPath2Ref.current.setAttribute('d', d2);
        }
      },
    });

    // 2. Secondary Liquid Wave Palette Distortion Ring
    if (rippleCircleRef.current) {
      tl.fromTo(
        rippleCircleRef.current,
        {
          cx: x,
          cy: y,
          r: 0,
          opacity: 0.85,
          strokeWidth: 24,
        },
        {
          r: maxRadius * 0.9,
          opacity: 0,
          strokeWidth: 2,
          duration: 0.6,
          ease: 'power2.out',
        },
        '-=0.6'
      );
    }

    // 3. Smooth Fade Out of Overlay Container after Palette Transition Complete
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
  const targetAccentColor = isDarkTarget ? '#F25C38' : '#159B5B';

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 z-[99999] pointer-events-none overflow-hidden gpu-accelerated"
    >
      <svg
        className="w-full h-full"
        viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Organic Gooey Liquid Turbulence Filter */}
          <filter id="liquid-blob-goo-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>

          {/* Smooth Palette Fluid Gradient */}
          <radialGradient id="liquid-palette-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={targetAccentColor} stopOpacity="0.4" />
            <stop offset="60%" stopColor={targetBgColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor={targetBgColor} stopOpacity="1" />
          </radialGradient>
        </defs>

        <g filter="url(#liquid-blob-goo-filter)">
          {/* Layer 1: Outer Morphing Organic Fluid Liquid Blob */}
          <path
            ref={blobPath1Ref}
            fill="url(#liquid-palette-gradient)"
            d=""
          />

          {/* Layer 2: Inner Accent Morphing Liquid Blob */}
          <path
            ref={blobPath2Ref}
            fill={targetBgColor}
            d=""
            opacity="0.9"
          />

          {/* Layer 3: Liquid Wave Ripple Split Ring */}
          <circle
            ref={rippleCircleRef}
            fill="none"
            stroke={targetAccentColor}
            strokeWidth="12"
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
