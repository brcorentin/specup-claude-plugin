# Project documentation conventions

Every dw project keeps its documentation in `<docs.root>/` (default `docs/`), written for **agents first**: short, factual, navigable from one index. All prose is in `workflow.json` → `language`.

## Layout

```
docs/
  INDEX.md                 one line per file: path — summary
  product/
    vision.md              problem, target users, value proposition, scope
    personas.md            one section per persona
    features/<slug>.md     one file per feature (one Linear Project may produce several)
  architecture/
    overview.md            apps, packages, data flow, external services
    NNNN-<slug>.md         numbered ADRs (templates/adr.md), 0001 first, 4 digits
  modules/<name>.md        one file per app or package (templates/doc-module.md), name = apps[].name
  specs/<project-slug>.md  one technical spec per Linear Project (templates/spec-technique.md)
  conventions.md           code, tests, git, naming conventions of this repo
  glossary.md              domain terms, one entry per term
```

`CLAUDE.md` at the repo root points to `docs/INDEX.md` and holds only what an agent needs on every turn (commands, pointers), never duplicated docs.

## Rules

1. **One concept per file.** Split when a file covers two things.
2. **Frontmatter on every file except `INDEX.md`:**
   ```yaml
   ---
   summary: One sentence, the same as the INDEX.md line.
   code_paths:
     - apps/api/src/auth/
   tickets:
     - ENG-12
   updated: 2026-11-03
   ---
   ```
   `code_paths` and `tickets` may be empty lists. `updated` is the ISO date of the last edit.
3. **Point to code, do not copy it.** Reference `apps/api/src/auth/auth.service.ts` (optionally `#L40`), not a pasted snippet. Short signatures or config keys are fine when they are the subject.
4. **Factual style.** Present tense, no marketing, no history narrative (history lives in ADRs and git). Lists and tables over paragraphs.
5. **Stable names.** File names in kebab-case. Module files are named after `apps[].name`. Spec files after the Linear Project slug.
6. **INDEX.md is exhaustive.** Every file under `docs/` has exactly one line, grouped by folder:
   ```markdown
   # Documentation index

   ## product
   - [product/vision.md](product/vision.md) — Problem, users and scope of the product.
   ```
   Adding, renaming or deleting a doc file updates `INDEX.md` in the same commit.
7. **Glossary entries**: `**Term** — definition. See: docs/... ` sorted alphabetically.
8. **No secrets, no personal data**, no environment-specific values (hostnames, tokens).

## Reading protocol (all agents)

1. Read `docs/INDEX.md`.
2. Open only the files whose summary is relevant to the task.
3. Follow `code_paths` to the code instead of searching the whole repo when possible.
