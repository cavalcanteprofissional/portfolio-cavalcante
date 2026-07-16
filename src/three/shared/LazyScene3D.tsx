import { lazy } from 'react';

export const LazyScene3D = lazy(() => import('./Scene3D').then(m => ({ default: m.Scene3D })));
