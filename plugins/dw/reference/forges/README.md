# Forge abstraction

Agents never name a code host. Every git operation goes through plain `git` against `forge.remote`. Every operation git cannot do (opening a pull/merge request, reading one) goes through the **forge adapter** selected by `.claude/workflow.json` → `forge.type`, documented in `reference/forges/<type>.md`.

## Contract

Each adapter documents how to perform these operations, with the exact MCP tools and parameters:

| Operation | Input | Output | Used by |
| :- | :- | :- | :- |
| `find_open_pr` | head branch | PR `{number, url, title}` or none | dev, doc (avoid duplicates on rework) |
| `open_pr` | head branch, base branch, title, body | PR `{number, url}` | dev, doc |
| `get_pr` | PR number | state (open / merged / closed), url, head, base | /dw:run recap |
| `list_open_prs` | base branch | list of `{number, url, title, head}` | /dw:run recap |
| `compare_url` | head branch | URL where a human can open the PR manually | fallback when the forge tools are unavailable |

Forbidden through any adapter: merging, closing, approving, deleting branches, changing the base branch protection. The dw guard hook blocks MCP tools whose name contains `merge` on forge servers.

## Fallback

If the adapter's tools are unavailable (server disconnected, token missing), the agent must:
1. still push the branch with git;
2. post the `compare_url` and the ready-to-paste PR body in the Linear comment;
3. report "PR not opened: forge unavailable" to the orchestrator. `/dw:run` lists it in the recap; the ticket still goes to QA.

## Adding a forge (e.g. GitLab)

No agent or skill changes:

1. Configure an MCP server for that forge in the project's `.mcp.json` under the server name **`forge`** (its tools appear as `mcp__forge__<tool>`, already allowed for the dev and doc agents), or add it to the plugin's `.mcp.json`.
2. Add `reference/forges/<type>.md` implementing the contract above with that server's tool names.
3. Set `forge.type` to `<type>` in the project's `.claude/workflow.json`, and add the read/create PR tools to the project's `.claude/settings.json` allowlist.

Shipped adapters: `github.md`.
