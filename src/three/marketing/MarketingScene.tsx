import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { Mail, MessageCircle, Linkedin, BarChart3, MousePointerClick, Search, FileText } from 'lucide-react';
import { useScrollProgress } from '../shared/ScrollProgressProvider';
import { useCameraRig } from '../shared/useCameraRig';
import { useDeviceCapability } from '../shared/DeviceCapabilityProvider';
import { HtmlCard } from '../../components/HtmlCard';
import { NeonMesh, FOCAL_GEOMETRIES } from '../shared/NeonMesh';
import { ParticleAccent } from '../shared/ParticleAccent';
import { getSectionColor } from '../shared/SectionColorProvider';
import * as THREE from 'three';

const marketingStops: { position: [number, number, number]; target: [number, number, number] }[] = [
  { position: [0, 3, 10], target: [0, 0, 0] },
  { position: [0, 2, 7], target: [0, 0, 1] },
  { position: [0, 1.5, 4.5], target: [0, 0, 2] },
  { position: [0, 1, 2.5], target: [0, 0, 3] },
  { position: [0, 0.8, 1], target: [0, 0, 4] },
];

function DataFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[12, 12]} />
      <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

function DataGrid() {
  const lines: React.ReactElement[] = [];
  for (let i = -6; i <= 6; i++) {
    lines.push(
      <mesh key={`h${i}`} position={[i, 0.001, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.005, 0.001, 12]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.08} />
      </mesh>
    );
    lines.push(
      <mesh key={`v${i}`} position={[0, 0.001, i]} rotation={[0, 0, 0]}>
        <boxGeometry args={[12, 0.001, 0.005]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.08} />
      </mesh>
    );
  }
  return <group>{lines}</group>;
}

function AnimatedChartBars({ lite }: { lite: boolean }) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const targetHeights = useRef<number[]>([]);
  const cols = lite ? 3 : 5;
  const rows = lite ? 4 : 8;
  const colors = ['#f59e0b', '#d97706', '#fbbf24', '#eab308', '#f97316'];

  const barData = useMemo(() => {
    const items: { x: number; z: number; color: string }[] = [];
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        items.push({
          x: -1.2 + j * 0.6,
          z: -3 + i * 0.8,
          color: colors[(i + j) % colors.length],
        });
        targetHeights.current[i * cols + j] = 0.2 + Math.random() * 2;
      }
    }
    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lite]);

  useFrame(() => {
    for (let i = 0; i < meshRefs.current.length; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const target = targetHeights.current[i] ?? 0.5;
      const cur = mesh.scale.y;
      const next = cur + (target - cur) * 0.02;
      mesh.scale.y = next;
    }
  });

  return (
    <group position={[-0.5, 0, 1]}>
      {barData.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.25, 0.02, 0.25]} />
            <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0.5} transparent opacity={0.3} />
          </mesh>
          <mesh
            ref={(el) => { meshRefs.current[i] = el; }}
            position={[0, 0.01, 0]}
            scale={[1, 0.01, 1]}
          >
            <boxGeometry args={[0.22, 1, 0.22]} />
            <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={lite ? 0.1 : 0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DataDonut({ lite }: { lite: boolean }) {
  const donutRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (donutRef.current) {
      donutRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Float speed={0.5} floatIntensity={0.2}>
      <group position={[3.5, 0.5, -1.5]}>
        <mesh ref={donutRef}>
          <torusGeometry args={[0.8, 0.08, lite ? 6 : 16, lite ? 12 : 32]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={lite ? 0.05 : 0.3} transparent opacity={0.7} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.8, lite ? 6 : 24]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={lite ? 0.02 : 0.1} side={THREE.DoubleSide} transparent opacity={0.15} />
        </mesh>
      </group>
    </Float>
  );
}

function ConnectionLines({ lite }: { lite: boolean }) {
  const lines = useMemo(() => {
    const pts: { start: [number, number, number]; end: [number, number, number] }[] = [];
    const count = lite ? 3 : 8;
    for (let i = 0; i < count; i++) {
      pts.push({
        start: [(-3 + Math.random() * 6), Math.random() * 1.5, (-4 + Math.random() * 8)],
        end: [(-3 + Math.random() * 6), Math.random() * 1.5, (-4 + Math.random() * 8)],
      });
    }
    return pts;
  }, [lite]);

  return (
    <group>
      {lines.map((l, i) => {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(...l.start),
          new THREE.Vector3((l.start[0] + l.end[0]) / 2, Math.max(l.start[1], l.end[1]) + 0.5, (l.start[2] + l.end[2]) / 2),
          new THREE.Vector3(...l.end),
        ]);
        return (
          <mesh key={i} geometry={new THREE.TubeGeometry(curve, lite ? 4 : 12, 0.02, lite ? 3 : 4, false)}>
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={lite ? 0.1 : 0.3} transparent opacity={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function Funnel({ lite }: { lite: boolean }) {
  const funnelPts = useMemo(() => {
    const pts: { r: number; y: number }[] = [];
    const steps = lite ? 3 : 5;
    for (let i = 0; i < steps; i++) {
      pts.push({ r: 2 - i * 0.5, y: i * 0.8 });
    }
    return pts;
  }, [lite]);

  return (
    <group position={[3.5, 0, -1]}>
      {funnelPts.map((p, i) => (
        <mesh key={i} position={[0, p.y, 0]}>
          <ringGeometry args={[p.r - 0.05, p.r, lite ? 12 : 24]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={lite ? 0.05 : 0.15} side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function AnalyticsNodes({ lite }: { lite: boolean }) {
  const count = lite ? 5 : 15;
  const nodes = useMemo(() => {
    const pts: { pos: [number, number, number]; color: string }[] = [];
    const colors = ['#f59e0b', '#fbbf24', '#f97316'];
    for (let i = 0; i < count; i++) {
      pts.push({
        pos: [(-5 + Math.random() * 10), 0.05 + Math.random() * 0.5, (-5 + Math.random() * 10)],
        color: colors[i % colors.length],
      });
    }
    return pts;
  }, [count]);

  return (
    <group>
      {nodes.map((n, i) => (
        <Float key={i} speed={0.3 + Math.random() * 0.5} floatIntensity={lite ? 0 : 0.08}>
          <mesh position={n.pos}>
            <sphereGeometry args={[0.05, lite ? 4 : 6, lite ? 4 : 6]} />
            <meshStandardMaterial color={n.color} emissive={n.color} emissiveIntensity={lite ? 0.1 : 0.6} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function MarketingArt() {
  const { isLowPerf } = useDeviceCapability();

  return (
    <group>
      <DataFloor />
      <DataGrid />
      <AnimatedChartBars lite={isLowPerf} />
      <ConnectionLines lite={isLowPerf} />
      <Funnel lite={isLowPerf} />
      <DataDonut lite={isLowPerf} />
      <AnalyticsNodes lite={isLowPerf} />
    </group>
  );
}

const toolIcons = [BarChart3, MousePointerClick, Search, FileText, MessageCircle, BarChart3];
const caseIcons = [BarChart3, Search, MousePointerClick];

function HeroContent() {
  const { t } = useTranslation();
  return (
    <div className="max-w-xl space-y-6">
      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/10 text-amber-500 text-sm font-medium border border-amber-500/20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        {t('availability.label')}
      </div>
      <h1 className="text-4xl font-bold text-white">{t('marketingHero.name')}</h1>
      <p className="text-xl text-muted-foreground font-medium">{t('marketingHero.title')}</p>
      <p className="text-muted-foreground text-lg">{t('marketingHero.description')}</p>
    </div>
  );
}

function AboutContent() {
  const { t } = useTranslation();
  return (
    <div className="max-w-2xl mx-auto text-center space-y-6">
      <h2 className="text-3xl font-bold text-white">{t('marketingAbout.title')}</h2>
      <div className="w-24 h-1.5 bg-gradient-to-r from-amber-500 to-amber-400 mx-auto rounded-full" />
      <p className="text-muted-foreground text-lg leading-relaxed">{t('marketingAbout.description')}</p>
    </div>
  );
}

function ToolsContent() {
  const { t } = useTranslation();
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">{t('marketingTools.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('marketingTools.subtitle')}</p>
        <div className="w-24 h-1.5 bg-gradient-to-r from-amber-500 to-amber-400 mx-auto mt-4 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const Icon = toolIcons[i];
          return (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-foreground">{t(`marketingTools.item${i}`)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CasesContent() {
  const { t } = useTranslation();
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">{t('marketingCases.title')}</h2>
        <div className="w-24 h-1.5 bg-gradient-to-r from-amber-500 to-amber-400 mx-auto mt-4 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => {
          const Icon = caseIcons[i];
          return (
            <div key={i} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">{t(`marketingCases.case${i}.title`)}</h3>
              <p className="text-amber-500 font-bold text-xs mb-2">{t(`marketingCases.case${i}.metric`)}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">{t(`marketingCases.case${i}.description`)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContactContent() {
  const { t } = useTranslation();
  return (
    <div className="max-w-xl mx-auto text-center space-y-6">
      <h2 className="text-3xl font-bold text-white">{t('marketingContact.title')}</h2>
      <p className="text-muted-foreground">{t('marketingContact.subtitle')}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a href="mailto:cavalcanteprofissional@outlook.com" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 text-white hover:bg-amber-500/90 transition-all">
          <Mail className="w-4 h-4" />
          <span>{t('cta.contact')}</span>
        </a>
        <a href="https://wa.me/5585996859051" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary border border-border hover:border-amber-500/30 transition-all">
          <MessageCircle className="w-4 h-4" />
          <span>{t('cta.whatsapp')}</span>
        </a>
        <a href="https://linkedin.com/in/cavalcante-Lucas" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary border border-border hover:border-amber-500/30 transition-all">
          <Linkedin className="w-4 h-4" />
          <span>{t('cta.linkedin')}</span>
        </a>
      </div>
    </div>
  );
}

const FOCAL_SCALES = marketingStops.map((s) => {
  const objY = 1.2;
  const dx = s.position[0] - s.target[0];
  const dy = s.position[1] - objY;
  const dz = s.position[2] - s.target[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return Math.max(0.5, Math.min(2, 4 / dist));
});

function FocalObject() {
  const { activeSection } = useScrollProgress();
  const idx = Math.min(activeSection, sections.length - 1);
  const stop = marketingStops[idx];
  const color = getSectionColor(idx);
  const geo = FOCAL_GEOMETRIES[idx % FOCAL_GEOMETRIES.length];
  const scale = FOCAL_SCALES[idx];

  const pos: [number, number, number] = [stop.target[0], 1.2, stop.target[2]];

  return (
    <group>
      <NeonMesh geometry={geo} color={color} position={pos} scale={scale} />
      <ParticleAccent color={color} position={pos} />
    </group>
  );
}

const sections = [HeroContent, AboutContent, ToolsContent, CasesContent, ContactContent];

function MarketingHtmlContent() {
  const { activeSection } = useScrollProgress();
  const SectionComponent = sections[Math.min(activeSection, sections.length - 1)];

  return (
    <Html position={[0, 0, 0]} center className="!pointer-events-auto">
      <HtmlCard activeKey={activeSection}>
        <SectionComponent />
      </HtmlCard>
    </Html>
  );
}

export function MarketingScene() {
  const groupRef = useRef<THREE.Group>(null);
  const { position, target } = useCameraRig(marketingStops);
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
      <MarketingArt />
      <FocalObject />
      <MarketingHtmlContent />
    </group>
  );
}
