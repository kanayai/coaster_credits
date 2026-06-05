# Recovered Antigravity Transcripts — coaster_credits

These are Gemini Antigravity agent transcripts for this project, **recovered from the iMac
(Mac D, serial `C02GP05BQ6XJ`)** on 2026-06-06, before Antigravity's rolling ~6-week local store
ages them off.

## Why these exist

Antigravity keeps its agent record (`~/.gemini/antigravity*/brain/<uuid>/`) only for ~6 weeks per
machine. The project's original **build** transcripts (Nov 2025–Jan 2026) are already lost on every
Mac; only the hand-exported `../migrated_prompt_history/*.json` survived from that era. A multi-Mac
scan (see `karim-ai-os/analysis/antigravity_multimac_scan_plan.md`) found that the **late-April
Supabase-migration era and some recent June sessions still survived on the iMac** — so they were
pulled here while they still existed.

## What's here (5 brains, ~448 KB)

| Brain UUID | Date | Format | Size | Notes |
|------------|------|--------|------|-------|
| a808e071… | 2026-04-26 | `overview.txt` (37 steps) | 24 KB | opens "what is next in this project?" — migration-era |
| e53e0040… | 2026-04-26 | `overview.txt` (4 steps) | 4 KB | short |
| 0855fd50… | 2026-04-28 | `overview.txt` (13 steps) | 8 KB | migration-era |
| 71a50d43… | 2026-06-05 | `transcript.jsonl` (112 lines) | 208 KB | recent session |
| da8d9555… | 2026-06-05 | `transcript.jsonl` (84 lines) | 192 KB | recent session |

Two transcript formats appear: older brains use `overview.txt` (a structured step log: user
requests, model planner responses, tool calls, timestamps); newer brains use `transcript.jsonl`.
Any future snapshot tool must handle both.

## Value

This recovers genuine *reasoning* for coaster's Apr migration work, which the audit previously had
only as `HANDOFF_*.md` summaries (the *what*, not the *why*). One empty stub brain (`9d3ce303…`,
no transcript, 43 MB of cached media) was found and **excluded**.

Read-only artefacts. Provenance: `~/.gemini/antigravity-ide/brain/<uuid>/.system_generated/` on the iMac.
