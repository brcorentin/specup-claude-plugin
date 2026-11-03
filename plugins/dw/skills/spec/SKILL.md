---
name: spec
description: The dw em turns a validated Linear Project into a technical spec (docs/specs/), ADRs (docs/architecture/) and Linear tickets with blocked-by relations. Human gate before tickets move to Todo.
argument-hint: "<linear-project-name>"
disable-model-invocation: true
---

# /dw:spec

Plugin root: `${CLAUDE_PLUGIN_ROOT}`. When a plugin file mentions `${CLAUDE_PLUGIN_ROOT}`, it means this path. Follow `${CLAUDE_PLUGIN_ROOT}/reference/agent-relay.md`. You are only the relay: do not write the spec or tickets yourself.

1. **Preconditions**: `.claude/workflow.json` exists; `git status --porcelain` empty; base branch up to date (`git fetch`, `git pull --ff-only <remote> <baseBranch>`). Speak in `workflow.json` → `language`.
2. **Project**: `$ARGUMENTS`. If empty, list the team's Projects whose stories are in `productReady` and ask which one. Check the stories are in `productReady`; if not, tell the user to finish `/dw:epic` first and stop.
3. **Run** `dw:em` with:
   ```
   mode: spec
   project: <Project name>
   ```
   Relay `needs_input` rounds until `draft_ready`.
4. **Gate**: show the spec path and a summary (design choices, ADRs), the ticket table (ID, title, app labels, blocked by), and the dependency graph in text form (independent tickets first). Notify, ask for explicit approval; loop on changes. On approval send `APPROVED` (+ last changes) and wait for `done` (tickets and stories in Todo, ADRs Accepted).
5. **Publish** with `${CLAUDE_PLUGIN_ROOT}/reference/docs-pr.md`: branch `docs/<project-slug>-spec`, title `docs(spec): <Project name>`, paths `docs/specs/`, `docs/architecture/`, `docs/conventions.md` (if changed), `docs/INDEX.md`.
6. **Next**: the spec PR must be **merged** before `/dw:run`, so that the dev and QA agents can read the spec from the base branch. Tell the user exactly that.
