# Procedure: run a dw agent and relay it to the user

`${CLAUDE_PLUGIN_ROOT}` is the plugin root given by the skill.

Subagents cannot talk to the user. The skill running in the main conversation is the relay. It **never does the agent's work itself**: it spawns, relays, gates, and publishes.

## Spawn

Use the Agent tool with `subagent_type: "dw:<agent>"` (`dw:product-engineer`, `dw:em`, `dw:dev`, `dw:qa`, `dw:doc`), in the foreground (wait for the result). The prompt contains only:

```
mode: <mode>
<input>: <value>
...
```

plus, when relevant, the user's own words verbatim (feature idea, answers). Never add your own reasoning, opinions, or another agent's summary.

## Read the result

Every dw agent ends its reply with a `DW_RESULT` block (`status: ...`). Act on `status`:

| status | Action |
| :- | :- |
| `needs_input` | Show the agent's questions to the user **verbatim** (numbering, proposed answers). Wait for the user's answers. Send them, verbatim, to the **same** agent with `SendMessage` (to the agent ID or name returned by the Agent tool). Loop. |
| `draft_ready` | Show the agent's summary and links (Linear Project, doc files). Run the **gate** below. |
| `done` | Continue the skill. |
| `blocked` | Show the reason, notify, stop the skill. |
| anything else / no block | Ask the same agent with `SendMessage` to finish with a valid `DW_RESULT` block. |

If `SendMessage` is unavailable, spawn a new agent of the same type with the same mode and the full question/answer history so far, verbatim.

## Gate (human approval)

1. Notify: `node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/notify.mjs" "dw: validation required" "<what to review>"`.
2. Ask the user explicitly to approve, or to request changes. Present the choice in the user's language. Silence or ambiguity is not approval.
3. Approval → `SendMessage` to the same agent: `APPROVED` followed by any last changes the user gave, verbatim. Wait for `done`.
4. Changes → `SendMessage` with the requested changes verbatim. Wait for the next `draft_ready` and gate again.

## After the agent is done

Publish the docs it left in the working tree with `${CLAUDE_PLUGIN_ROOT}/reference/docs-pr.md`, then tell the user which PR to review and merge, and which command comes next.
