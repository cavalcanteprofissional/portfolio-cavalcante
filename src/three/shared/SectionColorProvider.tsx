import { useEffect, type ReactNode } from 'react';
import { useScrollProgress } from './ScrollProgressProvider';

const SECTION_COLORS = [
  '#06b6d4', // Cyan     (Hero)
  '#0ea5e9', // Sky Blue (About/info sections)
  '#7c3aed', // Violet   (Skills)
  '#10b981', // Emerald  (Projects)
  '#f43f5e', // Rose     (Contact)
];

export function useSectionColor() {
  const { activeSection } = useScrollProgress();
  const color = SECTION_COLORS[activeSection % SECTION_COLORS.length] ?? SECTION_COLORS[0];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--section-neon', color);
    const rgb = hexToRgbValues(color);
    root.style.setProperty('--section-neon-rgb', `${rgb.r} ${rgb.g} ${rgb.b}`);
  }, [color]);

  return color;
}

function hexToRgbValues(hex: string) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function getSectionColor(index: number): string {
  return SECTION_COLORS[index % SECTION_COLORS.length] ?? SECTION_COLORS[0];
}

export function SectionColorInjector({ children }: { children: ReactNode }) {
  useSectionColor();
  return <>{children}</>;
}
