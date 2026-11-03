<!--
dw template: technical ticket (Linear issue). Owner: em.
Labels: labels.ticket + one app label per impacted app (apps[].label). Parent: its user story.
Relations: "blocked by" only for real merge dependencies.
Write everything, headings included, in workflow.json → language. Drop this comment.
Title: imperative, ≤ 70 characters, no ticket ID.
-->

## Context
Why this ticket exists, in 2–4 lines. Story: <story ID>. Spec: `docs/specs/<project-slug>.md#<section>`. ADR: `docs/architecture/NNNN-<slug>.md` (if any).

## Scope
- **Apps**: `api` (`apps/api`), …
- **Files to create or change** (expected, not exhaustive):
  - `apps/api/src/<module>/<file>.ts` — what changes
  - `apps/api/test/<file>.int-spec.ts` — integration test
- **Out of scope**: what must not be touched in this ticket.

## Acceptance criteria
Each criterion is testable and maps to at least one automated test (unit or integration).
- [ ] **AC-1** — Given …, when …, then ….
- [ ] **AC-2** — Given …, when …, then ….
- [ ] **AC-3 (edge case)** — ….

## Dependencies
Blocked by: <ID>, <ID> — or "none". Must match the Linear "blocked by" relations exactly (fallback when relations cannot be read).

## Verification
Commands to run from the repo root (from `workflow.json` → `apps[].commands`), all must pass:
```
<lint command>
<typecheck command>
<unit test command>
<integration test command, preceded by env.start if needed>
```

## Notes for implementation
Optional: constraints, existing helpers to reuse (paths), pitfalls. No full solution.
