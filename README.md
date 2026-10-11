# claude-context-bar

A Claude Code mod that keeps a live breakdown of the context window directly above the prompt: how many tokens each category takes (system prompt, tools, MCP tools, agents, memory files, skills, messages), how much is free, and where auto-compaction starts.

> **Status: pre-alpha, under construction.** There is no release yet. Don't install it until a tagged release exists.

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

Claude Code 2.1.287 or later, with mods enabled. Mods are on by default.

## Install

Not yet published. Install steps will appear here with the first tagged release.

## What it can reach

This is planned and will be verified before the first release:

| | |
|---|---|
| **Reads** | the session's token usage and its per-category breakdown, as the engine already holds them |
| **Runs** | nothing |
| **Sends** | nothing leaves the machine |
| **Persists** | only whether the bar is shown or hidden |
| **Hostile input** | it parses no prompt text, tool results or files |

## Commands

- `/context-bar` shows or hides the bar.

## Credits

The design follows the context bar shown in Anthropic's introduction to Claude Code mods. This is an independent implementation, not affiliated with or endorsed by Anthropic.

## License

[MIT](LICENSE)
