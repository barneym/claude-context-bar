# claude-context-bar

A Claude Code mod that keeps a live breakdown of the context window directly above the prompt: how many tokens each category takes (system prompt, tools, MCP tools, agents, memory files, skills, messages), how much is free, and where auto-compaction starts.

> **Status: pre-release (0.1.0).** It works and is tested, but the look and the details may still change before 1.0.

```
╭──────────────────────────────────────────────────────────────╮
│ ◆ context                  90k of 1M · compacts at 987k  9%  │
│ ███▓▓▓▓▒▒▒░░░                                               ▏│
│ ■ system prompt 4.2k 1%   ■ tools 17k 2%   ■ mcp tools 52k 5% │
│ ■ agents 3.4k 1%   ■ memory files 8.6k 1%   ■ skills 5.1k 1%  │
╰──────────────────────────────────────────────────────────────╯
```

(A text sketch: the real bar uses colored blocks, one color per category.)

## Why

Claude Code's `/context` command shows this breakdown when you ask for it. This mod keeps it in view, so you notice MCP tools crowding the window or a conversation nearing compaction before it happens.

## Design goals

- **Smallest possible reach.** It reads the session's own token usage and draws one component above the prompt. It makes no network calls, starts no processes, reads and writes no files, and sends nothing to the model. See [What it can reach](#what-it-can-reach).
- **Portable rendering.** It uses colored blocks rather than glyph counts, so it draws the same in the terminal and in the desktop app's Code tab.
- **Easy to read.** Every value is labelled in text, so color is never the only signal, and it respects `NO_COLOR`.

The full visual spec is in [docs/SPEC.md](docs/SPEC.md).

## Requirements

Claude Code 2.1.296 or later, with mods enabled (they are on by default). That is the version it is built and tested on; earlier builds with mods may work but are untested.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install context-bar --marketplace barneym/claude-context-bar
```

Answer `y` to add the marketplace, then pick a scope (user is the default). The bar appears above the prompt after Claude's first reply in a session.

To try it without installing, clone the repository and start a session with the mod loaded for that session only:

```
claude --plugin-dir ./context-bar
```

## What it can reach

Checked against `claude plugin validate`, which reads these lists off the source:

| | |
|---|---|
| **Reads** | the session's token usage, with the local `summary` breakdown (category names, token counts and theme colors; it keeps nothing else from the reply), and one environment variable, `NO_COLOR` |
| **Hooks** | `session.start` (registers the command, reads the flag), `session.measure` and `session.compact` (re-read usage after a turn or a compaction; both only observe), `command.run` for `/context-bar`, and `ui.render` for the `AbovePrompt` band |
| **Calls** | `$.session.usage`, `$.command.register`, `$.store.get`/`set`, `$.env.get`, `$.ui.resolve`, and its own `$.state` values |
| **Runs** | nothing |
| **Sends** | nothing leaves the machine, and the `summary` breakdown sends no token-count requests |
| **Persists** | one `$.store` key, `hidden`: whether the bar is shown |
| **Hostile input** | it parses no prompt text, tool results or files |

## Commands

- `/context-bar` shows or hides the bar. The choice is remembered across sessions.

With auto-compaction turned off there is no compaction tick and no "compacts at" figure, because the engine reports no threshold.

## Credits

The design follows the context bar shown in Anthropic's introduction to Claude Code mods. This is an independent implementation, not affiliated with or endorsed by Anthropic.

## License

[MIT](LICENSE)
