# Changelog — Aesthetic Refinement

## 2026-07-01

### Step 1 — Nav/Anchor Bug Fixes

- **HEADER_OFFSET** (`src/constants.ts`): Created single source of truth for fixed header height (80px).
- **Scroll offset** (`src/hooks/useGsapScrollSnap.ts`): GSAP `scrollTo` now uses `el.offsetTop - HEADER_OFFSET` so anchor clicks land precisely below the fixed nav.
- **Snap/anchor conflict** (`src/hooks/useGsapScrollSnap.ts`): Added `disableSnap()`/`enableSnap()`. On nav click, CSS `scroll-snap-type` is disabled, restored via `scrollend` event + 800ms timeout.
- **Active section detection** (`src/components/Nav.tsx`): IntersectionObserver now picks the entry with highest `intersectionRatio` using multi-threshold `[0, 0.25, 0.5, 0.75, 1]`. `rootMargin` uses `HEADER_OFFSET` constant.
- **Hash in URL** (`src/components/Nav.tsx`): `history.replaceState(null, '', '#sectionId')` called inside observer callback — no router re-renders.
- **Hash on page load** (`src/three/shared/sceneReady.ts` + `src/components/PortfolioSwitcher.tsx`): New pub/sub module. `Canvas onCreated={setSceneReady}` signals readiness. `PortfolioSwitcher` defers scroll-to-hash until `sceneReady` fires.
- **`.scroll-snap-none`** (`src/index.css`): Utility class to disable scroll-snap programmatically.

### Step 2 — Glassmorphism Content Panels

- **SectionColorProvider** (`src/three/shared/SectionColorProvider.tsx`): Maps `activeSection` index to neon color, injects `--section-neon` and `--section-neon-rgb` CSS custom properties.
- **HtmlCard rewrite** (`src/components/HtmlCard.tsx`):
  - Glassmorphism: `rgba(15, 15, 20, 0.55)` background, `blur(16px)`, `border-radius: 16px`.
  - Border/box-shadow use `rgba(var(--section-neon-rgb), X)` with `transition: border-color 600ms ease, box-shadow 600ms ease`.
  - Width: `max-width: 520px`, `width: calc(100vw - 32px)`.
  - Panel entrance delayed 200ms after `activeKey` change via `delayedKey` state. Children buffered in `Map` ref.
  - `AnimatePresence mode="wait"` sequences exit → entrance.
  - Reduced motion: renders directly, no animation wrappers.
- **SectionColorInjector** (`src/components/PortfolioSwitcher.tsx`): Wraps `PortfolioInner` to activate CSS color vars.

### Step 3 — Wireframe + Solid-Core 3D Materials

- **NeonMesh** (`src/three/shared/NeonMesh.tsx`): Reusable component rendering:
  - Wireframe shell: `MeshBasicMaterial`, `wireframe: true`, `toneMapped: false`, opacity 0.5.
  - Solid core: same geometry at 0.6× scale, `MeshStandardMaterial` with `emissiveIntensity: 1.5`, full opacity.
  - Shared neon color from `getSectionColor()`.
  - Exports `FOCAL_GEOMETRIES` (icosahedron, octahedron, torus, torusKnot, tetrahedron, dodecahedron).
- **DevScene** (`src/three/dev/DevScene.tsx`): Added `FocalObject` — one `NeonMesh` per active section at camera target `[target.x, 0.8, target.z]`.
- **MarketingScene** (`src/three/marketing/MarketingScene.tsx`): Same pattern at `[target.x, 1.2, target.z]`.

### Step 4 — Per-Section Color Palette Switching

- **CSS heading colors** (`src/index.css`): `[data-card="true"] h1..h4` inherit `var(--section-neon)`. `.text-gradient-blue` override for existing gradient headings.
- **DynamicBloom** (`src/three/shared/Scene3D.tsx`): Replaced static `<Bloom>` with component reading `activeSection`. Per-section bloom intensity array (1.0–1.8) for visual variety.
- (Color mapping, CSS vars, NeonMesh color, panel border/shadow already wired in Steps 2–3.)

### Step 5 — Idle Pulse Animation

- **Core pulse** (`src/three/shared/NeonMesh.tsx`): `useFrame` animates core `emissiveIntensity` via sine wave `0.8 + 0.6 * (1 + sin(t * 2π * 0.4))` → range 0.8–2.0, period 2.5s. Wireframe shell unchanged. Disabled when reduced motion.
- **Bloom sync** (`src/three/shared/Scene3D.tsx`): `DynamicBloom` computes same sine wave, multiplies bloom `intensity` by `pulse / 1.4`. Bloom breathes in sync with core.

### Step 6 — Particle/Spark Accent

- **ParticleAccent** (`src/three/shared/ParticleAccent.tsx`):
  - 30 particles (`THREE.Points`, `BufferGeometry`, `PointsMaterial`).
  - Neon color, `size: 0.06`, `AdditiveBlending`, `sizeAttenuation`.
  - Upward drift via `useFrame`, resets to bottom on exceed.
  - Fade: `max(0, 1 - |sectionProgress - 0.5| × 2) × 0.8` — symmetric fade at section edges for both scroll directions.
  - Disabled in lite mode (`isLowPerf`).
- Added `<ParticleAccent>` alongside `<NeonMesh>` inside each scene's `FocalObject` group.

## Post-Implementation Fixes

### Fix 1 — CSS heading colour too aggressive
- **`src/index.css`**: Restricted `[data-card="true"]` colour to `h2` only (was `h1,h2,h3,h4`). Removed `!important`. Hero gradient preserved.

### Fix 2 — Hero gradient override removed
- **`src/index.css`**: Deleted `.text-gradient-blue` override entirely.

### Fix 3 — Panel width responsive classes restored
- **`src/components/HtmlCard.tsx`**: Added back `w-[85vw] sm:w-[75vw] md:w-[65vw] lg:w-[50vw]` classes + inline `maxWidth: 520px`.

### Fix 4 — 3D geometry size compensated for camera distance
- **`src/three/shared/SectionColorProvider.tsx`**: Exported `FOCAL_SCALES` array — scale factor per section computed from camera-to-target distance (clamped 0.5–2.0).
- **`src/three/dev/DevScene.tsx` + `src/three/marketing/MarketingScene.tsx`**: `FocalObject` consumes `FOCAL_SCALES` to size `NeonMesh` consistently across varying section depths.

### Fix 5 — Playwright test suite
- **`e2e/aesthetic.spec.ts`**: 14 Canvas-independent tests covering CSS vars, panel dimensions, heading rule, nav offset, and scroll-snap utility. All pass in headless Chromium + mobile.
