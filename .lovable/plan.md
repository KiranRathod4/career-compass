# Taiyaar — Design Overhaul + Elite Tier

This is a very large, multi-phase build. I'll execute it in ordered phases so you can review after each one rather than dumping 30+ files in a single turn that you can't QA.

## Scope confirmation

You asked for **9 ordered workstreams** spanning a full design-system rewrite, global copy pass, 5 brand-new Elite features (AI Coach with streaming, Placement Score, Resume Analyzer, Pods with Realtime, Insider Intel), plus a security + performance sweep. Realistically this is ~3–4 days of focused work and ~40+ files. I'll do it in phases, ship each phase, and you confirm before I move on.

## Phase plan

### Phase 1 — Design system foundation (this turn)

- Rewrite `src/styles.css` with the locked token set (typography scale, color palette light+dark, spacing, radii, shadows removed, scrollbar styling, focus ring).
- Rewrite the primitive components to match spec: `button.tsx`, `input.tsx`, `card.tsx`, `badge.tsx` (status pills), `dialog.tsx` (modal), `sheet.tsx` (drawer), `sonner.tsx` (toasts), `skeleton.tsx`, `table.tsx`.
- Update `topbar.tsx` and `app-sidebar.tsx` to the 52px / 232px spec with the new active state.
- Add the page transition + list-stagger + count-up utilities.

**Deliverable:** the entire existing app immediately looks Figma/Linear-grade without touching feature code. No new pages yet.

### Phase 2 — Global copy pass

- Sweep every route + component for Hindi sentences, emojis, decorative `!`, "Enter…" placeholders.
- Apply the empty-state / toast / button-label format you specified.
- Update memory rule (already partially saved) with the final tone guide.

### Phase 3 — Elite gating primitive

- Single `<EliteGate>` inline upgrade card (gray + purple left border, no blocking modal) used by every Elite feature.
- `useIsElite()` hook reading `plan='elite'` OR active `level_rewards.elite_until > now()`.

### Phase 4 — AI Career Coach

- Migration: `ai_conversations`, `ai_messages` + RLS + indexes + GRANTs.
- Server route (not edge fn — this stack uses TanStack server routes): `src/routes/api/ai-coach.ts` that streams SSE from Lovable AI Gateway with the full context-aware system prompt built from the user's data.
- Page: `src/routes/_authenticated/coach.tsx` — two-column Notion-AI layout, streaming bubbles, suggestion chips, context panel, conversation history.
- Sidebar entry under GROW.
- Rate limit: 30 msg/hr enforced server-side via a `select count` on `ai_messages`.

### Phase 5 — Placement Probability Score

- Server fn `placementScore({companyId})` with the weighted algorithm you specified (apt 30 / dsa 35 / comm 15 / domain 20).
- Readiness section on company detail page + blurred teaser for Pro.
- Dashboard widget (top 3 companies).
- `/readiness` page with sort + filter.
- Rate limit: 20/day.

### Phase 6 — AI Resume Analyzer

- Migration: `resume_analyses` table.
- Server route that signs the storage URL, extracts PDF text (`unpdf` — Worker-compatible, not `pdf-parse` which needs Node), calls AI with the JSON tool, stores result.
- "Analyze" button + right drawer with 3-state UI (ready → analyzing steps → results) in Resume Vault.
- Rate limit: 5/day.

### Phase 7 — Accountability Pod

- Migrations: `pods`, `pod_members`, `pod_goals`, `pod_activity` (+ enable realtime publication on `pod_activity`).
- Rewrite `pod.tsx` (currently a stub) into: onboarding (create/join), active pod page with members row, you-vs-pod table, leaderboard, weekly goal, realtime activity feed.
- Activity hooks fire from existing DSA / interview / mock / application handlers.

### Phase 8 — Company Insider Intel

- Migration: `company_experiences` table + RLS (public read, auth write).
- "Insider Intel" tab on company detail page with aggregate tag cloud, difficulty average, recent experience cards.
- "Share your experience" modal with the full form you specified.

### Phase 9 — Security + performance sweep

- Run `supabase--linter` and fix.
- Add the missing composite indexes you listed.
- Wrap routes in `React.lazy` + `<ErrorBoundary>`.
- Add offline banner.
- Audit every public-facing string for service-role / Anthropic / Razorpay-secret leaks.

## What I need from you before Phase 1

Just one thing: **confirm "ship phase by phase"** is OK. If you'd rather I rush all 9 phases in one mega-turn, say so — but I'd strongly push back. At this scope, a single turn will produce broken intermediate states, unreviewable diffs, and I'll burn your context window.

Reply "go" and I'll start Phase 1 immediately.

## Technical notes (for the record)

- This stack is **TanStack Start, not Supabase Edge Functions**. AI streaming will use a TanStack server route under `src/routes/api/` returning `text/event-stream`. Same outcome, correct tool.
- PDF extraction will use `unpdf` (Worker-compatible). `pdf-parse` would crash on Cloudflare workerd.
- Realtime pod feed uses `supabase.channel().on('postgres_changes')` subscribed to the `pod_activity` insert events, which is the supported path on this stack.
- Lovable AI Gateway model: `google/gemini-3-flash-preview` for streaming chat (cheap + fast), `openai/gpt-5-mini` for resume analysis (better at structured JSON tool calls).
- No rate-limit table needed — the spec's limits are low enough to enforce with a `count()` against existing per-feature tables.