<!--
dw template: pull/merge request body, used by the dev agent (ticket PR) and the doc agent (docs PR).
Title: "<ID> <ticket title>" for ticket PRs, "docs: <summary>" for docs PRs.
Write everything, headings included, in workflow.json → language. Drop this comment.
-->

## Ticket
<ID> — <title> · <Linear issue URL>

## Changes
- What changed, grouped by app (`apps/api`, `apps/web`, `packages/…`), 3–8 bullets.

## Acceptance criteria
| AC | Test |
| :- | :- |
| AC-1 | `path/to/file.spec.ts` › "test name" |

## Verification
Commands run locally, all green:
```
<commands from workflow.json for the impacted apps>
```

## Notes for the reviewer
Migrations, env/config changes, follow-ups, anything risky. "None" if nothing.

---
Opened by dw:<agent>. QA status is tracked on the Linear issue.
