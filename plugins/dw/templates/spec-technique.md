---
summary: Technical spec of the <Project name> Linear Project.
code_paths: []
tickets: []
updated: YYYY-MM-DD
---
<!--
dw template: technical spec, saved as docs/specs/<project-slug>.md. Owner: em.
Write everything, headings included, in workflow.json → language. Drop this comment.
Point to code paths instead of pasting code. One spec per Linear Project.
-->

# <Project name> — technical spec

**Linear Project**: <url> · **Stories**: <ID>, <ID> · **ADRs**: `docs/architecture/NNNN-<slug>.md`

## 1. Summary
What will be built, in five lines max, mapped to the stories.

## 2. Current state
Relevant existing code and docs, as paths: modules, entities, endpoints, pages. What is reused, what changes.

## 3. Design
### 3.1 Data model
Entities, columns, constraints, indexes, migrations (file names to create under the migrations folder).
### 3.2 API / contracts
Endpoints or messages: method, path, request, response, errors, auth. Shared types package if any.
### 3.3 Front-end
Routes, components, state, data fetching.
### 3.4 Cross-cutting
Security, permissions, validation, errors, observability, performance, i18n.

## 4. Decisions
Each non-trivial choice links an ADR. Alternatives considered in one line each.

## 5. Test strategy
Per story: which acceptance criteria are covered by unit tests, which by integration tests (real Postgres), fixtures needed. Commands from `workflow.json`.

## 6. Ticket breakdown
| Ticket | Title | App label(s) | Blocked by | Stories / AC |
| :- | :- | :- | :- | :- |
| <ID> | … | app:api | — | <story ID> AC-1, AC-2 |

Independent tickets first; a ticket is blocked only when it truly needs another one merged.

## 7. Risks and open points
Risk, impact, mitigation. Must be empty or accepted before the gate.
