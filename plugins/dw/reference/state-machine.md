# Linear state machine

Status names below are **roles**. The real Linear state names come from `.claude/workflow.json` → `linear.statuses.<role>`. Never hard-code a state name.

```
backlog ──► productReady ──► todo ──► inProgress ──► inQa ──► readyForReview ──► done
                                          ▲            │
                                          │            ▼
                                          └──────── qaFailed
```

## Issue kinds

| Kind | Label role | Created by | Content |
| :- | :- | :- | :- |
| User story | `labels.story` | product-engineer | `templates/epic.md` → "User story issue" section |
| Technical ticket | `labels.ticket` + one app label per impacted app | em | `templates/ticket.md`; sub-issue of its story; `blocked by` relations |

Only issues labelled `labels.ticket` are picked by `/dw:run`. Stories are never developed directly.

## Transitions

| From → To | Who | When | Comment |
| :- | :- | :- | :- |
| (new) → `backlog` | product-engineer | Draft Project and stories written in Linear (`/dw:epic`) | — |
| `backlog` → `productReady` | product-engineer | User approved the Project (gate) | yes |
| (new) → `backlog` | em | Draft tickets written (`/dw:spec`) | — |
| `backlog` → `todo` | em | User approved the spec and tickets (gate). Stories of the Project move `productReady` → `todo` at the same time | yes |
| `backlog` → `todo` (story) | em | **Foundations Project only** (empty-project bootstrap): its single story is created by the em, skips `productReady` and moves with its tickets | yes |
| `todo` → `inProgress` | dev | Starts a ticket | yes |
| `qaFailed` → `inProgress` | dev | Starts rework | yes |
| `inProgress` → `inQa` | dev | Branch pushed, PR opened (or found) | yes, with PR link |
| `inQa` → `readyForReview` | qa | Every criterion covered and suites green | yes, QA report |
| `inQa` → `qaFailed` | qa | Missing coverage that could not be fixed by tests alone, or failing behaviour | yes, QA report |
| `readyForReview` → `done` | Linear ↔ forge integration | PR merged by the human | — (automatic) |

Agents never move an issue to `done`, never merge, never close a PR.

## Ready ticket (picked by `/dw:run`)

A ticket is **ready** when all of these hold:

1. It has the `labels.ticket` label and not the `labels.escalated` label.
2. Its status is `todo`.
3. Every issue it is **blocked by** is in status `done`. A blocker in `readyForReview` (PR open, not merged) or in any other state, canceled included, keeps it blocked.
4. It belongs to `linear.project` when that field is set (or to the Project passed to `/dw:run`).

Ordering among ready tickets: Linear priority Urgent (1) → High (2) → Medium (3) → Low (4) → No priority (0), then oldest `createdAt`.

Before picking new tickets, `/dw:run` resumes interrupted work in this order: `inQa` (run QA), `qaFailed` (rework, unless escalated), `inProgress` (dev resumes on the existing branch).

## Comments

Every transition made by an agent posts one short comment on the issue, in `language`, first line exactly:

```
[dw:<agent>] <from state name> → <to state name>
```

followed by at most three lines: what was done, and the link (PR URL or "QA report below"). Examples:

```
[dw:dev] In Progress → In QA
PR ouverte : https://github.com/acme/shop/pull/42 (branche ENG-12-login-form)
```

```
[dw:qa] In QA → QA Failed
Itération 2/3. Rapport ci-dessous.
<QA report from templates/rapport-qa.md>
```

### Machine-readable markers

These first-line prefixes are parsed by `/dw:run` and must be written exactly:

| Marker | Meaning |
| :- | :- |
| `[dw:qa] <inQa name> → <qaFailed name>` | One failed QA iteration. The iteration count of a ticket = number of comments starting with this marker **posted after the last `[dw:run] escalated` comment** (all of them if there is none). |
| `[dw:run] escalated` | QA loop exhausted; `labels.escalated` added; human needed. Also resets the iteration count for the next attempt. |
| `[dw:doc] documented` | Ticket already reflected in `docs/modules/` (posted by the doc agent after its PR is opened). |

End-of-Project documentation is tracked in the repo, not in Linear: the doc agent adds `delivered: YYYY-MM-DD` to the frontmatter of `docs/specs/<project-slug>.md` in its `docs/<project-slug>-final` PR. A Project is "documented" when that key is on the base branch, or when a `docs/<project-slug>-final*` branch exists on the remote (PR pending).

## Escalation

When a ticket reaches `qa.maxIterations` failed iterations, `/dw:run`:
1. adds `labels.escalated`, leaves the status at `qaFailed`;
2. posts `[dw:run] escalated` with a 3-line summary of the recurring failure and the last QA report link;
3. notifies the user and **stops the run**.

To resume after a human fix: remove the `escalated` label and run `/dw:run` again. The ticket gets a full new set of `qa.maxIterations` attempts, because only `[dw:qa]` failures after the `[dw:run] escalated` comment count. Comments are never deleted (audit trail).

## Recommended Linear team settings

- Workflow states named as in `linear.statuses` (`/dw:bootstrap` prints a checklist).
- GitHub (or other forge) integration enabled, with "on PR merge → move to Done".
- "Auto-close parent issues" enabled, so a story moves to Done when all its tickets are Done.
