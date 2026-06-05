# Structural Audit — coaster_credits

All figures reproducible from the repo on 2026-06-05. Commands are given so they can be re-run.

## 1. Git cadence

```
git rev-list --count HEAD           → 168 commits
first → last                        → 2025-11-23 → 2026-06-05
```

Commits per month (`git log --date=format:'%Y-%m' --format='%ad' | sort | uniq -c`):

| Month | Commits | What was happening |
|-------|--------:|--------------------|
| 2025-11 | 35 | Initial build (Gemini, conversational) |
| 2025-12 | 1 | Pause |
| 2026-01 | 84 | Intense feature sprint (the two transcripts) |
| 2026-03 | 21 | Migration prep |
| 2026-04 | 25 | Firebase→Supabase migration (handoff-doc era) |
| 2026-05 | 1 | Stabilise |
| 2026-06 | 1 | Latest fix |

Two clear bursts (Jan sprint, Apr migration) separated by quiet months. Classic project rhythm:
big build, long tail of maintenance.

## 2. Commit message discipline

`131 feat / 22 fix / 4 chore / 2 refactor / 1 each of verify, sync, security, release, ci`.

Strong conventional-commit discipline — far better than the website project. **But this discipline
describes *what shipped*, not *how the agent got there*.** The feat/fix ratio (≈6:1) looks healthy;
the transcripts (below) show a much messier reality of error/fix loops that never reach git.

## 3. Author split — the AI is invisible in git

```
git shortlog -sne --all
  141  Karim Anaya-Izquierdo
   26  kai21 (same person, second identity)
    1  Gemini AI            ← a single auto-sync commit
```

**Finding:** 167/168 commits are mine. The agent that wrote most of the early code appears nowhere
in the authorship. This is the opposite of the website project, where Gemini is a tagged author on
31% of commits. Consequence: **on this project, git is useless as a record of AI contribution** —
only the preserved transcripts and handoff docs tell that story.

## 4. The transcript era (Nov 2025 – Jan 2026)

Two JSON transcripts in `migrated_prompt_history/`. Stats via `jq`:

| | Session A (`…2026-01-03…json`) | Session B (`…2026-01-06…json`) |
|---|---|---|
| Real span (from timestamps) | **2025-11-23 → 2026-01-03** (6 weeks) | 2026-01-03 → 2026-01-06 (3 days) |
| Total turns | 382 | 598 |
| Model / user turns | 288 / 94 | 455 / 143 |
| Model:user ratio | 3.1 : 1 | 3.2 : 1 |
| Model *thinking* blocks | 99 | 153 |
| Code-generation events | 82 | 135 |
| `error` events | 5 | **27** |
| `fixingErrors` events | 5 | 9 |
| Total user text | 8,216 chars | 10,879 chars |
| Avg user prompt length | ~87 chars | ~76 chars |
| Longest single user prompt | 983 chars | 460 chars |

Reproduce: `jq 'length'`, `jq -r '.[].author' | sort | uniq -c`,
`jq -r '.[].payload.type' | sort | uniq -c`, min/max of `.[].createdTimestamp`.

**Key observations:**

- **Session A is a single 6-week thread.** The entire foundational app (Nov 23 opening spec →
  early Jan) lived in one continuous conversation of 382 turns. Not restarted, not checkpointed —
  one long thread.
- **Prompts are terse and conversational.** Average ~80 characters. Examples (verbatim):
  "proceed", "add option to remove credits", "the delete credit feature is not working",
  "can we use this to have a larger database". The opening prompt (983 chars) is the one substantial
  spec; everything after is small iterative nudges.
- **~3 model turns per user turn** — I drive briefly, the agent runs long.
- **Session B is error-heavy:** 27 error events in 3 days. The Jan sprint was a rapid, somewhat
  thrashy refinement burst (multi-coaster logging, name standardisation, ranking moves).

## 5. The handoff-doc era (Apr 2026) — transcript-less

The Firebase→Supabase migration was run as a chain of handoff documents, **with no preserved
transcripts**:

- `HANDOFF_2026-04-13.md` — Firestore quota exhausted; decision to move to Supabase.
- `HANDOFF_2026-04-17.md` — large coaster catalogue import (Kaggle, 1,087 rows).
- `HANDOFF_2026-04-19.md` — production Supabase runtime fixes, OAuth redirect issues.
- `HANDOFF_2026-04-22_FRESH_START_CREDITS.md` — data import and profile recovery.

These are well-structured (summary, decisions, git state, next actions) but they are *summaries* —
the actual agent reasoning and the failed attempts are gone. This is the inverse evidence problem
to the transcript era: structured continuity, zero conversational record.

## 6. Codex involvement (minor)

3 Codex rollout sessions reference the repo (`~/.codex/sessions/2026/{03/31,04/01,06/01}`),
consistent with light cross-tool touches around the migration window. Not a primary tool here.

## Summary table

| Dimension | Finding |
|---|---|
| Primary agent | Gemini Antigravity |
| AI visibility in git | Effectively zero (1/168 commits) |
| Evidence regimes | Transcript era (Nov–Jan) + handoff-doc era (Apr) |
| Prompting style | Very terse, conversational, iterative |
| Thread shape | Giant single threads (one ran 6 weeks / 382 turns) |
| Error load | Low early, heavy in Jan sprint (27 errors / 3 days) |
| Main evidence gap | Apr migration reasoning unrecoverable (no transcript) |
