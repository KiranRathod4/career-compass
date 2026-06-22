---
name: Design tokens
description: Locked color palette, font stack, and density spec for the app shell and primitives
type: design
---
Palette: Midnight Indigo. Primary `#4f46e5` (dark `#6366f1`). Deep navy surfaces `#07071a` → `#0a0a1a` → `#141432` → `#1e1e5a`.
Fonts: headings use Source Serif 4 (Claude/Anthropic Serif substitute — proprietary original unavailable). Body + UI uses Inter (Styrene/Galaxie Copernicus substitute). Mono uses JetBrains Mono. All loaded via Google Fonts `<link>` in `src/routes/__root.tsx`.
Density: Comfortable. Radii `--radius-sm 6 / md 10 / lg 12 / xl 16`. Card padding ≥16px.
Utilities: `.t-display`, `.t-h1`, `.t-serif` use serif. `.t-h2`/`.t-h3`/`.t-body` stay sans.
Never hardcode purple (`#7c3aed`, `#8b5cf6`) — those are the old theme. Use `--primary` / `bg-primary` / `text-primary` tokens.
