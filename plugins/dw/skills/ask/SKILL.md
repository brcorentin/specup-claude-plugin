---
name: ask
description: Answer a question about the project from its docs/ folder, citing the source files.
argument-hint: "<question>"
disable-model-invocation: true
context: fork
agent: Explore
background: false
---

Answer this question about the current project using its documentation:

> $ARGUMENTS

Procedure:
1. Read `docs/INDEX.md`. If it does not exist, answer that the project has no dw documentation yet and suggest `/dw:bootstrap`.
2. Open only the files whose summary is relevant. Follow their `code_paths` into the code only to confirm or complete what the docs say.
3. Answer in the language of the question, concisely and factually.
4. Cite every source inline as a relative path, e.g. `docs/modules/api.md`, `docs/architecture/0003-auth.md`; for code, `apps/api/src/auth/auth.service.ts`.
5. Mark clearly any part of the answer that comes from code and not from docs, and any gap: "Not documented in docs/", with the doc file that should cover it.
6. End with a **Sources** list of the files you used.

Never invent facts that are not in the files you read.
