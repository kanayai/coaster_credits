# E1 — Foundational app build

- **Identity:** Gemini Antigravity · Transcript A (`…2026-01-03…json`) · 2025-11-23 → 2026-01-03 (≈6 weeks, one thread)
- **Work type:** Greenfield build of the whole app (UI, search, credits, profiles, bucket list).
- **Start condition:** One substantial opening spec (983 chars) describing the app vision, then
  terse iterative requests.
- **AI role:** Operator + architect + designer, all at once — it chose the stack (React/Vite),
  scaffolded everything, and iterated on features.
- **Information burden:** Low per-prompt (avg ~87 chars) but cumulatively huge — all context lived
  inside one ever-growing 382-turn thread. No external state; the thread *was* the memory.
- **Workflow shape:** Single continuous conversation across 6 weeks. 288 model turns to 94 user
  turns (3:1). Never checkpointed, never restarted.
- **Outcome:** Successful — a working app emerged. Efficient in *my* effort (terse prompts), but
  fragile: everything depended on one unbroken thread. Only 5 error events, so the early build was
  relatively clean.
- **Lessons — project:** The opening spec was good and paid off; the iterative nudges worked
  because the thread held context. The risk was concentration: lose the thread, lose everything.
- **Lessons — OS:** A 6-week single thread is a memory-system smell. The agentic OS should make
  *checkpointing a long build into durable external state* the default, so the project isn't hostage
  to one conversation. The fact that this transcript was later "migrated" and preserved is exactly
  the behaviour to systematise.
- **Evidence:** Opening prompt — *"I would like to create a mobile application that counts 'roller
  coaster credits'… search by country, theme/park, type… number of coasters displayed at the initial
  page… adding more accounts for family…"*. Then: *"proceed"*, *"add option to remove credits"*.
