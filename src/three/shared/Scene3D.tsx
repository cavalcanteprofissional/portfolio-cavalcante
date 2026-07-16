import { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useThemeStore } from '../../stores/themeStore';
import { useDeviceCapability } from './DeviceCapabilityProvider';
import { DevScene } from '../dev/DevScene';
import { MarketingScene } from '../marketing/MarketingScene';
import { setSceneReady } from './sceneReady';
import { useScrollProgress } from './ScrollProgressProvider';
import { useReducedMotion } from './ReducedMotionProvider';

const BLOOM_INTENSITIES = [
  1.5, 1.3, 1.8, 1.1, 1.5,
  1.6, 1.4, 1.2, 1.0, 1.3,
  1.1, 1.4,
];

function DynamicBloom() {
  const { activeSection } = useScrollProgress();
  const reduceMotion = useReducedMotion();
  const base = BLOOM_INTENSITIES[activeSection % BLOOM_INTENSITIES.length] ?? 1.2;
  const [mult, setMult] = useState(1);

  useFrame((state) => {
    if (reduceMotion) {
      if (mult !== 1) setMult(1);
      return;
    }
    const t = state.clock.elapsedTime;
    const pulse = 0.8 + 0.6 * (1 + Math.sin(t * 2 * Math.PI * 0.4));
    const next = pulse / 1.4;
    setMult(next);
  });

  return (
    <Bloom
      luminanceThreshold={0.2}
      luminanceSmoothing={0.9}
      intensity={base * mult}
      mipmapBlur
    />
  );
}

function SceneContent() {
  const { activePortfolio } = useThemeStore();

  return (
    <>
      {activePortfolio === 'dev' ? <DevScene /> : <MarketingScene />}
    </>
  );
}

export function Scene3D() {
  const { theme } = useThemeStore();
  const { isLowPerf, isLowPerfReady } = useDeviceCapability();
  const isDark = theme === 'dark';
  const dpr: [number, number] = isLowPerf && isLowPerfReady ? [1, 1] : [1, 1.5];

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 100 }}
        gl={{ antialias: !isLowPerf || !isLowPerfReady }}
        dpr={dpr}
        onCreated={setSceneReady}
      >
        <color attach="background" args={[isDark ? '#0f172a' : '#f1f5f9']} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 10, 5]} intensity={0.6} />
        <directionalLight position={[-5, -5, -5]} intensity={0.2} />
        <hemisphereLight args={['#0ea5e9', '#1e293b', 0.3]} />

        <SceneContent />

        {(!isLowPerf || !isLowPerfReady) && (
          <EffectComposer>
            <DynamicBloom />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
