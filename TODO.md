# Aesthetic Refinement — Implementation Plan

> Source: `aesthetic-refinement.md`

---

## Step 1 — Nav/Anchor Bug Fixes

**Status: ✅ Done**

### Changes
- Created `src/constants.ts` with `HEADER_OFFSET = 80`
- Created `src/three/shared/sceneReady.ts` — pub/sub for 3D scene readiness
- Modified `src/hooks/useGsapScrollSnap.ts` — added HEADER_OFFSET to scroll position, snap disable/enable on anchor click, scrollend + timeout restore
- Modified `src/components/Nav.tsx` — IntersectionObserver now picks highest-intersection entry, multi-threshold, `rootMargin` uses HEADER_OFFSET, `history.replaceState` updates hash
- Modified `src/components/PortfolioSwitcher.tsx` — deferred scroll-to-hash on page load until `sceneReady`
- Modified `src/three/shared/Scene3D.tsx` — added `onCreated={setSceneReady}` on Canvas
- Modified `src/index.css` — added `.scroll-snap-none` utility

### Checklist
- [x] Nav anchor clicks scroll to correct offset (HEADER_OFFSET)
- [x] Active section via IntersectionObserver with best-ratio selection
- [x] Hash in URL updates via `history.replaceState`
- [x] Page load with hash waits for sceneReady before scrolling
- [x] Snap-scroll disabled during anchor navigation, restored after settle

---

## Step 2 — Glassmorphism Content Panels

**Status: ✅ Done**

### Changes
- Created `src/three/shared/SectionColorProvider.tsx` — maps active section index to neon color, sets `--section-neon` and `--section-neon-rgb` CSS custom properties on `documentElement`
- Rewrote `src/components/HtmlCard.tsx`:
  - Glassmorphism style: `rgba(15,15,20,0.55)` bg, `blur(16px)`, `border-radius: 16px`
  - Border/box-shadow use `rgba(var(--section-neon-rgb), X)` at 30%/10% opacity
  - `transition: border-color 600ms ease, box-shadow 600ms ease`
  - Width: `max-width: 520px`, `width: calc(100vw - 32px)` as spec
  - Panel entrance: 200ms delay after `activeKey` change via `delayedKey` state
  - Children buffered in a `Map` ref so old content stays visible during delay
  - `AnimatePresence mode="wait"` sequences exit → entrance properly
  - Reduced motion: renders children directly without animation wrappers
- Modified `src/components/PortfolioSwitcher.tsx` — wrapped `PortfolioInner` in `SectionColorInjector`

---

## Step 3 — 3D Materials → Wireframe + Solid-Core System

**Status: ✅ Done**

### Changes
- Created `src/three/shared/NeonMesh.tsx`:
  - Renders wireframe shell (`MeshBasicMaterial` with `wireframe: true`, `toneMapped: false`, `opacity: 0.5`)
  - Renders solid core (same geometry scaled `0.6x`, `MeshStandardMaterial` with high `emissiveIntensity: 1.5`)
  - Both layers share the same neon color prop
  - Exports `FOCAL_GEOMETRIES` array (icosahedron, octahedron, torus, torusKnot, tetrahedron, dodecahedron)
- Modified `src/three/shared/SectionColorProvider.tsx` — exported `getSectionColor(index)` for Three.js usage
- Modified `src/three/dev/DevScene.tsx`:
  - Added `FocalObject` component — one `NeonMesh` per active section at camera target position `[target.x, 0.8, target.z]`
  - Placed inside scene group after `MotherboardArt`
- Modified `src/three/marketing/MarketingScene.tsx`:
  - Same `FocalObject` approach at `[target.x, 1.2, target.z]`
  - Placed inside scene group after `MarketingArt`
- Bloom already configured in `Scene3D.tsx` with `luminanceThreshold: 0.2`, `luminanceSmoothing: 0.9`, `intensity: 1.2`

---

## Step 4 — Per-Section Neon Color Palette Switching

**Status: ✅ Done**

### Changes
- (Already done in Step 2) `SectionColorProvider.tsx` — maps `activeSection` index to color array (`SECTION_COLORS`), sets `--section-neon` and `--section-neon-rgb` CSS vars on `documentElement`
- (Already done in Step 2) `HtmlCard.tsx` — glassmorphism border/shadow uses `rgba(var(--section-neon-rgb), X)` with `transition: border-color 600ms ease, box-shadow 600ms ease`
- (Already done in Step 3) `NeonMesh` via `getSectionColor()` — each section's 3D object uses its assigned neon color
- Modified `src/index.css` — added CSS rules for `[data-card="true"] h1..h4` to inherit `var(--section-neon)` color, plus `.text-gradient-blue` override
- Modified `src/three/shared/Scene3D.tsx`:
  - Replaced static `<Bloom>` with `DynamicBloom` component
  - `DynamicBloom` reads `activeSection` from `useScrollProgress`, maps to `BLOOM_INTENSITIES` array
  - Per-section bloom intensity varies (1.0–1.8) so sections feel distinct

---

## Step 5 — Idle Pulse Animation on Focal Objects

**Status: ✅ Done**

### Changes
- Modified `src/three/shared/NeonMesh.tsx`:
  - Added `useFrame` to animate core's `emissiveIntensity` via sine wave: `0.8 + 0.6 * (1 + sin(t * 2π * 0.4))` → range 0.8–2.0, period 2.5s
  - Wireframe shell stays constant (no pulse) — uses static `wireframeOpacity` prop
  - Core material updated via ref (`coreRef.current.material.emissiveIntensity`)
  - Pulse disabled when `useReducedMotion()` is true
- Modified `src/three/shared/Scene3D.tsx`:
  - `DynamicBloom` computes same sine wave in `useFrame`, applies multiplier `base * (pulse / 1.4)` to bloom `intensity` prop
  - Bloom syncs with core pulse automatically; also respects reduced motion

---

## Step 6 — Particle/Spark Accent System

**Status: ✅ Done**

### Changes
- Created `src/three/shared/ParticleAccent.tsx`:
  - 30 particles (`THREE.Points` + `BufferGeometry` with position attribute)
  - `PointsMaterial` in section neon color, `size: 0.06`, `AdditiveBlending`, `sizeAttenuation`
  - Upward drift via `useFrame` — each particle has random velocity (0.1–0.3), resets to bottom when exceeding y=0.75
  - Fade: opacity = `max(0, 1 - |sectionProgress - 0.5| * 2) * 0.8` — particles fade in/out symmetrically at section edges in both scroll directions
  - Disabled entirely when `isLowPerf` (lite mode)
- Modified `src/three/dev/DevScene.tsx` — `FocalObject` wraps `NeonMesh` + `ParticleAccent` in a `<group>` at `[target.x, 0.8, target.z]`
- Modified `src/three/marketing/MarketingScene.tsx` — same pattern at `[target.x, 1.2, target.z]`

---

## Post-Implementation Fixes

### Fix 1 — CSS heading color rule too aggressive

**Problem:** `[data-card="true"] h1,h2,h3,h4 { color: var(--section-neon) !important }` forces ALL headings to neon color, destroying visual hierarchy.

**Fix:** Restrict to `h2` (section titles), drop `!important`.

### Fix 2 — Hero gradient text broken

**Problem:** `.text-gradient-blue` override replaces Hero's blue gradient with solid neon cyan.

**Fix:** Remove the `.text-gradient-blue` override entirely.

### Fix 3 — Panel width regression

**Problem:** HtmlCard lost responsive Tailwind width classes (`w-[85vw] sm:w-[75vw] ... max-w-[640px]`).

**Fix:** Restore responsive width classes, keep `max-width: 520px` per spec.

### Fix 4 — 3D geometry sizing vs camera distance

**Problem:** Fixed 0.6 radius geometry appears too small at far sections (hero) and too large at near sections (contact).

**Fix:** Scale the `NeonMesh` proportional to camera-to-object distance.

### Fix 5 — Playwright verification

**Problem:** No tests covering the new CSS vars, panel dimensions, or color injection.

**Fix:** Created `e2e/aesthetic.spec.ts` with 14 tests for Steps 1–4 covering:
- `--section-neon` / `--section-neon-rgb` CSS vars set on `:root`
- Hero section's `--section-neon` resolves to `#06b6d4` (cyan)
- Heading-color CSS rule `[data-card="true"] h2` references `var(--section-neon)`
- Glassmorphism outer container has `border-radius: 16px` and `max-width: 520px`
- `.scroll-snap-none` utility class exists in stylesheets
- Nav is `position: fixed`

Tests are Canvas-independent (check stylesheets, CSS vars, and non-Canvas DOM).

**Status: ✅ Done** (14/14 pass in headless Chromium + mobile)

---

---

## TypeScript Build Fixes

### Fix A — Unused `isLeaving` in HtmlCard

**Problem:** `src/components/HtmlCard.tsx:37` — `isLeaving` declared but never read → `error TS6133`.

**Fix:** Remove the unused variable declaration.

**Status: ✅ Done**

### Fix B — Missing `args` on `<bufferAttribute>` in ParticleAccent

**Problem:** `src/three/shared/ParticleAccent.tsx:53` — `<bufferAttribute>` missing required `args` prop → `error TS2741`.

**Fix:** Added `args={[positions, 3]}` to `<bufferAttribute>`, removed redundant `array`/`itemSize`.

**Status: ✅ Done**

---

## Final Verification

- [x] All testing checklist items from `aesthetic-refinement.md` pass
- [x] Register summary in `changelog.md`
- [x] `npm run build` passes without errors
