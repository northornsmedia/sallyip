# SallyIP Marketing Design System — FROZEN v1.0.0
# 
# This file documents the frozen state of the enterprise marketing frontend.
# Do not modify tokens, components, or layout primitives without:
# 1. A design review with documented rationale
# 2. Visual regression baseline update (npm run test:visual:update)
# 3. INP regression check (npm run test:inp)
# 4. Cross-device QA at 1440/1024/390
#
# Frozen: 2026-09-10
# Baseline commit: (to be filled on tag)
# Components: enterprise.css, ui.jsx, MarketingLayout, MarketingNav, MarketingFooter, shots.jsx
# Pages: pages-home, pages-core, pages-ip, pages-company
# Routes: 34 enterprise static + SPA marketing router
# Assets: 10 shot files (5 real captures, 5 focus crops)

## Tokens (enterprise.css :root)
--ent-bg:#0a0b0f
--ent-bg-2:#101218
--ent-bg-3:#151923
--ent-paper:#f5f5f0
--ent-ink:#f2f3f5
--ent-ink-dim:#b8bdc9
--ent-muted:#8b91a1
--ent-faint:#5d6372
--ent-line:rgba(255,255,255,.09)
--ent-line-soft:rgba(255,255,255,.06)
--ent-line-dark:#e3e1da
--ent-accent:#5b5bf0
--ent-accent-ink:#a5a6ff
--ent-accent-dim:rgba(91,91,240,.12)
--ent-blue:#3b82f6
--ent-ok:#3fb97f
--ent-warn:#d9a13b
--ent-bad:#e0655f
--ent-radius:12px
--ent-max:1200px
--ent-font:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif
--ent-mono:'DM Mono',ui-monospace,SFMono-Regular,Menlo,monospace

## Component Contracts (must not change without freeze lift)
- MarketingNav: sticky 64px, mega-menu hover, mobile drawer, Sign In → #auth
- MarketingFooter: 4-col from FOOTER in site.js, all links go() to real routes
- MarketingLayout: nav + main + footer + IO reveal + meta per route
- Hero: eyebrow, H1 clamp 36-76px, lede, primary/ghost CTA, meta line
- Section: light/dark bands, tight/normal padding
- Split: kicker, H3, body, bullets, CTA, visual, flip
- ProductShot: <figure> with <picture> WebP/PNG, aspect-ratio, lazy/eager, scale-in on IO
- VerifiedPanel: workspace-pattern composition, DEMO DATA labelled, verdict pills
- Journey: 7 tabs, active state, panel swap
- Demos: Novelty/ClaimChart/OA/Trademark/Verification — all DEMO DATA labelled
- Tables: .ent-table-wrap for horizontal scroll ≤640px
- Reveal: IO at 0.12 threshold, 40px rootMargin, prefers-reduced-motion disables

## Breakpoints (must not change)
- 1440: max 1200 centered, 3col areas, 4col metrics, 5col footer
- 1024: drawer nav, 2col grids, 2col metrics, journey wrap 3-up
- 640: 1col all grids, hero clamp 36-44px, ghost CTA hidden, primary full-width 48px min

## Asset Registry (public/shots/)
- sallyip-chat-home (1424×749, 28.5 KB WebP) — hero eager
- sallyip-workspaces (1424×749, 31.6 KB WebP) — product eager
- sallyip-patent-drafting (1424×749, 27.5 KB WebP)
- sallyip-patent-drafting-focus (1139×412, 18.5 KB WebP)
- sallyip-chat-actions-focus (1111×330, 9.3 KB WebP)

## Visual Regression Baseline
- 13 routes × 3 viewports = 39 baseline screenshots
- 8 interactive state screenshots
- Threshold: 0.2, maxDiffPixels: 200
- Command: npm run test:visual (update: npm run test:visual:update)

## INP Baseline
- 6 routes measured: /, /product, /novelty-search, /claim-charts, /office-action-defense, /benchmarks
- Target: ≤200ms GOOD, ≤500ms NEEDS IMPROVEMENT, >500ms POOR (fail)
- Command: npm run test:inp

## Freeze Policy
- Any change to tokens, component contracts, or breakpoints requires:
  1. Visual regression baseline update approved in PR
  2. INP regression check passes
  3. Cross-device manual QA documented
  4. DESIGN_SYSTEM_VERSION.md updated with new version + rationale
- No new marketing routes without design review
- No new design tokens without audit
- No framer-motion or new animation libs on marketing pages

## Allowed Without Freeze Lift
- Content updates (copy, links, metadata) in site.js, page bodies
- Real screenshot additions to shots.jsx registry
- DEMO DATA updates in demos.jsx (must stay labelled)
- SEO metadata updates
- Bug fixes that don't affect visual layout