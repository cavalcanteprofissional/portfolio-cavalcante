You are working on a React 19 + TypeScript + Tailwind CSS + Framer Motion + i18next (PT/EN/ES) 
portfolio project deployed on GitHub Pages at:
https://cavalcanteprofissional.github.io/portfolio/

## Goal
Split the single-page portfolio into TWO complete portfolios that live in the same app:
1. "Dev" portfolio (already exists — current content, dark theme, Sky Blue #0ea5e9 / Violet #7c3aed accents)
2. "Marketing Digital" portfolio (new — placeholder content, same dark background, but a DIFFERENT accent color palette of your choosing that complements the dark theme without clashing with the dev side)

A floating toggle button switches between them with a continuous horizontal slide transition 
(like swapping screens left-to-right / right-to-left), NOT a fade or simple route change.

## Architecture decisions (already made — follow exactly)
- URL stays the same base path (https://cavalcanteprofissional.github.io/portfolio/) — only the 
  hash changes per section (e.g. #hero, #about, #projects), same as current behavior. Do NOT use 
  separate routes like /dev or /marketing.
- Use a state value (e.g. `activePortfolio: 'dev' | 'marketing'`) to control which portfolio renders.
- Persist the active portfolio choice in `sessionStorage` (optional but recommended) so a refresh 
  doesn't jump back to dev unexpectedly — confirm with existing app patterns before adding this.
- When toggling, ALWAYS reset scroll position to the top (Hero section) of the destination 
  portfolio — do not try to preserve scroll position or match equivalent sections.
- The two portfolios share the same dark background and overall visual language (typography, 
  spacing system, animation style) but have fully independent section structures, copy, and 
  accent colors. They are NOT just a palette swap — content, layout, and sections can differ 
  (e.g. dev has "Tech Stack" / "GitHub Projects", marketing might have "Campaigns" / "Growth 
  Metrics" / "Tools" sections — invent appropriate placeholder sections and content for marketing).

## Toggle component requirements
- Floating, fixed position on screen (e.g. bottom-right or top-right corner — pick one and keep 
  it consistent across breakpoints), always visible regardless of scroll position, with a high 
  z-index so it never gets covered.
- Should clearly indicate current mode and what it switches TO (e.g. a two-state pill/switch 
  showing "</> Dev" and "📈 Marketing" with the active one highlighted).
- Must be accessible: proper aria-label, keyboard focusable, visible focus state.
- Respect `prefers-reduced-motion` — fall back to instant switch with no slide if set.

## Slide transition requirements (the hard part)
- Use Framer Motion with `AnimatePresence` (mode="wait" or custom exit-before-enter as needed) 
  to orchestrate the transition.
- Both portfolios should exist as separate top-level components (e.g. `<DevPortfolio />` and 
  `<MarketingPortfolio />`), each containing their own full set of sections.
- Transition behavior:
  - Toggling FROM dev TO marketing: dev portfolio slides out to the LEFT (translateX: 0 → -100%) 
    while marketing portfolio slides in FROM the RIGHT (translateX: 100% → 0), simultaneously, 
    creating a continuous "filmstrip" feel — not a fade, a literal horizontal slide.
  - Toggling FROM marketing TO dev: exact mirror — marketing slides out to the RIGHT, dev slides 
    in FROM the LEFT.
  - Direction of the slide should always reflect logical "direction" of the toggle (dev is treated 
    as the "left" page, marketing as the "right" page conceptually, regardless of which is active).
- Both portfolios should be positioned absolutely (or in a flex container with overflow-x: hidden) 
  during the transition so they appear to occupy the same screen space momentarily, sliding past 
  each other — avoid layout collapse/reflow during the animation.
- Transition duration: ~500–600ms, easing: a smooth custom cubic-bezier or Framer's built-in 
  "easeInOut" — avoid bouncy/spring effects here, this should feel clean and deliberate.
- After the transition completes, unmount the outgoing portfolio from the DOM (don't keep both 
  mounted simultaneously at rest) to avoid duplicate IDs/hash navigation conflicts.
- Lock body scroll / disable the toggle button briefly during the animation to prevent 
  double-triggering or scroll jumps mid-transition.

## Content requirements for new Marketing Digital portfolio
Create realistic placeholder content (in the same trilingual i18next structure as the existing 
dev portfolio — PT/EN/ES) for sections such as:
- Hero (headline + subheadline positioning Lucas as a Digital Marketing specialist)
- About (bridging his Data Analyst / AI background into a marketing analytics angle)
- Skills/Tools (e.g. Google Analytics, Meta Ads, SEO, content strategy, social media management, 
  copywriting, campaign optimization — adjust based on plausible overlap with his actual skill set)
- Case Studies / Campaigns (2–3 placeholder cards with metrics like reach, engagement, conversion 
  — clearly marked as placeholder/example data)
- Contact (can reuse/share the same contact section logic as dev portfolio if appropriate)

Pick an accent color (or two) that pairs well with the existing dark background (Slate 900/800) 
and contrasts clearly with the dev side's Sky Blue/Violet — explain your color choice briefly in 
a code comment.

## File structure suggestions
- `src/components/PortfolioToggle.tsx` — the floating toggle button
- `src/components/DevPortfolio.tsx` — wraps existing dev sections (refactor current page into this)
- `src/components/MarketingPortfolio.tsx` — new marketing sections
- `src/components/PortfolioSwitcher.tsx` — the AnimatePresence wrapper handling the slide logic
- Update `src/App.tsx` to render `<PortfolioSwitcher />` (after the boot screen, if that's already 
  implemented) instead of directly rendering the dev portfolio
- Add new i18next translation keys under a `marketing` namespace/section in the existing PT/EN/ES 
  translation files

## Testing checklist to confirm before finishing
- [ ] Toggle works in both directions with correct slide direction
- [ ] No layout shift, scroll bar flicker, or content flash during transition
- [ ] Scroll resets to top/hero on every switch
- [ ] Hash-based section links work correctly within each portfolio independently
- [ ] Reduced-motion users get instant switch, no slide
- [ ] Works across mobile breakpoints (toggle remains accessible, slide doesn't cause horizontal 
  overflow on small screens)
- [ ] All three languages (PT/EN/ES) render correctly for new marketing content

## Deliverables
1. `PortfolioToggle.tsx`, `DevPortfolio.tsx`, `MarketingPortfolio.tsx`, `PortfolioSwitcher.tsx`
2. Updated `App.tsx`
3. Updated i18next translation files (PT/EN/ES) with new marketing namespace
4. Brief summary comment explaining the chosen marketing accent color and why