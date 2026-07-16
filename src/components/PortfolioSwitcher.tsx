import { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../stores/themeStore';
import { ScrollProgressProvider, useScrollProgress } from '../three/shared/ScrollProgressProvider';
import { DeviceCapabilityProvider } from '../three/shared/DeviceCapabilityProvider';
import { ReducedMotionProvider } from '../three/shared/ReducedMotionProvider';
import { useGsapScrollNavigation, scrollToSection } from '../hooks/useGsapScrollSnap';
import { LazyScene3D } from '../three/shared/LazyScene3D';
import { onSceneReady } from '../three/shared/sceneReady';
import { SectionColorInjector } from '../three/shared/SectionColorProvider';
import { PortfolioToggle } from './PortfolioToggle';
import { Nav, devNavItems } from './Nav';
import { Footer } from './Footer';
import { ScrollToTop } from './ScrollToTop';
import type { NavItem } from './Nav';
import { Home, User, Wrench, TrendingUp, Mail } from 'lucide-react';

const mktNavItems: NavItem[] = [
  { key: 'home', href: '#mkt-hero', icon: Home },
  { key: 'about', href: '#mkt-about', icon: User },
  { key: 'tools', href: '#mkt-tools', icon: Wrench },
  { key: 'cases', href: '#mkt-cases', icon: TrendingUp },
  { key: 'contact', href: '#mkt-contact', icon: Mail },
];

const devSectionIds = [
  'hero', 'dev-stats', 'dev-companies', 'dev-tech', 'experience',
  'projects', 'skills', 'showcase', 'certifications',
  'languages', 'dev-faq', 'dev-contact',
];

const mktSectionIds = ['mkt-hero', 'mkt-about', 'mkt-tools', 'mkt-cases', 'mkt-contact'];

function DevSpacers() {
  const { registerSections } = useScrollProgress();

  useGsapScrollNavigation(devSectionIds);

  useEffect(() => {
    registerSections(devSectionIds);
  }, [registerSections]);

  return (
    <>
      {devSectionIds.map((id) => (
        <div key={id} id={id} className="h-screen w-full snap-start pointer-events-none" />
      ))}
    </>
  );
}

function MktSpacers() {
  const { registerSections } = useScrollProgress();

  useGsapScrollNavigation(mktSectionIds);

  useEffect(() => {
    registerSections(mktSectionIds);
  }, [registerSections]);

  return (
    <>
      {mktSectionIds.map((id) => (
        <div key={id} id={id} className="h-screen w-full snap-start pointer-events-none" />
      ))}
    </>
  );
}

const slideVariants = {
  initial: (direction: 'left' | 'right') => ({
    x: direction === 'right' ? '100%' : '-100%',
  }),
  animate: { x: 0 },
  exit: (direction: 'left' | 'right') => ({
    x: direction === 'right' ? '-100%' : '100%',
  }),
};

function PortfolioInner() {
  const { activePortfolio } = useThemeStore();
  const navItems = activePortfolio === 'dev' ? devNavItems : mktNavItems;

  return (
    <>
      <Suspense fallback={<div className="fixed inset-0 z-0 bg-background" />}>
        <LazyScene3D />
      </Suspense>
      <Nav navItems={navItems} />
      <Footer />
      <PortfolioToggle />
      <ScrollToTop />

      {activePortfolio === 'dev' ? <DevSpacers /> : <MktSpacers />}
    </>
  );
}

export function PortfolioSwitcher() {
  const { activePortfolio } = useThemeStore();
  const [prev, setPrev] = useState(activePortfolio);
  const [renderKey, setRenderKey] = useState(activePortfolio);
  const scrollRestored = useRef(false);
  const hashHandled = useRef(false);

  useEffect(() => {
    if (hashHandled.current) return;
    const hash = window.location.hash;
    if (!hash) return;
    hashHandled.current = true;
    onSceneReady(() => {
      requestAnimationFrame(() => {
        scrollToSection(hash.replace('#', ''));
      });
    });
  }, []);

  const direction = prev === 'dev' && activePortfolio === 'marketing' ? 'right' : 'left';

  useEffect(() => {
    if (activePortfolio === prev) return;
    scrollRestored.current = false;
    const timer = setTimeout(() => {
      setRenderKey(activePortfolio);
      setPrev(activePortfolio);
    }, 500);
    return () => clearTimeout(timer);
  }, [activePortfolio, prev]);

  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const content = (
    <DeviceCapabilityProvider>
      <ReducedMotionProvider>
        <ScrollProgressProvider>
          <SectionColorInjector>
            <PortfolioInner />
          </SectionColorInjector>
        </ScrollProgressProvider>
      </ReducedMotionProvider>
    </DeviceCapabilityProvider>
  );

  if (reduceMotion) {
    return content;
  }

  return (
    <div className="relative overflow-x-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={renderKey}
          custom={direction}
          variants={slideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
