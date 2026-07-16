import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useThemeStore } from './stores/themeStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BootScreen, PortfolioSwitcher } from './components';
import './i18n';

function App() {
  const { theme, activePortfolio } = useThemeStore();
  const [booted, setBooted] = useState(
    () => sessionStorage.getItem('booted') === 'true'
  );

  const handleBootComplete = useCallback(() => {
    sessionStorage.setItem('booted', 'true');
    setBooted(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'theme-marketing');
    document.documentElement.classList.add(theme);
    if (activePortfolio === 'marketing') {
      document.documentElement.classList.add('theme-marketing');
    }
  }, [theme, activePortfolio]);

  return (
    <ErrorBoundary>
      <AnimatePresence>
        {!booted && <BootScreen onComplete={handleBootComplete} />}
      </AnimatePresence>

      {booted && <PortfolioSwitcher />}
    </ErrorBoundary>
  );
}

export default App;
