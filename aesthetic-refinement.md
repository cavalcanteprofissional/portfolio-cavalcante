You are refining the visual quality and fixing navigation bugs in the already-implemented 
Three.js/R3F scrollytelling system. Do NOT refactor architecture — this is a targeted aesthetic 
and bug-fix pass only.

## 1. 3D object aesthetic — neon tech style

### Material system
Replace current materials with a mixed wireframe/solid approach per object:
- Wireframe shell: `MeshBasicMaterial` or custom ShaderMaterial with wireframe:true, emissive 
  color at high intensity — this is the outer "cage" of each object
- Solid core: a smaller inner mesh (same geometry scaled down ~0.6x) using `MeshStandardMaterial` 
  with high emissive intensity, visible at the "focal point" of each section
- Both layers share the same section color (see palette below) but at different opacities: 
  wireframe ~0.4–0.6 opacity, solid core full opacity
- Apply bloom post-processing (`@react-three/postprocessing` EffectComposer + Bloom) tuned so 
  the solid core glows intensely and the wireframe shell has a softer ambient glow

### Per-section neon color palette
Assign one dominant neon color per section. Suggested mapping (adjust to actual section order):
- Hero       → Cyan      #06b6d4  (cold, electric, establishing)
- About      → Sky Blue  #0ea5e9  (familiar, human, informational)
- Skills     → Violet    #7c3aed  (technical depth, AI/ML accent)
- Projects   → Emerald   #10b981  (output, growth, achievement)
- Contact    → Rose      #f43f5e  (warm CTA, stands out from rest)

Each section's active object, bloom glow, and glassmorphism panel border all share that 
section's assigned color — the entire scene "tints" to the section color as the camera arrives.

### Idle animation while section is active (pulsing glow)
When the camera is resting at a section (scroll progress is within that section's range), 
the focal solid-core mesh pulses:
- Animate `emissiveIntensity` between 0.8 and 2.0 using a sine wave (useFrame + elapsed time)
- Animate bloom `intensity` in sync (pass a ref/signal to the Bloom effect)
- Pulse period: ~2.5–3s, smooth and slow — not a flash, a breathing rhythm
- Wireframe shell does NOT pulse — it stays at constant low glow so the pulse reads clearly 
  on the core only

### Particle/spark accent (lightweight)
Add a sparse particle system around each focal object while its section is active:
- 20–40 particles max per object (performance-conscious)
- Small points (`PointsMaterial`) in the section's neon color, slight random drift upward
- Fade in when section becomes active, fade out on transition
- In lite mode: disable entirely

## 2. Glassmorphism content panels

### Visual style
Apply consistently to ALL section content panels (drei `<Html>` or overlay divs):
```css
background: rgba(15, 15, 20, 0.55);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 1px solid <section-neon-color-at-30%-opacity>;
border-radius: 16px;
box-shadow:
  0 0 0 1px <section-neon-color-at-10%-opacity>,
  0 8px 32px rgba(0, 0, 0, 0.4),
  inset 0 1px 0 rgba(255,255,255,0.05);
```
- The border and box-shadow neon color updates to match the active section's color (CSS custom 
  property `--section-neon` injected via JS on section change, transitioned with 
  `transition: border-color 600ms ease, box-shadow 600ms ease`)
- Typography inside panels: white/slate-100 for body, section neon color for headings and 
  highlighted keywords
- Panel width: max 520px on desktop, full-width minus 32px padding on mobile

### Panel entrance animation
Let the assistant choose the most fluid option given the camera movement style, but the 
entrance must:
- Start AFTER the camera finishes arriving (don't overlap camera move + panel appear — 
  sequence them with a short delay, e.g. panel animates in 200ms after camera settles)
- Use Framer Motion for the panel animation (not Three.js) since panels are HTML
- Exit animation: reverse of entrance, starts BEFORE camera begins moving to next section
- Respect `prefers-reduced-motion`: opacity-only fade, no translate/scale

## 3. Navigation anchor bug fixes

### Problems to fix
- Nav anchor clicks must scroll to the correct section start position accounting for any 
  fixed header height offset (use a `HEADER_OFFSET` constant, measure actual header height)
- Active section detection: use an `IntersectionObserver` on each section's root element 
  (threshold: 0.5 or the section's visible area, whichever makes more sense per section height) 
  to update a `activeSection` state — do NOT use scroll position math for this, it drifts
- Hash in URL must update as user scrolls between sections (use 
  `history.replaceState(null,'', '#sectionId')` inside the IntersectionObserver callback, 
  NOT `router.push` to avoid re-renders)
- On page load with a hash in URL: wait for 3D scene to finish initializing before 
  scrolling to the target section (add a `sceneReady` flag, defer the scroll-to-hash 
  until it resolves)
- The snap-scroll behavior must not fight anchor clicks: on anchor click, temporarily 
  disable the snap logic, scroll to target, re-enable after scroll settles 
  (~600ms timeout or use scrollend event if available)

### Nav visual (no changes requested — just ensure these still work after fixes)
- Keep existing nav visual unchanged
- Only fix functional behavior: correct offset, correct active detection, correct hash, 
  correct snap interaction

## Implementation order
1. Fix nav/anchor bugs first (isolated, lower risk)
2. Apply glassmorphism panel styles + entrance animation
3. Refactor 3D materials to wireframe+solid-core system
4. Add per-section color palette switching (CSS custom property + bloom color)
5. Add idle pulse animation to focal objects
6. Add particle system last (easiest to cut if performance is a concern)

## Testing checklist
- [ ] Each section's neon color is visually distinct and consistent across object glow, 
  bloom, panel border, and headings
- [ ] Pulse animation is smooth, never flickers or jumps
- [ ] Glassmorphism panels are readable over the 3D scene on both light and dark section 
  backgrounds (check contrast ratio — section neon on dark panel background must be ≥4.5:1)
- [ ] Panel entrance never overlaps camera movement (sequenced correctly)
- [ ] Nav anchor clicks land on the correct section with correct offset
- [ ] Active section in IntersectionObserver updates correctly when scrolling in both 
  directions
- [ ] Hash in URL stays in sync with visible section
- [ ] Page load with hash (#projects etc.) scrolls to correct section after scene init
- [ ] Snap-scroll does not conflict with anchor click navigation
- [ ] Lite mode: particles disabled, bloom simplified, pulse still works (it's cheap)
- [ ] Reduced-motion: pulse disabled, panels fade-only, camera static