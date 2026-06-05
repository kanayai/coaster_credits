# Habits & Changes — coaster_credits

Personal, project-level takeaways. (System-wide requirements live in the cross-project synthesis.)

## Keep doing

1. **Lead with a concrete spec.** The 983-char opening prompt set the whole app up well (E1).
2. **Attach the artefact.** Pasting the Kaggle snippet gave the cleanest result of the project (E5).
3. **Switch to structured handoffs when it gets serious.** The Apr migration was the most
   disciplined, lowest-risk stretch precisely because state was written down (E3, E4).

## Stop doing

1. **Stop running 6-week single threads** (E1). Break a long build into checkpointed chunks so the
   project isn't hostage to one conversation.
2. **Stop broad, vague asks in fast bursts** (E2). "Add park mode / a marathon feature" produced
   features I didn't understand and couldn't remove. Ask for one bounded thing at a time.
3. **Stop accepting silent agent state.** I typed "done?" four times in three days. If the tool
   can't tell me working/finished/blocked, stop and check rather than guess.
4. **Stop letting reasoning evaporate.** The Apr handoffs recorded *what* was decided but not *why*
   Supabase, *why* that dedupe rule. Add one line of rationale per decision.

## Concrete changes for the next phase of this project

- When resuming, read only the latest handoff + a one-line decision log — not the whole transcript.
- Any feature the agent adds beyond the explicit request must be called out and made reversible.
- Keep preserving transcripts (the `migrated_prompt_history/` habit is good) **and** distil a thin
  decision log so both the conversation and the rationale survive.
