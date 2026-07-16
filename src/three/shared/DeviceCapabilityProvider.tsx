import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface DeviceCapability {
  isLowPerf: boolean;
  isLowPerfReady: boolean;
}

const CapabilityContext = createContext<DeviceCapability>({
  isLowPerf: false,
  isLowPerfReady: false,
});

export function useDeviceCapability() {
  return useContext(CapabilityContext);
}

interface ProviderProps {
  children: ReactNode;
}

function runFpsBenchmark(sampleFrames: number = 30, timeoutMs: number = 500): Promise<number> {
  return new Promise((resolve) => {
    let count = 0;
    const start = performance.now();
    let rafId = 0;
    const timer = setTimeout(() => {
      cancelAnimationFrame(rafId);
      const elapsed = performance.now() - start;
      resolve((count / elapsed) * 1000);
    }, timeoutMs);
    function frame() {
      count++;
      if (count >= sampleFrames) {
        clearTimeout(timer);
        const elapsed = performance.now() - start;
        resolve((sampleFrames / elapsed) * 1000);
      } else {
        rafId = requestAnimationFrame(frame);
      }
    }
    rafId = requestAnimationFrame(frame);
  });
}

export function DeviceCapabilityProvider({ children }: ProviderProps) {
  const [cap, setCap] = useState<DeviceCapability>({
    isLowPerf: false,
    isLowPerfReady: false,
  });

  useEffect(() => {
    let cancelled = false;
    runFpsBenchmark().then((fps) => {
      if (cancelled) return;
      setCap({
        isLowPerf: fps < 30,
        isLowPerfReady: true,
      });
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <CapabilityContext.Provider value={cap}>
      {children}
    </CapabilityContext.Provider>
  );
}
