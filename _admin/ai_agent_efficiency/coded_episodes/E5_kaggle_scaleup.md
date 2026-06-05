# E5 — Kaggle dataset scale-up ("top 500") — efficient counterexample

- **Identity:** Gemini Antigravity · Transcript A excerpt · late Dec 2025 / early Jan 2026
- **Work type:** Replace the small hand-wrapped coaster list with a real public-domain dataset.
- **Start condition:** A precise, self-contained request — I pasted the exact `kagglehub`
  download snippet and asked to use it.
- **AI role:** Operator on a narrow, well-specified task.
- **Information burden:** Minimal and self-contained — the prompt carried everything needed
  (dataset, method), so no thread-context reconstruction required.
- **Workflow shape:** Short, bounded request → done. Followed by one tidy follow-up
  (*"can you add the top 500 instead of the top 50"*).
- **Outcome:** **Clean win.** This is what good looks like on this project: a concrete artefact in
  the prompt, a bounded ask, an immediately useful result — no error churn, no scope drift.
- **Lessons — project:** When I gave the agent a concrete artefact and a sharp boundary, it
  delivered cleanly first time. Contrast with E2's vague broad asks.
- **Lessons — OS:** Reinforces the **narrow-task-packet** pattern from the MA22019 audit: a prompt
  that carries its own data/context and has a clear boundary is the most reliable unit of work. The
  OS should make it trivial to attach an artefact (snippet, file, dataset id) to a task.
- **Evidence:** *"can we use this to have a larger database, is public domain"* + pasted
  `import kagglehub … dataset_download(…)`; then *"can you add the top 500 instead of the top 50"*.
