# AI-Agent Efficiency Audit — coaster_credits

What this folder is: a small, evidence-based audit of how this project was actually built with
AI agents (mainly **Gemini Antigravity**), so I can (a) see my own good and bad habits and
(b) feed concrete requirements into my agentic OS and memory systems.

It mirrors the larger MA22019 audit
(`Teaching/MA22019/ma22019_website/_admin/ai_agent_efficiency`) but condensed, because this is a
smaller project. The cross-project conclusions live in
`karim-ai-os/analysis/ai_usage_cross_project_synthesis.md`.

## What evidence exists here (and why it matters)

This project is **transcript-rich** — unusually, the actual agent conversations were preserved:

- `migrated_prompt_history/*.json` — two full Gemini Antigravity transcripts (~980 turns total,
  with user/model turns, model *thinking*, code-generation events, and millisecond timestamps).
- `HANDOFF_2026-04-*.md` — four handoff docs from the later Firebase→Supabase migration phase.
- `git log` — 168 commits, Nov 2025 → Jun 2026.
- 3 Codex sessions touched the repo (Mar 31, Apr 1, Jun 1) — minor.

Important quirk: **the AI work leaves almost no git trail.** Only 1 of 168 commits is authored by
"Gemini AI" (an auto-sync). Everything the agent built was committed under my own name. So unlike
the website audit, git tells you almost nothing here — the transcripts are the real record.

## Reading order

1. `structural_audit.md` — the numbers: cadence, transcript stats, the two evidence eras.
2. `coded_episodes/` — 5 sampled work episodes coded against a common template.
3. `synthesis.md` — the patterns, good and bad.
4. `habits_and_changes.md` — what to keep doing, what to stop.

## Headline finding

Two distinct evidence regimes, two distinct risk profiles: a **conversational transcript era**
(Nov–Jan, terse iterative prompting in giant single threads, error-heavy) and a **handoff-doc era**
(Apr migration, structured but transcript-less). The single biggest habit issue is **driving long
agent runs with very short prompts and no preserved decision record outside the transcript** — when
the transcript isn't kept (as in Apr), the reasoning is simply gone.
