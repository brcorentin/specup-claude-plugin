---
name: run
description: Sequential dw orchestrator. Picks the next ready Linear ticket (all blockers Done, by priority), runs the dev agent then the QA agent (up to qa.maxIterations round trips), and repeats until nothing is ready; ends with a recap of the PRs to review.
argument-hint: "[linear-project-name]"
disable-model-invocation: true
---

# /dw:run

You are the dw orchestrator. You **never implement, test, or review code yourself**: you select tickets, spawn agents, read their `DW_RESULT` blocks, enforce the loop limits, and report. One ticket at a time, never in parallel.

Plugin root: `${CLAUDE_PLUGIN_ROOT}`. When a plugin file mentions `${CLAUDE_PLUGIN_ROOT}`, it means this path. Read:
- `${CLAUDE_PLUGIN_ROOT}/reference/state-machine.md` — roles, readiness rule, comment markers, escalation (authoritative)
- `${CLAUDE_PLUGIN_ROOT}/reference/workflow-json.md`
- `${CLAUDE_PLUGIN_ROOT}/reference/forges/<forge.type>.md` — for the recap

Speak to the user in `workflow.json` → `language`. Project filter: `$ARGUMENTS` if given, else `linear.project`, else all Projects of `linear.team`.

## 0. Preconditions

1. `.claude/workflow.json` exists (else: run `/dw:bootstrap`, stop).
2. `git status --porcelain` empty; `git fetch <remote>`; `git switch <baseBranch>`; `git pull --ff-only <remote> <baseBranch>`.
3. Linear reachable (read-only call). Forge reachable: the adapter's `check` operation; if it fails or no adapter exists for `forge.type`, warn that PRs will use the fallback of `${CLAUDE_PLUGIN_ROOT}/reference/forges/README.md`.
4. For each Project in scope that has `todo` tickets, `docs/specs/<project-slug>.md` exists on the base branch. If missing, the spec PR is not merged: tell the user, exclude that Project, continue with the others.

## 1. Documentation catch-up

1. **Merged tickets**: list tickets (label `labels.ticket`) in status `done` in scope whose comments contain no `[dw:doc] documented` marker. If any, spawn `dw:doc` with `mode: modules` and `tickets: <IDs>`.
2. **Finished Projects**: for each Project in scope whose tickets are all `done` and that is not yet documented (rule in state-machine.md: no `delivered:` key in `docs/specs/<project-slug>.md` on the base branch and no remote branch `docs/<project-slug>-final*`), spawn `dw:doc` with `mode: project` and `project: <name>`.

Record the docs PRs. A `blocked` doc result is reported in the recap but does not stop the run. Make sure you are back on the base branch with a clean tree.

## 2. Loop

Repeat:

### 2.1 Select

Fetch tickets in scope with label `labels.ticket`, without label `labels.escalated`. Pick, in this order:
1. status `inQa` → **QA** (dev already done);
2. status `qaFailed` → **dev, mode `rework`**;
3. status `inProgress` → **dev, mode `resume`**;
4. status `todo` and **ready** per the readiness rule (every `blocked by` issue in status `done`; read relations from Linear, cross-check the ticket's "Dependencies" section and treat the union as blockers) → **dev, mode `new`**, highest priority first (Urgent, High, Medium, Low, No priority), then oldest.

None → go to **3. Recap**.

**Branch of an existing ticket** (inQa, qaFailed, inProgress): the branch named in the latest `[dw:dev]` comment, else `git branch -r --list "<remote>/<ID>-*"`, else a local `git branch --list "<ID>-*"`. None found: for `inQa`/`qaFailed`, stop with the reason in the recap (human needed); for `inProgress`, use dev mode `new` instead.

Announce in one line: ticket ID, title, step.

### 2.2 Cycle for one ticket

```
iteration = number of comments starting with "[dw:qa] <inQa name> → <qaFailed name>"
            posted after the last "[dw:run] escalated" comment (all of them if none)
```

0. **Limit first**: if `iteration >= qa.maxIterations` → **escalate** now (the run was interrupted before escalating), without spawning anything.

1. **Dev** (unless the selection was `inQa`): spawn `dw:dev` with only
   ```
   ticket: <ID>
   mode: new | rework | resume
   branch: <branch>        # rework and resume only
   ```
   `blocked` → notify, go to **3. Recap** with the reason (stop the run). `done` → keep `branch` and `pr`. Do not keep or forward anything else from the dev's reply.
2. **QA**: spawn `dw:qa` with only
   ```
   ticket: <ID>
   branch: <branch>
   iteration: <iteration + 1>/<qa.maxIterations>
   ```
   Never pass the dev's summary, reasoning, or reply.
3. Read the QA status:
   - `ready_for_review` → record `<ID>, PR` as delivered. Back to the base branch (`git switch <baseBranch>`), next selection.
   - `qa_failed` → `iteration += 1`. If `iteration >= qa.maxIterations` → **escalate** (below). Else spawn `dw:dev` with `mode: rework`, then QA again (step 2).
   - `blocked` → notify, go to **3. Recap** (stop).

### Escalation

1. Add label `labels.escalated` to the ticket (status stays `qaFailed`).
2. Comment, first line exactly `[dw:run] escalated`, then: iterations done, the recurring failure in at most 3 lines, pointer to the last QA report.
3. Notify: `node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/notify.mjs" "dw: escalation" "<ID> failed QA <n> times"`.
4. Go to **3. Recap** and stop: an escalation always ends the run.

Between tickets always return to a clean base branch: `git switch <baseBranch>` and `git pull --ff-only <remote> <baseBranch>`.

## 3. Recap

Print, in `language`:

1. **Delivered this run**: ID — title — PR URL.
2. **To review** (all tickets in status `readyForReview` in scope, not only this run's), with PR URLs; complete with the forge `list_open_prs(<baseBranch>)` for PRs whose ticket you could not match.
3. **Blocked**: `todo` tickets not ready, each with its blockers and their status (e.g. "ENG-14 ← ENG-12 (Ready for Review)").
4. **Escalated / stopped**: ticket, reason, what the user must do.
5. **Docs PRs** opened this run.
6. **Next step**: "Review and merge the PRs above, then rerun `/dw:run`." when tickets are only waiting on reviews.

Then notify: `node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/notify.mjs" "dw: run finished" "<n> PR(s) to review"`.
