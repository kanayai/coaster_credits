# Synthesis — coaster_credits

Patterns across the five episodes and the structural audit.

## 1. Two evidence regimes, two failure profiles

- **Transcript era (Nov–Jan):** rich conversational record, but giant single threads (E1: 6 weeks,
  382 turns) and thrashy bursts (E2: 598 turns, 27 errors). Failure mode = **loss of control**:
  scope drift, mystery features, no visibility into agent state.
- **Handoff-doc era (Apr):** disciplined, structured, reproducible (E3, E4). Failure mode =
  **loss of reasoning**: the *why* behind decisions is gone, only conclusions survive.

The project would be best served by *combining* the two: keep the conversational record **and**
distil structured handoffs. Right now I do one or the other.

## 2. Prompting style: terse and conversational

Average user prompt ~80 characters. I drive with short nudges ("proceed", "done?", "add X") and let
the agent run ~3 turns for every 1 of mine. This is efficient on *my* effort but:

- **Good** when the prompt is self-contained and bounded (E5: pasted dataset + sharp ask = clean win).
- **Bad** when the ask is vague and broad (E2: "add park mode", "marathon feature" → confusion and
  unremovable menus).

The lever isn't prompt *length* — it's **boundedness and self-containment**, not verbosity.

## 3. Agent-state legibility is the sharpest gap

The single most repeated user utterance in the Jan sprint was a variant of **"are you done / is
this ok?"** ("have u finished?", "I see some errors, is all ok?", "done?", "DONE?"). I had no
reliable signal for *working / finished / blocked*, and no error summary. This is a pure
tooling/OS gap, not a model gap.

## 4. The AI work is invisible in git

167/168 commits are mine; the agent that wrote most of the code is absent from authorship. The only
durable record of AI contribution is the preserved transcripts and handoffs — and in the Apr era,
the reasoning wasn't preserved at all. **Preservation is a deliberate act here, and it's
inconsistent.**

## 5. What "good" looked like

E3/E4 (structured crisis + data recovery) and E5 (narrow self-contained task) are the high points:
bounded scope, externalised state, concrete artefacts. E1 succeeded but fragile; E2 was fast but
out of control.

## Carry-forward to the cross-project synthesis

- **Narrow, self-contained task packets** beat broad chat (echoes MA22019).
- **Agent-state legibility** ("done?/errors?") is a new, concrete OS requirement surfaced here.
- **Preserve both transcript and decision-rationale** — neither era did both.
- **Data-ops episodes need first-class artefact tracking.**
