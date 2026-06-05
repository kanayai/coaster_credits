# E3 — Firestore quota crisis → Supabase decision

- **Identity:** Gemini Antigravity · `HANDOFF_2026-04-13.md` · 2026-04-13 (no transcript)
- **Work type:** Production incident — Firestore free-tier quota exhausted; app showing empty
  profiles and "Last cloud sync never". Decision taken to migrate Firebase → Supabase.
- **Start condition:** A real outage with user-visible symptoms; deployment pipeline already verified.
- **AI role:** Incident responder + planner — hardened security (removed build-time
  `GEMINI_API_KEY` injection), hardened JSON import, prepared recovery export files, then framed the
  migration.
- **Information burden:** Captured *as a handoff doc*, not a transcript — so the burden was
  deliberately externalised into a structured summary (summary, outcomes, runtime issue, data files,
  next actions).
- **Workflow shape:** Bounded incident with a clear written close-out. This is the *good* shape that
  the Jan sprint lacked.
- **Outcome:** **Good.** The crisis was contained and a clean migration path chosen. The handoff doc
  is operational and specific (lists exact recovery files: `family_export.cleaned.deduped.json` etc.).
- **Lessons — project:** When things got serious, I switched from terse chat to structured handoffs —
  and it worked far better. The migration was de-risked by writing state down.
- **Lessons — OS:** This is the **template for crisis/transition work**: a structured packet with
  decision, current state, data artefacts, and next actions. But note the cost — the *reasoning*
  behind "Supabase over X" is not preserved, only the conclusion. The OS should keep a thin decision
  log alongside handoffs so the *why* survives, not just the *what*.
- **Evidence:** *"Main blocker now is Firestore quota exhaustion… Database cannot exceed free quota
  even with billing enabled… 'Last cloud sync never'… Empty profile/credits view despite existing
  data in exports."*
