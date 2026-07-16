import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useScroll, useMotionValueEvent } from 'framer-motion';

interface ScrollContextValue {
  scrollProgress: number;
  activeSection: number;
  sectionProgress: number;
  sectionCount: number;
  registerSections: (ids: string[]) => void;
}

const ScrollContext = createContext<ScrollContextValue>({
  scrollProgress: 0,
  activeSection: 0,
  sectionProgress: 0,
  sectionCount: 0,
  registerSections: () => {},
});

export function useScrollProgress() {
  return useContext(ScrollContext);
}

interface ScrollProgressProviderProps {
  children: ReactNode;
}

export function ScrollProgressProvider({ children }: ScrollProgressProviderProps) {
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [sectionTops, setSectionTops] = useState<number[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [sectionProgress, setSectionProgress] = useState(0);

  const { scrollYProgress } = useScroll();

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (sectionTops.length === 0) return;

    const viewH = window.innerHeight;
    const totalH = document.documentElement.scrollHeight;
    const scrollT = latest * (totalH - viewH);

    let active = 0;
    for (let i = sectionTops.length - 1; i >= 0; i--) {
      if (scrollT >= sectionTops[i]) {
        active = i;
        break;
      }
    }
    setActiveSection(active);

    const curTop = sectionTops[active];
    const prog = viewH > 0
      ? Math.min(1, Math.max(0, (scrollT - curTop) / viewH))
      : 0;
    setSectionProgress(prog);
  });

  const registerSections = useCallback((ids: string[]) => {
    setSectionIds(ids);
  }, []);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const updatePositions = () => {
      const tops: number[] = [];
      for (const id of sectionIds) {
        const el = document.getElementById(id) as HTMLElement | null;
        if (el) tops.push(el.offsetTop);
      }
      setSectionTops(tops);
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [sectionIds]);

  return (
    <ScrollContext.Provider
      value={{
        scrollProgress: scrollYProgress.get(),
        activeSection,
        sectionProgress,
        sectionCount: sectionIds.length,
        registerSections,
      }}
    >
      {children}
    </ScrollContext.Provider>
  );
}
