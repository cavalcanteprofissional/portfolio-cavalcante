import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { HEADER_OFFSET } from '../constants';

gsap.registerPlugin(ScrollToPlugin);

let _navigateToSection: ((id: string) => void) | null = null;

function disableSnap() {
  document.documentElement.classList.add('scroll-snap-none');
}

function enableSnap() {
  document.documentElement.classList.remove('scroll-snap-none');
}

export function scrollToSection(id: string) {
  _navigateToSection?.(id);
}

export function useGsapScrollNavigation(sectionIds: string[]) {
  const initialized = useRef(false);
  const sectionIdsRef = useRef(sectionIds);
  sectionIdsRef.current = sectionIds;

  const navigate = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    disableSnap();

    const y = el.offsetTop - HEADER_OFFSET;
    gsap.to(window, {
      scrollTo: { y, autoKill: false },
      duration: 0.6,
      ease: 'power2.inOut',
      onComplete: () => {
        enableSnap();
      },
    });

    const onScrollEnd = () => {
      enableSnap();
      window.removeEventListener('scrollend', onScrollEnd);
    };
    window.addEventListener('scrollend', onScrollEnd, { once: true });
    setTimeout(() => {
      enableSnap();
      window.removeEventListener('scrollend', onScrollEnd);
    }, 800);
  }, []);

  useEffect(() => {
    _navigateToSection = navigate;
    return () => { _navigateToSection = null; };
  }, [navigate]);

  useEffect(() => {
    if (initialized.current) return;
    if (sectionIds.length === 0) return;

    initialized.current = true;
    return () => { initialized.current = false; };
  }, [sectionIds]);
}
