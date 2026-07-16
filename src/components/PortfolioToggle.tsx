import { useThemeStore } from '../stores/themeStore';

interface PortfolioToggleProps {
  disabled?: boolean;
}

export function PortfolioToggle({ disabled }: PortfolioToggleProps) {
  const { activePortfolio, setActivePortfolio } = useThemeStore();

  const isDev = activePortfolio === 'dev';

  return (
    <div className="fixed bottom-20 right-6 z-[60] flex">
      <button
        onClick={() => setActivePortfolio(isDev ? 'marketing' : 'dev')}
        disabled={disabled}
        aria-label={isDev ? 'Abrir portfólio Marketing' : 'Open Dev portfolio'}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
          shadow-lg backdrop-blur-xl border transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl active:scale-95'}
          ${isDev
            ? 'bg-card/95 border-primary/30 text-primary'
            : 'bg-card/95 border-amber-500/30 text-amber-500'
          }
        `}
      >
        <span className={`
          flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
          ${isDev ? 'bg-primary/15 text-primary' : 'bg-amber-500/15 text-amber-500'}
        `}>
          {isDev ? '</>' : '📈'}
        </span>
        <span className="text-foreground/80">
          {isDev ? 'Dev' : 'Marketing'}
        </span>
      </button>
    </div>
  );
}
