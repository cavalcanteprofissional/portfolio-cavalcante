import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';
type Portfolio = 'dev' | 'marketing';

interface ThemeStore {
  theme: Theme;
  activePortfolio: Portfolio;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setActivePortfolio: (p: Portfolio) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      activePortfolio: 'dev',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setActivePortfolio: (activePortfolio) => set({ activePortfolio }),
    }),
    {
      name: 'theme-storage',
    }
  )
);
