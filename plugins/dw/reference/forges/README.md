# Forge abstraction

Agents never name a code host. Every git operation goes through plain `git` against `forge.remote`. Every operation git cannot do (opening a pull/merge request, reading one) goes through the **forge adapter** selected by `.claude/workflow.json` → `forge.type`, documented in `${CLAUDE_PLUGIN_ROOT}/reference/forges/<type>.md`.

## Contract

Each adapter documents how to perform these operations, with the exact MCP tools and parameters:

| Operation | Input | Output | Used by |
| :- | :- | :- | :- |
| `check` | — | ok, or the reason the forge is unreachable | /dw:bootstrap, /dw:run preconditions |
| `find_open_pr` | head branch | PR `{number, url, title}` or none | dev, doc (avoid duplicates on rework) |
| `open_pr` | head branch, base branch, title, body | PR `{number, url}` | dev, doc, docs-pr procedure |
| `get_pr` | PR number | state (open / merged / closed), url, head, base | /dw:run recap |
| `list_open_prs` | base branch | list of `{number, url, title, head}` | /dw:run recap |
| `compare_url` | head branch | URL where a human can open the PR manually | fallback |

Each adapter also has an **Allowlist** section: the exact permission rules `/dw:bootstrap` adds to `.claude/settings.json` (read and create-PR tools only, plus a deny rule for its merge tool).

Forbidden through any adapter: merging, closing, approving, deleting branches, changing branch protection. The dw guard hook denies MCP tools whose name contains `merge`, `accept` or `approve` (except read tools: `list_*`, `get_*`, `search_*`, `read_*`, `*_read`) on forge servers (`plugin_dw_*`, `forge`, or any server whose name contains github, gitlab, gitea, bitbucket or forgejo).

## Fallback (adapter missing or forge unavailable)

When `${CLAUDE_PLUGIN_ROOT}/reference/forges/<forge.type>.md` does not exist, or its tools fail:
1. still push the branch with git;
2. if the adapter exists, use its `compare_url`; otherwise give the branch name and the remote web URL derived from `git remote get-url <forge.remote>` (no URL guessing beyond that);
3. post that link and the ready-to-paste PR body in the Linear comment;
4. report `pr: not opened: <reason>` in `DW_RESULT`. `/dw:run` lists it in the recap; the ticket still goes to QA.

## Adding a forge (e.g. GitLab)

No agent or skill changes:

1. Configure an MCP server for that forge in the project's `.mcp.json` under the server name **`forge`** (its tools appear as `mcp__forge__<tool>`, already allowed for the dev and doc agents), or add it to the plugin's `.mcp.json`.
2. Add `${CLAUDE_PLUGIN_ROOT}/reference/forges/<type>.md` implementing the contract above (operations + Allowlist) with that server's tool names.
3. Set `forge.type` to `<type>` in the project's `.claude/workflow.json` and rerun `/dw:bootstrap` to refresh the allowlist.

Shipped adapters: `github.md` (github.com only; GitHub Enterprise Server needs its own adapter pointing at its own MCP endpoint).
