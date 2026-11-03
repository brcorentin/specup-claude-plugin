# Bootstrap — empty project

`${CLAUDE_PLUGIN_ROOT}` below is the plugin root given in SKILL.md. Agents are run with `${CLAUDE_PLUGIN_ROOT}/reference/agent-relay.md`. Three human gates; **no application code is written in this skill**.

## A. Setup

1. Linear: list teams, ask which one. Map statuses and plan labels exactly as in `existing-repo.md` section B (statuses checklist, labels `dw:story`, `dw:ticket`, `dw:escalated`, `dw:docs`; app labels come later).
2. Forge: parse `git remote get-url <remote>` (owner, repo, host → type). Base branch: the remote default branch if the remote has one (`git ls-remote --symref <remote> HEAD`), else `main`. Record whether the remote base branch **exists** (`git ls-remote --heads <remote> <baseBranch>`): it decides how step E publishes.

## B. Discovery — gate 1

Spawn `dw:product-engineer` with `mode: discovery` and the user's description of the product (ask for it first if `$ARGUMENTS` is empty). Relay until `draft_ready` (`docs/product/vision.md`, `docs/product/personas.md`, `docs/glossary.md`, `docs/INDEX.md`). Gate. Wait for `done`.

## C. Architecture — gate 2 (before any code)

Spawn `dw:em` with `mode: architecture`. Relay until `draft_ready` (ADRs `docs/architecture/0001-…`, `docs/architecture/overview.md`, `docs/conventions.md`). Gate: make it explicit to the user that approving fixes the stack before any code is written. Wait for `done`.

## D. Provisional config and Foundations — gate 3

1. Write the provisional `.claude/workflow.json`: `language`, `linear`, `forge`, `packageManager` and `monorepo.tool` from the approved ADRs, `env` from the ADRs (e.g. `docker compose up -d --wait`) or `null`, **`apps: []`**, `qa.maxIterations: 3`, `docs.root: "docs"`. Write `.claude/settings.json` from `${CLAUDE_PLUGIN_ROOT}/reference/settings.template.json` (no app commands yet) and a short `CLAUDE.md` (points to `docs/INDEX.md`, dw commands). Show these three files before writing them (part of this gate).
2. Create the Linear labels.
3. Spawn `dw:em` with `mode: foundations`. Relay until `draft_ready` (Linear Project "Foundations", tickets in Backlog with blocked-by relations, `docs/specs/foundations.md`). Gate. Wait for `done` (tickets in `todo`).

## E. Publish

- **Remote base branch exists**: `${CLAUDE_PLUGIN_ROOT}/reference/docs-pr.md` with branch `dw/bootstrap`, title `chore: set up dw workflow and foundations plan`, paths `CLAUDE.md`, `.claude/`, `docs/`. The user merges it before `/dw:run`.
- **Remote is empty** (no base branch): there is nothing to open a PR against. Create the initial commit locally on `<baseBranch>` (`git switch -c <baseBranch>` if needed, add the same paths plus `.gitignore`/`README.md` if present, commit `chore: initial dw setup`). Do **not** push it: the guard hook forbids pushing to the base branch. Ask the user to push it themselves from their own terminal: `git push -u <remote> <baseBranch>`.

## F. Wrap up

Tell the user, in order:
1. Merge the PR (or push the initial commit), then `git pull`.
2. Complete the Linear checklist if states are missing.
3. Run `/dw:run` to build the Foundations tickets one by one; review and merge each PR.
4. When the Foundations Project is merged, run `/dw:bootstrap` again: it switches to existing-repo mode and fills `apps[]`, commands and module docs.

Notify: `node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/notify.mjs" "dw: bootstrap done" "Foundations planned in Linear"`.
