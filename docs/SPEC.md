# Context Bar: Visual and Behavioral Spec

This spec is the target for v0.1. It's based on the context bar shown in Anthropic's introduction to Claude Code mods (the demo runs in the desktop app's Code tab). Points marked **(decision)** are choices this project makes where the demo shows nothing.

## Placement

- **Where:** a rounded-border card directly above the prompt input and below the conversation, the full width of the chat column. It's the `AbovePrompt` component, not the status line and not a pane.
- **Narrow layouts:** it narrows with the chat column, for example when a side pane opens, and the legend wraps to more rows.
- **When it hides:** it shows nothing until the session has reported context usage (`context.tokens` is 0 or missing). **(decision)** It also stays out of the way while a survey owns the band (`e.props.hasSurvey`).

## Anatomy, top to bottom

### 1. Header row
- **Left:** an orange-red `◆`, then bold `context`.
- **Right:** bold used tokens, dim `of <window>`, dim `· compacts at <threshold>`, then a solid percent badge with inverse text.
- **Number format:** `90k`, `1M`, `987k`; one decimal below 10k, for example `4.2k`.

### 2. The bar
- **Shape:** one row high, full card width, colored blocks on a dark track.
- **Segments:** each category's width is proportional to its tokens, with free space as the dark track.
- **Compaction marker:** a thin yellow tick at the auto-compact threshold. The demo shows `compacts at 987k` on a 1M window.
- **Construction:** blocks are flex-sized boxes with a background color, not glyph counts, because glyph width differs between surfaces.

### 3. Legend
- **Entry format:** each entry is a color swatch, a dim category name, bold tokens and a dim percent of the window.
- **Wrapping:** two rows at full width, more as it narrows.

## Categories and colors

| Category | Color | Demo values (90k total) |
|---|---|---|
| system prompt | blue | 4.2k, 1% |
| tools | teal | 17k, 2% |
| mcp tools | purple | 52k, 5% |
| agents | green | 3.4k, 1% |
| memory files | yellow | 8.6k, 1% |
| skills | pink | 5.1k, 1% |
| messages | orange-red | 0, growing as the chat grows |
| free | dark slate | 897k (not in the legend) |

**(decision)** Prefer the colors the engine supplies with the breakdown, if it supplies any, and fall back to the table above.

## Badge color thresholds

The demo shows only green, at 9 to 11%. **(decision)** Green below 70%, yellow from 70 to 84%, red at 85% and above. Make these configurable later.

## Behavior

- **Live updates:** it refreshes as the conversation grows; in the demo, `messages` goes from 0 to 18k after a file read.
- **Compaction marker:** fixed until the window or threshold changes.
- **Hot reload:** a change to the source shows up without a restart when loaded from a watched plugin directory.

## Command

`/context-bar` shows or hides the bar.
- **Description in the slash list:** "Show a live breakdown of the context window above the prompt".
- **Replies:** `Context bar shown.` and `Context bar hidden.`
- **(decision)** Shown by default; the hidden state is remembered.

## Accessibility

- **Color:** never the only signal, because every legend entry has a text name and number.
- **`NO_COLOR`:** when it's set, use an uncolored bar with text-only segments.

## Data sources (to verify against the installed Claude Code's generated types)

- `$.session.usage()` gives `context.tokens` and `context.window`. The demo's code shows this call.
- `$.session.usage({ breakdown: 'summary' })` gives the per-category names, tokens and possibly colors. It's used by existing community mods but not shown in the demo, so it is **unverified**.
- **Auto-compact threshold:** source unknown; check whether the engine exposes it. The demo's 987k on 1M implies a buffer of about 13k.

## Not in scope for v0.1

Cost, model name, cache timers, rate limits, click actions and per-turn history.
