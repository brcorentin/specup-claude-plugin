# Bootstrap — existing repository

`${CLAUDE_PLUGIN_ROOT}` below is the plugin root given in SKILL.md.

## A. Scan (read-only)

Collect facts; cite the file each fact comes from. Do not guess: unknown stays `null` and is listed as a question.

1. **Workspaces and package manager**: `pnpm-workspace.yaml`, root `package.json` (`workspaces`, `packageManager`, scripts), lockfile (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`).
2. **Monorepo tool**: `turbo.json` (tasks), `nx.json` / `project.json`, else plain workspaces.
3. **Apps and packages**: every workspace package (`apps/*`, `packages/*`, or the globs found). For each: `name` (folder name, or package name without scope), `path`, `kind` (`app` under apps/ or with a start/dev script and a framework entry point; `package` otherwise), framework (NestJS: `@nestjs/core`; Next.js: `next`; …).
4. **Commands per app**, from its `package.json` scripts, expressed as commands run from the repo root through the monorepo tool when there is one:
   - Turborepo: `<pm> turbo run <task> --filter=<package name>`; Nx: `<pm> nx run <project>:<target>`; workspaces: `pnpm --filter <name> <script>` / `npm run <script> -w <name>`.
   - `build` ← `build`; `lint` ← `lint`; `typecheck` ← `typecheck` | `type-check` | `tsc` (else `<pm> exec tsc --noEmit -p <path>` if a tsconfig exists); `test` ← `test` | `test:unit`; `testIntegration` ← `test:integration` | `test:int` | `test:e2e` (NestJS e2e against a DB counts).
   - Missing → `null`.
5. **Local environment**: `docker-compose.yml`, `docker-compose.*.yml`, `compose.yaml`; services (Postgres image, ports, volumes). `env.start` = `docker compose up -d --wait` (with `-f <file>` if not the default), `env.stop` = `docker compose down`. Note `.env.example` keys (never read `.env` values).
6. **Database and migrations**: Prisma (`prisma/schema.prisma`, `prisma/migrations/`), TypeORM (`migrations/`, data-source), Drizzle (`drizzle.config.*`), Knex, raw SQL. Record paths and the migration command if a script exists.
7. **Git and forge**: `git remote get-url <remote>` (prefer `origin`), parse host / owner / repo; base branch as computed in SKILL.md precondition 4 (`git ls-remote --symref <remote> HEAD`). Host `github.com` → `forge.type: "github"`. Any other host (GitLab, Bitbucket, GitHub Enterprise Server…) → no adapter ships for it: keep a type named after the host (`gitlab`, `ghe`…), and warn that PRs use the fallback of `${CLAUDE_PLUGIN_ROOT}/reference/forges/README.md` until an adapter is added.
8. **CI**: `.github/workflows/`, `.gitlab-ci.yml` — note what runs.
9. **Existing docs and config**: `CLAUDE.md`, `docs/`, `.claude/settings.json`, `.claude/workflow.json`, `README.md`, `CONTRIBUTING.md`.

## B. Linear

1. List teams; ask the user which one (recommend the only one if there is one).
2. **Linear Project** — the first working Project, stored in `linear.project` (default scope of `/dw:run`). List the team's Projects (name, status, issue count) and ask the user to choose one of:
   - **use an existing Project**: pick it from the list;
   - **create a new Project**: ask for its name (propose one from the README or the repo name) and write a 2–4 line description in `language` (purpose, link to `docs/product/vision.md`). Nothing is created before the gate (step E);
   - **no default Project**: `linear.project: null`, `/dw:run` then covers every Project of the team.
   In update mode, propose the current `linear.project` as the default answer. Later `/dw:epic` runs create one Project per feature and offer to switch `linear.project` to it.
3. List the team's workflow states. Map each role of `${CLAUDE_PLUGIN_ROOT}/reference/state-machine.md` to an existing state: exact name first, then obvious equivalents (e.g. `In Review` for `readyForReview` only if the user confirms). Default names: Backlog, Product Ready, Todo, In Progress, In QA, QA Failed, Ready for Review, Done.
4. Missing states: if a Linear tool can create workflow states, plan to create them. Otherwise prepare a checklist for the user: *Linear → Settings → Teams → <team> → Workflow* → add each missing state in the right category (Product Ready: Backlog or Unstarted; In QA, QA Failed, Ready for Review: Started). The run cannot start until they exist.
5. Labels: plan to create the missing ones: `dw:story`, `dw:ticket`, `dw:escalated`, and one `app:<name>` per app (team labels).
6. Recommend in the checklist: GitHub integration enabled with "move to Done on PR merge", and "auto-close parent issues".

## C. Build the proposal (nothing written yet)

1. **`.claude/workflow.json`**: per the schema, `language` = the user's language, Linear mapping (`linear.project` = the chosen or planned Project name, or `null`), forge, package manager, monorepo tool, env, apps with commands, `qa.maxIterations: 3`, `docs.root: "docs"`. Validate it mentally against `workflow.schema.json` (all required keys, no extra keys).
2. **`.claude/settings.json`**: start from `${CLAUDE_PLUGIN_ROOT}/reference/settings.template.json`, replace `{{remote}}`, `{{baseBranch}}`, `{{packageManager}}`; add the allow and deny rules of the adapter's **Allowlist** section (`${CLAUDE_PLUGIN_ROOT}/reference/forges/<forge.type>.md`, none if no adapter); append `Bash(<command>)` for every distinct non-null command in `apps[].commands` and `env`. Merge with an existing file: keep its rules, add ours, deduplicate; never remove a user deny rule. Keep other keys untouched.
3. **`CLAUDE.md`**: if it exists, keep it and add or refresh a `## dw workflow` section; otherwise create a short file. Content: one paragraph on the project, "Read `docs/INDEX.md` first", the dw commands, where config lives (`.claude/workflow.json`), and the key commands (env start, per-app test). No duplicated docs.
4. **`docs/`** per `${CLAUDE_PLUGIN_ROOT}/reference/docs-conventions.md`, without overwriting existing files:
   - `INDEX.md` listing every file;
   - `product/vision.md` (from README if available, else a stub with `summary: TODO` and the questions to answer — mark it clearly);
   - `architecture/overview.md` from the scan (apps, packages, data flow, database, local env, CI), with paths;
   - `modules/<name>.md` per app/package from `${CLAUDE_PLUGIN_ROOT}/templates/doc-module.md`, filled with scan facts only (path, kind, framework, entry points, scripts, dependencies on internal packages, database/migrations paths);
   - `specs/.gitkeep` (git does not track empty folders; INDEX notes "no spec yet");
   - `conventions.md` from the lint/tsconfig/test setup and git history style (`git log --oneline -30`);
   - `glossary.md` (empty structure).
5. Existing `docs/` that does not follow the conventions: do not move files; propose the changes and list them.

## D. Gate

Present to the user, in this order: detected facts (with uncertain items flagged), the questions still open, the Linear changes (Project to create with its name and description, or the existing Project chosen; labels to create; states to create or checklist), then each file: full content for new files, a diff for modified ones. Run the gate of `${CLAUDE_PLUGIN_ROOT}/reference/agent-relay.md` (notify, explicit approval). Apply requested changes and present again until approved.

## E. Apply

1. Create the Linear Project if the user chose "create" (team `linear.team`, approved name and description), then the labels (and states if possible). Report what was created, with the Project URL. If the Project name changed on creation (e.g. duplicate), update `linear.project` before writing the files.
2. Write the files.
3. Publish with `${CLAUDE_PLUGIN_ROOT}/reference/docs-pr.md`, branch `dw/bootstrap-<YYYY-MM-DD>`, title `chore: set up dw workflow`, paths `CLAUDE.md`, `.claude/workflow.json`, `.claude/settings.json`, `docs/`.
4. Final message: the PR to review and merge (until it is merged, `.claude/workflow.json` exists only on that branch and the other dw commands refuse to run), the Linear checklist if any state is missing, then "after merging: `git pull`, then `/dw:epic` to start a feature". Notify with `node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/notify.mjs" "dw: bootstrap done" "Review the dw bootstrap PR"`.
