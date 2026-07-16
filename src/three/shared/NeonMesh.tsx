import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useReducedMotion } from './ReducedMotionProvider';
import * as THREE from 'three';

interface NeonMeshProps {
  geometry: THREE.BufferGeometry;
  color: string;
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  wireframeOpacity?: number;
  emissiveIntensity?: number;
}

export function NeonMesh({
  geometry,
  color,
  position = [0, 0, 0],
  scale = 1,
  rotation,
  wireframeOpacity = 0.5,
  emissiveIntensity = 1.5,
}: NeonMeshProps) {
  const geo = useMemo(() => geometry, [geometry]);
  const coreRef = useRef<THREE.Mesh>(null);
  const reduceMotion = useReducedMotion();
  const pulseEnabled = !reduceMotion;

  useFrame((state) => {
    if (!coreRef.current || !pulseEnabled) return;
    const mat = coreRef.current.material as THREE.MeshStandardMaterial;
    const t = state.clock.elapsedTime;
    mat.emissiveIntensity = 0.8 + 0.6 * (1 + Math.sin(t * 2 * Math.PI * 0.4));
  });

  return (
    <group position={position} scale={scale} rotation={rotation}>
      <mesh geometry={geo}>
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={wireframeOpacity}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={coreRef} geometry={geo} scale={0.6}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={1}
        />
      </mesh>
    </group>
  );
}

const geos = {
  icosahedron: new THREE.IcosahedronGeometry(0.6, 0),
  octahedron: new THREE.OctahedronGeometry(0.6, 0),
  torus: new THREE.TorusGeometry(0.5, 0.15, 12, 20),
  torusKnot: new THREE.TorusKnotGeometry(0.45, 0.15, 48, 8),
  tetrahedron: new THREE.TetrahedronGeometry(0.6, 0),
  dodecahedron: new THREE.DodecahedronGeometry(0.6, 0),
};

export const FOCAL_GEOMETRIES = [
  geos.icosahedron,
  geos.octahedron,
  geos.torus,
  geos.torusKnot,
  geos.tetrahedron,
  geos.dodecahedron,
];
