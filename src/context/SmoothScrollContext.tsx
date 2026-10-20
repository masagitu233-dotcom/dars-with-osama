import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import AOS from 'aos';

gsap.registerPlugin(ScrollTrigger);

interface SmoothScrollContextType {
  lenis: Lenis | null;
  velocity: number;
  scrollTo: (target: string | HTMLElement | number, options?: any) => void;
  refreshScrollTrigger: () => void;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({
  lenis: null,
  velocity: 0,
  scrollTo: () => {},
  refreshScrollTrigger: () => {},
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

interface ProviderProps {
  children: React.ReactNode;
  currentView?: string;
}

export const SmoothScrollProvider: React.FC<ProviderProps> = ({ children, currentView }) => {
  const lenisRef = useRef<Lenis | null>(null);
  const [velocity, setVelocity] = useState(0);

  useEffect(() => {
    // Respect user prefers-reduced-motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
    });

    lenisRef.current = lenis;

    // Connect Lenis with GSAP ScrollTrigger
    lenis.on('scroll', (e: any) => {
      ScrollTrigger.update();
      if (typeof e.velocity === 'number') {
        setVelocity(e.velocity);
      }
    });

    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // When view route changes, scroll to saved history scrollY (or 0 on new forward views) and refresh ScrollTrigger
  useEffect(() => {
    const savedScrollY =
      typeof window !== 'undefined' &&
      window.history.state &&
      typeof window.history.state.scrollY === 'number'
        ? window.history.state.scrollY
        : 0;

    const applyScroll = () => {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(savedScrollY, { immediate: true });
      }
      window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
    };

    applyScroll();
    const rafId = window.requestAnimationFrame(applyScroll);

    const timer = setTimeout(() => {
      if (savedScrollY > 0) {
        applyScroll();
      }
      ScrollTrigger.refresh();
      AOS.refreshHard();
    }, 100);

    return () => {
      window.cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [currentView]);

  const scrollTo = (target: string | HTMLElement | number, options?: any) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, options);
    } else {
      if (typeof target === 'number') {
        window.scrollTo({ top: target, behavior: 'smooth' });
      } else if (typeof target === 'string') {
        const el = document.querySelector(target);
        el?.scrollIntoView({ behavior: 'smooth' });
      } else if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const refreshScrollTrigger = () => {
    ScrollTrigger.refresh();
  };

  return (
    <SmoothScrollContext.Provider
      value={{
        lenis: lenisRef.current,
        velocity,
        scrollTo,
        refreshScrollTrigger,
      }}
    >
      {children}
    </SmoothScrollContext.Provider>
  );
};
