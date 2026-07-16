import { useRef, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../three/shared/ReducedMotionProvider';

interface HtmlCardProps {
  children: ReactNode;
  activeKey: number | string;
}

export function HtmlCard({ children, activeKey }: HtmlCardProps) {
  const reduceMotion = useReducedMotion();
  const [displayKey, setDisplayKey] = useState(activeKey);
  const cache = useRef(new Map<number | string, ReactNode>());
  const prevKey = useRef(activeKey);

  cache.current.set(activeKey, children);

  useEffect(() => {
    if (activeKey !== prevKey.current) {
      prevKey.current = activeKey;
      const t = setTimeout(() => setDisplayKey(activeKey), 200);
      return () => clearTimeout(t);
    }
  }, [activeKey]);

  useEffect(() => {
    for (const key of cache.current.keys()) {
      if (key !== activeKey && key !== displayKey) {
        cache.current.delete(key);
      }
    }
  }, [activeKey, displayKey]);

  const panelStyle: React.CSSProperties = {
    background: 'rgba(15, 15, 20, 0.55)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(var(--section-neon-rgb, 6 182 212), 0.3)',
    borderRadius: '16px',
    boxShadow: `
      0 0 0 1px rgba(var(--section-neon-rgb, 6 182 212), 0.1),
      0 8px 32px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.05)
    `,
    transition: 'border-color 600ms ease, box-shadow 600ms ease',
    maxWidth: '520px',
  };

  const panelClass =
    'w-[85vw] sm:w-[75vw] md:w-[65vw] lg:w-[50vw] min-w-[280px] max-h-[80vh] sm:max-h-[70vh]';

  if (reduceMotion) {
    return (
      <div style={panelStyle} className={panelClass} data-card="true">
        {children}
      </div>
    );
  }

  return (
    <div style={panelStyle} className={panelClass}>
      <AnimatePresence mode="wait">
        <motion.div
          key={String(displayKey)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          data-card="true"
        >
          {cache.current.get(displayKey) ?? children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
