<!--
dw template: epic (Linear Project + user story issues). Owner: product-engineer.
Write everything, headings included, in workflow.json → language. Drop this comment.
No implementation details: no tables, endpoints, frameworks, file paths.
-->

# Part 1 — Linear Project description

**Problem** — Who has which problem today, and how we know (evidence, feedback, metric).

**Goal** — The outcome for the user, in one or two sentences.

**Personas** — Personas concerned, linking `docs/product/personas.md#<anchor>`.

**Scope**
- In: …
- Out (explicitly not in this Project): …

**Success signals** — Observable signals that the Project worked (behaviour, metric, qualitative).

**Open questions** — Questions still open, each with an owner. Empty before the gate.

**User stories** — Ordered list of the story issues below (`<ID> — <title>`), filled after creation.

**Product docs** — `docs/product/features/<slug>.md`, glossary terms added.

---

# Part 2 — User story issue (one per story, label `labels.story`)

Title: `<verb> <object>` from the user's point of view, ≤ 70 characters.

**Story** — As a <persona>, I want <capability> so that <benefit>.

**Context** — Why now, constraints visible to the user, related stories.

**Acceptance criteria** — Testable, observable from outside, numbered. Each one must be checkable by a test without knowing the implementation.
- **AC-1** — Given <initial state>, when <action>, then <observable result>.
- **AC-2** — Given …, when …, then ….
- **AC-3 (edge case)** — Given <limit / error / empty / permission case>, when …, then ….

**Out of scope** — What this story explicitly does not cover.

**Glossary** — Domain terms used here that are defined in `docs/glossary.md`.
