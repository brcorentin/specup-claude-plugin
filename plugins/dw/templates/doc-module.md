---
summary: <App or package name> — <what it does in one sentence>.
code_paths:
  - <apps[].path>/
tickets: []
updated: YYYY-MM-DD
---
<!--
dw template: module doc, saved as docs/modules/<apps[].name>.md. Owner: doc agent.
Write everything, headings included, in workflow.json → language. Drop this comment.
Describe the current state only. Point to code, never paste it.
-->

# <name>

**Kind**: app | package · **Path**: `<path>` · **Label**: `<apps[].label>`

## Responsibility
What this module owns and what it explicitly does not.

## Entry points
| Entry | Path | Notes |
| :- | :- | :- |
| HTTP API / pages / exports | `src/main.ts` | … |

## Structure
Main folders and what lives there (one line each).

## Data
Entities, tables, migrations folder, seeds (paths).

## Dependencies
- Internal packages: …
- External services: Postgres, … (configuration keys, not values)

## Commands
From `workflow.json`: build, lint, typecheck, test, testIntegration.

## Conventions and pitfalls
Module-specific rules a developer must know before changing it.

## Related
Specs, ADRs, features (paths).
