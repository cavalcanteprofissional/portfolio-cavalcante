import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

const ReducedMotionContext = createContext(false);

export function useReducedMotion() {
  return useContext(ReducedMotionContext);
}

interface Props {
  children: ReactNode;
}

export function ReducedMotionProvider({ children }: Props) {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <ReducedMotionContext.Provider value={reduce}>
      {children}
    </ReducedMotionContext.Provider>
  );
}
