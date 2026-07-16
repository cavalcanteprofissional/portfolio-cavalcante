import { useMemo } from 'react';
import { useScrollProgress } from './ScrollProgressProvider';
import { useReducedMotion } from './ReducedMotionProvider';
import type { Vector3Tuple } from 'three';

interface SectionCamera {
  position: Vector3Tuple;
  target: Vector3Tuple;
}

interface CameraState {
  position: Vector3Tuple;
  target: Vector3Tuple;
}

const defaultDevStops: SectionCamera[] = [
  { position: [0, 0, 8], target: [0, 0, 0] },
  { position: [0, 0, 6], target: [0, 0, 0] },
  { position: [0, 0, 4], target: [0, 0, 0] },
  { position: [0, 0, 2], target: [0, 0, 0] },
  { position: [0, 0, 1], target: [0, 0, 0] },
  { position: [0, 0, 0.5], target: [0, 0, 0] },
  { position: [0, 0, 0.3], target: [0, 0, 0] },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpTuple(a: Vector3Tuple, b: Vector3Tuple, t: number): Vector3Tuple {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function useCameraRig(stops: SectionCamera[] = defaultDevStops): CameraState {
  const { sectionProgress, activeSection } = useScrollProgress();
  const reduceMotion = useReducedMotion();

  return useMemo(() => {
    if (stops.length === 0) return { position: [0, 0, 5], target: [0, 0, 0] };

    const idx = Math.min(activeSection, stops.length - 1);

    if (reduceMotion) {
      return stops[idx];
    }

    const nextIdx = Math.min(idx + 1, stops.length - 1);
    const eased = 1 - Math.pow(1 - sectionProgress, 3);

    return {
      position: lerpTuple(stops[idx].position, nextIdx === idx ? stops[idx].position : stops[nextIdx].position, eased),
      target: lerpTuple(stops[idx].target, nextIdx === idx ? stops[idx].target : stops[nextIdx].target, eased),
    };
  }, [stops, activeSection, sectionProgress, reduceMotion]);
}
