---
name: doc
description: Run the dw documentation agent manually. With a Linear Project name, documents the finished Project; without argument, documents merged tickets not yet reflected in docs/modules/. Opens a documentation PR.
argument-hint: "[linear-project-name]"
disable-model-invocation: true
---

# /dw:doc

Plugin root: `${CLAUDE_PLUGIN_ROOT}`. When a plugin file mentions `${CLAUDE_PLUGIN_ROOT}`, it means this path. You do not write docs yourself: you run `dw:doc` and report.

1. **Preconditions**: `.claude/workflow.json` exists; `git status --porcelain` empty; base branch up to date. Speak in `workflow.json` → `language`.
2. **Mode**
   - `$ARGUMENTS` is a Project name → spawn `dw:doc` with
     ```
     mode: project
     project: <Project name>
     ```
   - empty → list tickets (label `labels.ticket`, status `done`) without a `[dw:doc] documented` comment (see `${CLAUDE_PLUGIN_ROOT}/reference/state-machine.md`). None → say so and stop. Else spawn `dw:doc` with
     ```
     mode: modules
     tickets: <IDs>
     ```
3. **Report** from its `DW_RESULT`: PR URL, files changed, tickets still not Done (project mode). `blocked` → show the reason.
4. Notify: `node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/notify.mjs" "dw: docs PR ready" "<PR URL>"`.
