import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScrollProgress } from './ScrollProgressProvider';
import { useDeviceCapability } from './DeviceCapabilityProvider';
import * as THREE from 'three';

interface ParticleAccentProps {
  color: string;
  position: [number, number, number];
}

export function ParticleAccent({ color, position }: ParticleAccentProps) {
  const { isLowPerf } = useDeviceCapability();
  const { sectionProgress } = useScrollProgress();
  const pointsRef = useRef<THREE.Points>(null);
  const count = 30;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 1.5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
      vel[i] = 0.1 + Math.random() * 0.2;
    }
    return { positions: pos, velocities: vel };
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const arr = pointsRef.current.geometry.attributes.position
      .array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += velocities[i] * delta;
      if (arr[i * 3 + 1] > 0.75) {
        arr[i * 3 + 1] = -0.75;
        arr[i * 3] = (Math.random() - 0.5) * 1.5;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const opacity =
    Math.max(0, 1 - Math.abs(sectionProgress - 0.5) * 2) * 0.8;

  if (isLowPerf) return null;

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.06}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
