import React, { useState, useEffect, useRef } from 'react';
import { isReducedMotion } from '../animation/cinematicMotion';

interface AnimatedCounterProps {
  value: number;
  duration?: number; // ms
  prefix?: string;
  suffix?: string;
  className?: string;
  formatter?: (val: number) => string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1200,
  prefix = '',
  suffix = '',
  className = '',
  formatter,
}) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isReducedMotion()) {
      setCount(value);
      setHasAnimated(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let startTimestamp: number | null = null;
          const startValue = 0;
          const endValue = value;

          const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);

            // Easing function: easeOutCubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.floor(startValue + (endValue - startValue) * easeProgress);

            setCount(currentVal);

            if (progress < 1) {
              window.requestAnimationFrame(step);
            } else {
              setCount(endValue);
            }
          };

          window.requestAnimationFrame(step);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [value, duration, hasAnimated]);

  const displayVal = formatter ? formatter(count) : count.toLocaleString();

  return (
    <span ref={ref} className={className}>
      {prefix}{displayVal}{suffix}
    </span>
  );
};

export default AnimatedCounter;
