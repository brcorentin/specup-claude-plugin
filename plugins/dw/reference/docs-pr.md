# Procedure: publish documentation through a PR

Nobody pushes to `forge.baseBranch`. Every documentation change (bootstrap files, product docs, specs, ADRs, module docs) reaches the base branch through its own PR, merged by the human. Run this procedure whenever a skill or agent leaves doc changes in the working tree.

Inputs: `<branch>` (see naming below), `<title>`, `<body>` (from `templates/pr.md`, "Ticket" section replaced by the Linear Project or ticket list), list of paths to commit.

1. `git status --porcelain` — only the expected paths may be modified or new. Anything else: stop and report.
2. `git switch -c <branch>` (or `git switch <branch>` if it already exists locally).
3. `git add -- <paths>` then `git commit -m "<conventional message>"` (e.g. `docs(spec): checkout flow`).
4. `git push -u <forge.remote> <branch>`.
5. Open the PR with the adapter's `open_pr(<branch>, <forge.baseBranch>, <title>, <body>)` (`reference/forges/<forge.type>.md`). On failure use `compare_url` and report it.
6. `git switch <forge.baseBranch>` so the working tree is clean for the next step.

## Branch names

| Content | Branch |
| :- | :- |
| `/dw:bootstrap` output | `dw/bootstrap` |
| Product docs from `/dw:epic` | `docs/<project-slug>-product` |
| Spec + ADRs from `/dw:spec` | `docs/<project-slug>-spec` |
| Module docs after merged tickets | `docs/<YYYY-MM-DD>-modules` |
| End-of-Project docs (`/dw:doc`) | `docs/<project-slug>-final` |

`<project-slug>` = Linear Project name in kebab-case ASCII.

## Why it matters for the dev loop

Ticket branches start from the up-to-date base branch. The spec PR (`docs/<project-slug>-spec`) must be merged before `/dw:run` starts the Project, otherwise the dev and qa agents cannot read `docs/specs/<project-slug>.md`. `/dw:run` checks this.
