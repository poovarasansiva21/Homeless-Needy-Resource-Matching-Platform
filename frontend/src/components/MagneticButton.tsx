import React, { useRef, useState, useEffect } from 'react';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  maxDistance?: number;
  className?: string;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  maxDistance = 6,
  className = '',
  ...props
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isReduced, setIsReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReduced(media.matches);
    const handler = (e: MediaQueryListEvent) => setIsReduced(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isReduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * 0.18;
    const deltaY = (e.clientY - centerY) * 0.18;

    const clampedX = Math.max(-maxDistance, Math.min(maxDistance, deltaX));
    const clampedY = Math.max(-maxDistance, Math.min(maxDistance, deltaY));

    setOffset({ x: clampedX, y: clampedY });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  return (
    <button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: !isReduced ? `translate3d(${offset.x}px, ${offset.y}px, 0)` : undefined,
        transition: offset.x === 0 && offset.y === 0 ? 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'transform 0.08s ease-out',
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
};

export default MagneticButton;
