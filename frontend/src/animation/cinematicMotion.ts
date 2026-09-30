import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;

export const isReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const isMobileViewport = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

/**
 * Initialize Lenis Smooth Scrolling and sync with GSAP ScrollTrigger
 */
export const initLenis = (): Lenis | null => {
  if (typeof window === 'undefined') return null;

  if (isReducedMotion()) {
    return null;
  }

  if (lenisInstance) {
    lenisInstance.destroy();
  }

  lenisInstance = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.5,
  });

  lenisInstance.on('scroll', () => {
    ScrollTrigger.update();
  });

  const updateRaf = (time: number) => {
    lenisInstance?.raf(time * 1000);
  };

  gsap.ticker.add(updateRaf);
  gsap.ticker.lagSmoothing(0);

  return lenisInstance;
};

export const getLenis = (): Lenis | null => lenisInstance;

/**
 * Setup global ScrollTrigger reveal animations for sections, cards, text, map & images
 */
export const setupScrollReveals = (scopeElement: HTMLElement | null = null): (() => void) => {
  if (typeof window === 'undefined' || isReducedMotion()) return () => {};

  const root = scopeElement || document.body;

  const ctx = gsap.context(() => {
    const isMobile = isMobileViewport();

    // 1. Generic Section & Container Reveals
    const sections = root.querySelectorAll<HTMLElement>(
      'section, [data-scroll-reveal]'
    );
    sections.forEach((sec) => {
      // Don't override hero section load animation
      if (sec.id === 'hero' || sec.closest('[data-hero-container]')) return;

      gsap.fromTo(
        sec,
        {
          opacity: 0,
          y: isMobile ? 25 : 50,
          scale: 0.97,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sec,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // 2. Sequential Card Stagger Animations (Resource Cards, Stats, Features, NGO/Donor Cards)
    const cardContainers = root.querySelectorAll<HTMLElement>(
      '.grid, [data-card-grid], .card-container'
    );

    cardContainers.forEach((grid) => {
      const cards = grid.querySelectorAll<HTMLElement>(
        '.charity-card, .glass-card, [data-card], .resource-card, article'
      );

      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          {
            opacity: 0,
            y: isMobile ? 20 : 40,
            scale: 0.97,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            stagger: isMobile ? 0.05 : 0.09,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: grid,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    });

    // 3. Image Parallax Scrolling
    if (!isMobile) {
      const parallaxImages = root.querySelectorAll<HTMLElement>('img, [data-parallax]');
      parallaxImages.forEach((img) => {
        // Exclude small inline icons and logos
        if (
          img.clientWidth < 80 ||
          img.classList.contains('w-3') ||
          img.classList.contains('w-4') ||
          img.classList.contains('w-5') ||
          img.classList.contains('w-6')
        ) return;

        gsap.fromTo(
          img,
          { y: -30 },
          {
            y: 30,
            ease: 'none',
            scrollTrigger: {
              trigger: img.parentElement || img,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1,
            },
          }
        );
      });
    }

    // 4. Headings & Typography Line/Clip Reveals
    const headings = root.querySelectorAll<HTMLElement>('h1, h2, h3, [data-text-reveal]');
    headings.forEach((heading) => {
      if (heading.closest('#hero')) return;

      gsap.fromTo(
        heading,
        {
          opacity: 0,
          y: isMobile ? 18 : 35,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)',
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: heading,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // 5. Leaflet Map Container & Marker Entrance
    const mapElements = root.querySelectorAll<HTMLElement>('.leaflet-container, [data-map-container]');
    mapElements.forEach((mapEl) => {
      gsap.fromTo(
        mapEl,
        {
          opacity: 0,
          scale: 0.97,
          y: 30,
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.9,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: mapEl,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // 6. Horizontal Scroll Sections (if present in resource rows or sliders)
    const horizontalSections = root.querySelectorAll<HTMLElement>('[data-horizontal-scroll]');
    horizontalSections.forEach((hSec) => {
      const track = hSec.querySelector<HTMLElement>('[data-horizontal-track]');
      if (track) {
        const scrollAmount = track.scrollWidth - hSec.clientWidth;
        if (scrollAmount > 0) {
          gsap.to(track, {
            x: -scrollAmount,
            ease: 'none',
            scrollTrigger: {
              trigger: hSec,
              start: 'top center',
              end: () => `+=${scrollAmount}`,
              scrub: 1,
              pin: true,
            },
          });
        }
      }
    });

    ScrollTrigger.refresh();
  }, root);

  return () => ctx.revert();
};

/**
 * Clean up triggers and destroy Lenis instance
 */
export const cleanupLenisAndScrollTriggers = () => {
  ScrollTrigger.getAll().forEach((st) => st.kill());
  if (lenisInstance) {
    lenisInstance.destroy();
    lenisInstance = null;
  }
};
