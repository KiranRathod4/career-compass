## Taiyaar — Phased rollout of 11 new systems

Shipping in 4 phases to keep each turn reviewable. Existing design tokens, auth, Razorpay, gamification, AI features remain untouched.

### Phase 6 (this turn) — Foundations
1. **DB migration** — new tables: `documents`, `placement_events`, `level_rewards`, `distraction_logs`, `custom_tracks`, `custom_track_topics`, `custom_track_questions`, `arena_questions`, `daily_puzzle_attempts`, `duels`, `arena_leaderboard`, `study_leaderboard`, `system_events`. Add `username`, `study_windows`, `leaderboard_opt_in` to `profiles`. Storage bucket `documents` (private) + RLS.
2. **Resume Vault (F1)** — device upload to `documents` bucket, signed URLs, file rows in `documents` table.
3. **Dashboard fixes (F2)** — upcoming interviews (from `jobs` where status='interview' within 14d), upcoming placement events, live weekly challenges progress.
4. **Distraction Tracker (F9)** — global "Distract ho gaya" button + modal, -10 XP, logs to `distraction_logs`.
5. **Level Rewards (F4)** — detect level-up, insert `level_rewards` row, integrate with `usePlan` (active Elite reward → elite tier).
6. **Sidebar updates** — add Calendar, Arena, Rankings entries (stub pages OK), Custom Track entry.

### Phase 7 — Calendar + Custom Tracks
- F5 Smart Calendar (month/week/agenda + auto-events from jobs/sprints/events).
- F6 Custom Prep Tracks (builder, topics, questions, AI roadmap via Lovable AI).
- F10 System events seed + suggestions.

### Phase 8 — Arena
- F7 Arena page (dark theme, lock by study windows).
- Daily puzzles (3/day), Math Sprint, Memory, Word Unscramble, Logic Grid.
- Duels via Supabase Realtime.
- F11 Seed 100 arena questions + 20 unscramble words.

### Phase 9 — Portfolio + Rankings
- F3 Profile drawer (right-side) + public `/u/:username` portfolio page with heatmap, stats, radar, badges. OG tags.
- F8 Study Leaderboard (`/rankings`) with all/college/pod tabs.

### Technical notes
- Storage: bucket `documents` private, RLS on `storage.objects` keyed on `auth.uid()::text = (storage.foldername(name))[1]`. Signed URLs (1h) for downloads.
- Level rewards: extend `usePlan` to UNION subscriptions + active level_rewards; effective plan = max(subscription.plan, 'elite' if reward active).
- Public portfolio uses `supabaseAdmin` in a public server route under `/api/public/portfolio/:username`.
- Realtime channels for duels: `duel:{invite_code}`.

Proceeding with Phase 6 now.