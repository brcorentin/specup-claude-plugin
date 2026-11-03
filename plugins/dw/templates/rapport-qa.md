<!--
dw template: QA report, posted as a Linear comment by the qa agent, right under the transition line
"[dw:qa] <inQa> → <readyForReview|qaFailed>". Write everything in workflow.json → language. Drop this comment.
-->

**Verdict**: ✅ Ready for Review | ❌ QA Failed — iteration N/<qa.maxIterations>
**Branch**: `<branch>` @ `<short sha>` · **PR**: <url or "not opened">

### Criteria coverage
| AC | Covered by (file › test name) | Added by QA | Result |
| :- | :- | :- | :- |
| AC-1 | `apps/api/src/x/x.service.spec.ts` › "rejects expired token" | no | ✅ |
| AC-2 | — | — | ❌ not covered |

### Tests added by QA
- `path/to/file.spec.ts` — cases: …  (commit `<short sha>`)

### Suites run
| App | Command | Result |
| :- | :- | :- |
| api | `<lint>` | ✅ |
| api | `<test>` | ✅ 124 passed |
| api | `<testIntegration>` | ❌ 1 failed |

### Failures (QA Failed only)
For each failure, enough for the dev to fix it without asking:
1. **AC-2** — Expected …, got …. Reproduce: `<command>`. Test: `path › name`. Likely area: `path/to/file.ts`.

### Notes
Edge cases checked, risks noticed outside the ticket scope (not blocking).
