import { useTranslation } from 'react-i18next';
import { Sun, Moon, Menu, X, Globe, ChevronDown, Home, Eye, Briefcase, FolderGit2, Wrench, Award, Languages } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../stores/themeStore';
import { scrollToSection } from '../hooks/useGsapScrollSnap';
import { HEADER_OFFSET } from '../constants';
import i18n from '../i18n';

const languages = [
  { code: 'pt', label: 'PT', name: 'Português' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
];

export interface NavItem {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const devNavItems: NavItem[] = [
  { key: 'home', href: '#hero', icon: Home },
  { key: 'experience', href: '#experience', icon: Briefcase },
  { key: 'portfolio', href: '#projects', icon: FolderGit2 },
  { key: 'skills', href: '#skills', icon: Wrench },
  { key: 'showcase', href: '#showcase', icon: Eye },
  { key: 'certifications', href: '#certifications', icon: Award },
  { key: 'languages', href: '#languages', icon: Languages },
];

interface NavProps {
  navItems?: NavItem[];
}

export function Nav({ navItems = devNavItems }: NavProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(() => i18n.language || 'pt');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    setMounted(true);
  }, []);

  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const sectionEls = navItems
      .map(item => document.querySelector(item.href) as HTMLElement | null)
      .filter(Boolean) as HTMLElement[];

    if (sectionEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best = entries[0];
        for (const entry of entries) {
          if (entry.intersectionRatio > best.intersectionRatio) {
            best = entry;
          }
        }
        if (best.isIntersecting) {
          setActiveSection(best.target.id);
          history.replaceState(null, '', `#${best.target.id}`);
        }
      },
      {
        rootMargin: `-${HEADER_OFFSET}px 0px -50% 0px`,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    for (const el of sectionEls) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [navItems]);

  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('scroll', handleScroll, { once: true });
    }
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setCurrentLang(langCode);
    setLangMenuOpen(false);
    localStorage.setItem('portfolio-lang', langCode);
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('portfolio-lang');
    if (savedLang && savedLang !== currentLang) {
      i18n.changeLanguage(savedLang);
      setCurrentLang(savedLang);
    }
  }, []);

  const closeMobileMenu = useCallback(() => setIsOpen(false), []);

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const id = href.replace('#', '');
    scrollToSection(id);
    closeMobileMenu();
  }, [closeMobileMenu]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-soft" role="navigation" aria-label={t('acessibilidade.navAria')}>
      <div className="section-container relative z-10">
        <div className="flex items-center justify-between h-16">
          <a href="#hero" className="flex items-center justify-center">
            {mounted && (
              <img
                src={theme === 'dark' 
                  ? '/portfolio/images/navbar/logo-navbar-darkmode.png' 
                  : '/portfolio/images/navbar/logo-navbar-lightmode.png'}
                alt="LC"
                width={32}
                height={32}
                loading="lazy"
                className="h-8 w-auto"
              />
            )}
          </a>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const sectionId = item.href.replace('#', '');
              const isActive = activeSection === sectionId;
              return (
                <a
                  key={item.key}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-primary hover:bg-secondary/50'
                  }`}
                >
                  {t(`nav.${item.key}`)}
                </a>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div ref={langMenuRef} className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1 px-3 py-2 rounded-full hover:bg-secondary transition-colors text-sm font-medium"
                aria-label="Select language"
              >
                <Globe className="w-4 h-4" />
                <span className="w-6">{currentLang.toUpperCase()}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-card border border-border/50 rounded-soft shadow-soft-lg overflow-hidden z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-secondary/50 transition-colors flex items-center justify-between ${
                        currentLang === lang.code ? 'text-primary font-medium bg-primary/5' : 'text-foreground'
                      }`}
                    >
                      <span>{lang.label}</span>
                      <span className="text-xs text-muted-foreground">{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="md:hidden"
            >
              <div className="py-4 px-4 space-y-1 bg-background/95 backdrop-blur-xl border-t border-border/50">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const sectionId = item.href.replace('#', '');
                  const isActive = activeSection === sectionId;
                  return (
                    <motion.a
                      key={item.key}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.href)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t(`nav.${item.key}`)}
                      {isActive && (
                        <motion.div
                          layoutId="mobileActiveIndicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                        />
                      )}
                    </motion.a>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
