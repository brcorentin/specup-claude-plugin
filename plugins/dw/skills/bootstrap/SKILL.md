---
name: bootstrap
description: Set up the dw workflow in the current repository. Existing monorepo → scan and generate CLAUDE.md, .claude/workflow.json, .claude/settings.json, docs/ and Linear labels. Empty project → product discovery, architecture ADRs, human gate, then a Linear "Foundations" Project.
argument-hint: "[--mode existing|empty]"
disable-model-invocation: true
---

# /dw:bootstrap

You are the orchestrator of the dw bootstrap. Plugin root: `${CLAUDE_PLUGIN_ROOT}`. When a plugin file mentions `${CLAUDE_PLUGIN_ROOT}`, it means this path. Speak to the user in their language; that language becomes `workflow.json` → `language`.

Reference files (read when the step needs them):
- `${CLAUDE_PLUGIN_ROOT}/reference/workflow-json.md` and `workflow.schema.json` — config format
- `${CLAUDE_PLUGIN_ROOT}/reference/state-machine.md` — Linear statuses and labels
- `${CLAUDE_PLUGIN_ROOT}/reference/docs-conventions.md` — docs/ layout
- `${CLAUDE_PLUGIN_ROOT}/reference/settings.template.json` — permission allowlist
- `${CLAUDE_PLUGIN_ROOT}/reference/agent-relay.md` — running agents and gates
- `${CLAUDE_PLUGIN_ROOT}/reference/docs-pr.md` — publishing through a PR

## 1. Preconditions

Run and check, stop with a clear message on failure:
1. `git rev-parse --show-toplevel` — inside a git repository; work from its root.
2. `git remote -v` — at least one remote. If none, ask the user to add one (`git remote add origin <url>`) and stop.
3. `git status --porcelain` — clean tree (otherwise ask the user to commit or stash first).
4. Linear MCP reachable: call a read-only Linear tool (list teams). On failure: tell the user to run `/mcp`, authenticate `plugin:dw:linear`, and rerun.
5. Forge reachable (GitHub by default): call `mcp__plugin_dw_github__get_me`. On failure, warn (PRs will fall back to compare links) and continue only if the user agrees. See the README section on `GITHUB_PERSONAL_ACCESS_TOKEN`.

## 2. Detect the mode

Argument: `$ARGUMENTS` (`--mode existing|empty` forces the mode).

- **existing** when the repo has a root `package.json`, or tracked source code (`git ls-files` returns files other than README, LICENSE, `.gitignore`, `.gitattributes`, `docs/**`, `.claude/**`, `CLAUDE.md`).
- **empty** otherwise.

If `.claude/workflow.json` already exists, it is an **update**: in existing mode, re-scan and present a diff against the current files instead of new files; keep the user's manual edits unless the scan contradicts them.

Tell the user which mode you detected and why, then follow:
- existing → `${CLAUDE_SKILL_DIR}/existing-repo.md`
- empty → `${CLAUDE_SKILL_DIR}/empty-project.md`

## Hard rules

- Show everything you will write or create (files and Linear objects) and get explicit approval **before** writing. Use the gate in agent-relay.md, including the notification.
- Never push to the base branch, never force-push, never write secrets. Tokens stay in environment variables.
- Merge with existing files (`CLAUDE.md`, `.claude/settings.json`, `docs/`): never silently overwrite user content.
