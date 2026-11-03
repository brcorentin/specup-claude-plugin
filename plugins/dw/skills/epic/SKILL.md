---
name: epic
description: Product session with the dw product-engineer. Challenges a feature idea, then produces a Linear Project with user stories and testable acceptance criteria, plus docs/product/ updates. Human gate before the Project is marked Product Ready.
argument-hint: "[feature idea]"
disable-model-invocation: true
---

# /dw:epic

Plugin root: `${CLAUDE_PLUGIN_ROOT}`. When a plugin file mentions `${CLAUDE_PLUGIN_ROOT}`, it means this path. Follow `${CLAUDE_PLUGIN_ROOT}/reference/agent-relay.md` for every interaction with the agent. You are only the relay: do not write stories, criteria or docs yourself.

1. **Preconditions**: `.claude/workflow.json` exists (else `/dw:bootstrap`); `git status --porcelain` empty; on the base branch, up to date (`git fetch`, `git pull --ff-only <remote> <baseBranch>`). Speak in `workflow.json` → `language`.
2. **Idea**: `$ARGUMENTS`. If empty, ask the user to describe the feature in their own words (problem, who, why now).
3. **Run** `dw:product-engineer` with:
   ```
   mode: epic
   idea: <the user's words, verbatim>
   ```
   Relay `needs_input` rounds until `draft_ready`.
4. **Gate**: show the Linear Project URL, the list of stories with their acceptance criteria, and the doc files changed. Notify, ask for explicit approval. Loop on changes. On approval send `APPROVED` (+ last changes) and wait for `done` (stories moved to Product Ready).
5. **Publish** the product docs with `${CLAUDE_PLUGIN_ROOT}/reference/docs-pr.md`: branch `docs/<project-slug>-product`, title `docs(product): <Project name>`, paths `docs/product/`, `docs/glossary.md`, `docs/INDEX.md`.
6. **Next**: tell the user to review/merge the docs PR and run `/dw:spec <Project name>`.
