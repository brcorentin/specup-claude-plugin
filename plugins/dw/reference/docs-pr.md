# Procedure: publish documentation through a PR

Nobody pushes to `forge.baseBranch`. Every documentation change (bootstrap files, product docs, specs, ADRs, module docs) reaches the base branch through its own PR, merged by the human. Run this procedure whenever a skill or agent leaves doc changes in the working tree. `${CLAUDE_PLUGIN_ROOT}` is the plugin root given by the skill or agent running it.

Inputs: `<branch>` (naming below), `<title>`, `<body>` (from `${CLAUDE_PLUGIN_ROOT}/templates/pr.md`, "Ticket" section replaced by the Linear Project or ticket list), list of paths to commit.

1. `git status --porcelain` — only the expected paths may be modified or new. Anything else: stop and report.
2. **Unique branch**: `git fetch <forge.remote>`. If `<branch>` already exists locally or on the remote (`git ls-remote --heads <forge.remote> <branch>`), append `-2`, `-3`… until it does not. Never reuse an existing docs branch.
3. `git switch -c <branch>` — the working tree changes come along. The branch starts from the current HEAD, which must be the up-to-date base branch (every skill syncs it before writing). If HEAD is not `<forge.baseBranch>` at `<forge.remote>/<forge.baseBranch>`, stop and report.
4. `git add -- <paths>`, then `git commit -m "<conventional message>"` (e.g. `docs(spec): checkout flow`).
5. `git push -u <forge.remote> <branch>`.
6. Open the PR with the adapter's `open_pr(<branch>, <forge.baseBranch>, <title>, <body>)` (`${CLAUDE_PLUGIN_ROOT}/reference/forges/<forge.type>.md`). If no adapter exists or the forge is unavailable, use the fallback in `${CLAUDE_PLUGIN_ROOT}/reference/forges/README.md`.
7. `git switch <forge.baseBranch>` so the working tree is clean for the next step.

## Conflicts

Docs PRs often touch the same files (`docs/INDEX.md`). When asked to fix a conflicting docs PR: `git switch <branch>`, `git merge <forge.remote>/<forge.baseBranch>`, resolve (keep both sides' lines in `INDEX.md`, sorted), commit, `git push`. Never rebase, never force-push.

## Branch names (before the uniqueness suffix)

| Content | Branch |
| :- | :- |
| `/dw:bootstrap` output | `dw/bootstrap-<YYYY-MM-DD>` |
| Product docs from `/dw:epic` | `docs/<project-slug>-product` |
| Spec + ADRs from `/dw:spec` | `docs/<project-slug>-spec` |
| Module docs after merged tickets | `docs/<YYYY-MM-DD>-modules` |
| End-of-Project docs (`/dw:doc`, `/dw:run`) | `docs/<project-slug>-final` |

`<project-slug>` = Linear Project name in kebab-case ASCII, accents removed (`Fondations` → `fondations`). The same slug names `docs/specs/<project-slug>.md` and `docs/product/features/<project-slug>.md`.

## Why it matters for the dev loop

Ticket branches start from the up-to-date base branch, so agents only see merged docs:
- the product docs PR should be merged before `/dw:spec` (the em reads the feature doc);
- the spec PR must be merged before `/dw:run` starts the Project (dev and qa read `docs/specs/<project-slug>.md`). Both skills check this.
