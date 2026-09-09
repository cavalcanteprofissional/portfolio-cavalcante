import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useThemeStore } from './stores/themeStore';
import { useBootStore } from './stores/bootStore';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Nav, Hero, Stats, Footer, ScrollToTop, BootScreen, PoolEffect, CookieConsent, ChatBot } from './components';
import { useConsentStore } from './stores/consentStore';
import { enableUmami } from './lib/analytics';
import { focusReveal } from './lib/motion';
import { BOOT_TIMELINE, EASE } from './lib/motion';
import { BG_DARK_HSL } from './lib/constants';
import './i18n';

const Companies = lazy(() => import('./components/Companies').then(m => ({ default: m.Companies })));
const TechStack = lazy(() => import('./components/TechStack').then(m => ({ default: m.TechStack })));
const Experience = lazy(() => import('./components/Experience').then(m => ({ default: m.Experience })));
const Portfolio = lazy(() => import('./components/Portfolio').then(m => ({ default: m.Portfolio })));
const Skills = lazy(() => import('./components/Skills').then(m => ({ default: m.Skills })));
const Certifications = lazy(() => import('./components/Certifications').then(m => ({ default: m.Certifications })));
const Languages = lazy(() => import('./components/Languages').then(m => ({ default: m.Languages })));
const FAQ = lazy(() => import('./components/FAQ').then(m => ({ default: m.FAQ })));
const Contact = lazy(() => import('./components/Contact').then(m => ({ default: m.Contact })));

const SectionFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  const { theme } = useThemeStore();
  const booted = useBootStore((s) => s.booted);
  const setBooted = useBootStore((s) => s.setBooted);
  const { t, i18n } = useTranslation();
  const [resourcesReady, setResourcesReady] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const consent = useConsentStore((s) => s.consent);

  useEffect(() => {
    if (consent === true) enableUmami();
  }, [consent]);

  useEffect(() => {
    if (booted) return;

    let cancelled = false;
    const finish = () => {
      if (!cancelled) setResourcesReady(true);
    };

    const load = new Promise<void>((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', () => resolve(), { once: true });
    });

    const fallback = setTimeout(finish, 8000);

    load.then(() => {
      clearTimeout(fallback);
      finish();
    });

    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, [booted]);

  const handleBootComplete = useCallback(() => {
    sessionStorage.setItem('booted', 'true');
    setBooted(true);
  }, [setBooted]);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const localeMap: Record<string, string> = { pt: 'pt-BR', en: 'en', es: 'es' };
    const base = String(i18n.language || 'pt').split('-')[0];
    document.documentElement.lang = localeMap[base] ?? 'pt-BR';
    document.title = t('meta.title');
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('meta.description'));
  }, [i18n.language, t]);

  useEffect(() => {
    if (!booted) return;
    const timer = setTimeout(() => setShowConsent(true), 800);
    return () => clearTimeout(timer);
  }, [booted]);

  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <AnimatePresence>{!booted && <BootScreen onComplete={handleBootComplete} ready={resourcesReady} />}</AnimatePresence>

        <motion.div
          className="fixed inset-0 z-[45] pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: booted ? 0 : 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: booted ? BOOT_TIMELINE.overlay : 0 }}
          style={{ backgroundColor: BG_DARK_HSL }}
          aria-hidden="true"
        />

        <div className="min-h-screen bg-background text-foreground">
          <a href="#main-content" className="skip-to-content">
            {t('acessibilidade.skipToContent')}
          </a>
          {booted && <Nav />}

          <PoolEffect intense={!booted} />

          <motion.main
            id="main-content"
            className="pb-24"
            initial="hidden"
            animate={booted ? 'show' : 'hidden'}
            variants={focusReveal(BOOT_TIMELINE.mainFocus)}
          >
            {booted && <Hero />}
            <Stats />
            <Suspense fallback={<SectionFallback />}><Companies /></Suspense>
            <Suspense fallback={<SectionFallback />}><TechStack /></Suspense>
            <Suspense fallback={<SectionFallback />}><Experience /></Suspense>
            <Suspense fallback={<SectionFallback />}><Portfolio /></Suspense>
            <Suspense fallback={<SectionFallback />}><Skills /></Suspense>
            <Suspense fallback={<SectionFallback />}><Certifications /></Suspense>
            <Suspense fallback={<SectionFallback />}><Languages /></Suspense>
            <Suspense fallback={<SectionFallback />}><FAQ /></Suspense>
            <Suspense fallback={<SectionFallback />}><Contact /></Suspense>
          </motion.main>

          {booted && <Footer />}
          <ScrollToTop />
          <CookieConsent visible={showConsent} />
          {booted && <ChatBot />}
        </div>
      </MotionConfig>
    </ErrorBoundary>
  );
}

export default App;