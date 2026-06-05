# E2 — January feature sprint

- **Identity:** Gemini Antigravity · Transcript B (`…2026-01-06…json`) · 2026-01-03 → 2026-01-06 (3 days)
- **Work type:** Rapid feature refinement — multi-coaster logging, park line-up, name
  standardisation, rankings, "park mode", "marathon" feature, photo galleries, social posting.
- **Start condition:** Continuation of the build, no fresh framing — straight into requests.
- **AI role:** Operator, running fast and broad.
- **Information burden:** Low per-prompt (avg ~76 chars), but **27 error events in 3 days** — the
  thread carried a heavy load of broken intermediate states.
- **Workflow shape:** 598 turns, 455 model / 143 user (3.2:1). Very high throughput, very thrashy.
- **Outcome:** **Mixed.** Lots shipped, but with visible loss of control:
  - *Scope drift / mystery features:* the agent added things I didn't fully understand —
    *"I do not understand the 'marathon' feature, can you explain and may decide to improve or delete"*
    and *"I've got a menu called continue marathon and do not know how to remove it?"*
  - *No visibility into agent state:* I repeatedly asked *"have u finished?"*, *"I see some errors,
    is all ok?"*, *"done?"*, *"DONE?"* — I could not tell whether the agent was finished or whether
    the errors mattered.
- **Lessons — project:** Going broad and fast on a 3-day burst produced features I neither asked for
  clearly nor could remove easily. The error/fix churn never surfaced to me except as anxiety
  ("is all ok?").
- **Lessons — OS:** Two concrete requirements: (1) **agent-state legibility** — I should never have
  to type "done?" four times; the system should surface a clear "working / finished / blocked"
  signal and an error summary. (2) **scope guardrails** — features added beyond the explicit request
  should be flagged and reversible, not left as mystery menus.
- **Evidence:** *"some rides fetched by magic search are not up to date… Goliath is now called
  Chupacabra"*; *"fix and standardise names does not seem to be working in the last version"*;
  *"done?"* / *"DONE?"*.
