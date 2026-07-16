import { useRef, useMemo, lazy, Suspense, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Float } from '@react-three/drei';
import { useScrollProgress } from '../shared/ScrollProgressProvider';
import { useCameraRig } from '../shared/useCameraRig';
import { useDeviceCapability } from '../shared/DeviceCapabilityProvider';
import { HtmlCard } from '../../components/HtmlCard';
import { NeonMesh, FOCAL_GEOMETRIES } from '../shared/NeonMesh';
import { ParticleAccent } from '../shared/ParticleAccent';
import { getSectionColor } from '../shared/SectionColorProvider';
import * as THREE from 'three';

const Hero = lazy(() => import('../../components/Hero').then(m => ({ default: m.Hero })));
const Stats = lazy(() => import('../../components/Stats').then(m => ({ default: m.Stats })));
const Companies = lazy(() => import('../../components/Companies').then(m => ({ default: m.Companies })));
const TechStack = lazy(() => import('../../components/TechStack').then(m => ({ default: m.TechStack })));
const Experience = lazy(() => import('../../components/Experience').then(m => ({ default: m.Experience })));
const PortfolioSection = lazy(() => import('../../components/Portfolio').then(m => ({ default: m.Portfolio })));
const Skills = lazy(() => import('../../components/Skills').then(m => ({ default: m.Skills })));
const Showcase = lazy(() => import('../../components/Showcase').then(m => ({ default: m.Showcase })));
const Certifications = lazy(() => import('../../components/Certifications').then(m => ({ default: m.Certifications })));
const Languages = lazy(() => import('../../components/Languages').then(m => ({ default: m.Languages })));
const FAQ = lazy(() => import('../../components/FAQ').then(m => ({ default: m.FAQ })));
const Contact = lazy(() => import('../../components/Contact').then(m => ({ default: m.Contact })));

const devStops: { position: [number, number, number]; target: [number, number, number] }[] = [
  { position: [0, 3.5, 8], target: [0, 0, 0] },
  { position: [0, 3.2, 7], target: [0, 0, 0.5] },
  { position: [0, 2.8, 6], target: [0, 0, 1] },
  { position: [0, 2.5, 5], target: [0, 0, 1.5] },
  { position: [0, 2.2, 4], target: [0, 0, 2] },
  { position: [0, 1.8, 3], target: [0, 0, 2.5] },
  { position: [0, 1.5, 2], target: [0, 0, 3] },
  { position: [0, 1.2, 1], target: [0, 0, 3.5] },
  { position: [0, 1.0, 0], target: [0, 0, 4] },
  { position: [0, 0.8, -1], target: [0, 0, 4.5] },
  { position: [0, 0.6, -2], target: [0, 0, 5] },
  { position: [0, 0.5, -3], target: [0, 0, 5.5] },
];

const sections = [
  Hero, Stats, Companies, TechStack, Experience,
  PortfolioSection, Skills, Showcase, Certifications,
  Languages, FAQ, Contact,
];

const SectionFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function PCB() {
  return (
    <mesh position={[0, -0.05, 0]} receiveShadow>
      <boxGeometry args={[8, 0.1, 12]} />
      <meshStandardMaterial color="#0a1a0a" roughness={0.8} metalness={0.3} />
    </mesh>
  );
}

function CircuitTraces({ lite }: { lite: boolean }) {
  const traces = useMemo(() => {
    const paths: { points: THREE.Vector3[]; color: string }[] = [];
    const pairs: [number, number, number, number, string][] = [
      [-3, -1, -1, 2, '#0ea5e9'], [2, -1, 3.5, 1.5, '#7c3aed'], [-2, 2, -3, -2, '#0ea5e9'], [1, -2, 3, 3, '#7c3aed'],
      [-3.5, 0, 0, -3, '#0ea5e9'], [0, 3, 2.5, -1.5, '#7c3aed'], [-1.5, -3, 2, 2.5, '#0ea5e9'], [3.5, 3.5, -3, -3, '#7c3aed'],
      [-2.5, 1, 1, -2, '#0ea5e9'], [-3, 3, 3.5, -2.5, '#7c3aed'], [0, -2, -2, 3.5, '#0ea5e9'], [2.5, -3, -1, 1.5, '#7c3aed'],
    ];
    const selected = lite ? pairs.slice(0, 6) : pairs;
    selected.forEach(([sx, sz, ex, ez, c]) => {
      const mx = (sx + ex) / 2 + (Math.random() - 0.5) * 1.5;
      const mz = (sz + ez) / 2 + (Math.random() - 0.5) * 1.5;
      paths.push({ points: [new THREE.Vector3(sx, 0.05, sz), new THREE.Vector3(mx, 0.05, mz), new THREE.Vector3(ex, 0.05, ez)], color: c });
    });
    return paths;
  }, [lite]);

  return (
    <group>
      {traces.map((t, i) => (
        <mesh key={i} geometry={new THREE.TubeGeometry(new THREE.CatmullRomCurve3(t.points), lite ? 8 : 20, 0.03, lite ? 4 : 6, false)}>
          <meshStandardMaterial color={t.color} emissive={t.color} emissiveIntensity={0.4} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function GlowNodes({ lite }: { lite: boolean }) {
  const count = lite ? 5 : 15;
  const positions = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      pts.push([(-3 + Math.random() * 6), 0.08, (-4 + Math.random() * 8)]);
    }
    return pts;
  }, [count]);
  return (
    <group>
      {positions.map((pos, i) => (
        <Float key={i} speed={0.5} floatIntensity={lite ? 0 : 0.1}>
          <mesh position={pos}>
            <sphereGeometry args={[0.06, lite ? 4 : 8, lite ? 4 : 8]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#0ea5e9' : '#7c3aed'} emissive={i % 2 === 0 ? '#0ea5e9' : '#7c3aed'} emissiveIntensity={lite ? 0.3 : 1} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function MotherboardArt() {
  const { isLowPerf } = useDeviceCapability();

  return (
    <group>
      <PCB />
      <CircuitTraces lite={isLowPerf} />
      <group position={[0, 0, 0.5]}>
        <mesh position={[0, 0.15, 0]}><boxGeometry args={[1.2, 0.3, 1.2]} /><meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.7} /></mesh>
        <mesh position={[0, 0.35, 0]}><boxGeometry args={[0.8, 0.15, 0.8]} /><meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={isLowPerf ? 0.1 : 0.3} /></mesh>
      </group>
      <group position={[2.5, 0, -0.5]}>
        <mesh position={[0, 0.15, 0]}><boxGeometry args={[1.8, 0.25, 0.8]} /><meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} /></mesh>
        <mesh position={[0, 0.3, 0]}><boxGeometry args={[1, 0.12, 0.4]} /><meshStandardMaterial color="#7c3aed" emissive="#7c3aed" emissiveIntensity={isLowPerf ? 0.1 : 0.4} /></mesh>
      </group>
      <group position={[0, 0, 5.5]}>
        <mesh position={[0, 0.15, 0]}><boxGeometry args={[2, 0.25, 0.3]} /><meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} /></mesh>
      </group>
      <group>
        {Array.from({ length: isLowPerf ? 4 : 8 }).map((_, i) => (
          <mesh key={i} position={[-3.9 + (i % 4) * 0.8, 0.08, 1.5 + Math.floor(i / 4) * 2]}>
            <boxGeometry args={[0.2, 0.06, 0.4]} /><meshStandardMaterial color="#7c3aed" emissive="#7c3aed" emissiveIntensity={isLowPerf ? 0.05 : 0.15} />
          </mesh>
        ))}
      </group>
      <GlowNodes lite={isLowPerf} />
    </group>
  );
}

function DevHtmlContent() {
  const { activeSection } = useScrollProgress();
  const idx = Math.min(activeSection, sections.length - 1);
  const SectionComponent = sections[idx];

  return (
    <Html position={[0, 0, 0]} center className="!pointer-events-auto">
      <HtmlCard activeKey={idx}>
        <Suspense fallback={<SectionFallback />}>
          <SectionComponent />
        </Suspense>
      </HtmlCard>
    </Html>
  );
}

const FOCAL_SCALES = devStops.map((s) => {
  const objY = 0.8;
  const dx = s.position[0] - s.target[0];
  const dy = s.position[1] - objY;
  const dz = s.position[2] - s.target[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return Math.max(0.5, Math.min(2, 4 / dist));
});

function FocalObject() {
  const { activeSection } = useScrollProgress();
  const idx = Math.min(activeSection, sections.length - 1);
  const stop = devStops[idx];
  const color = getSectionColor(idx);
  const geo = FOCAL_GEOMETRIES[idx % FOCAL_GEOMETRIES.length];
  const scale = FOCAL_SCALES[idx];

  const pos: [number, number, number] = [stop.target[0], 0.8, stop.target[2]];

  return (
    <group>
      <NeonMesh geometry={geo} color={color} position={pos} scale={scale} />
      <ParticleAccent color={color} position={pos} />
    </group>
  );
}

export function DevScene() {
  const groupRef = useRef<THREE.Group>(null);
  const { position, target } = useCameraRig(devStops);
  const { scene } = useThree();

  useEffect(() => {
    return () => {
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    };
  }, [scene]);

  useFrame(({ camera }) => {
    camera.position.set(position[0], position[1], position[2]);
    camera.lookAt(target[0], target[1], target[2]);
  });

  return (
    <group ref={groupRef}>
      <MotherboardArt />
      <FocalObject />
      <DevHtmlContent />
    </group>
  );
}
