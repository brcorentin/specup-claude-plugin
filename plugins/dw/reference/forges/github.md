# Forge adapter: `github`

MCP server: `plugin:dw:github` (declared in the plugin's `.mcp.json`, remote `https://api.githubcopilot.com/mcp/`, Personal Access Token from the `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable). Only four tools are loaded (`X-MCP-Tools` header): `create_pull_request`, `list_pull_requests`, `pull_request_read`, `get_me`. Tool names below are the full names to call.

`owner`, `repo` = `forge.owner`, `forge.repo`. `base` = `forge.baseBranch`. Web host = `forge.host` or `github.com`.

## find_open_pr(head)

`mcp__plugin_dw_github__list_pull_requests` with `owner`, `repo`, `state: "open"`, `head: "<owner>:<head>"`. Take the first result, if any.

## open_pr(head, base, title, body)

Call `find_open_pr` first; if a PR exists, reuse it (do not create a second one).

`mcp__plugin_dw_github__create_pull_request` with `owner`, `repo`, `head: "<head>"`, `base: "<base>"`, `title`, `body`, `draft: false`. Return `number` and `html_url`.

The branch must already be pushed (`git push -u <forge.remote> <head>`).

## get_pr(number)

`mcp__plugin_dw_github__pull_request_read` with `owner`, `repo`, `pullNumber: <number>`, `method: "get"`. Merged when `merged` is true; otherwise `state` is `open` or `closed`.

## list_open_prs(base)

`mcp__plugin_dw_github__list_pull_requests` with `owner`, `repo`, `state: "open"`, `base: "<base>"`, `perPage: 100`.

## compare_url(head)

`https://<host>/<owner>/<repo>/compare/<base>...<head>?expand=1`

## Linear link

Linear's GitHub integration links the PR to the issue when the branch name or PR title contains the issue identifier (`ENG-12-...`), and moves the issue to Done on merge when the team enables it. The PR body still contains the explicit Linear URL (`templates/pr.md`).

## Never

`merge_pull_request`, `update_pull_request` (state change), `pull_request_review_write`, branch deletion. They are not loaded, and the guard hook blocks any `mcp__*github*__*merge*` tool.
