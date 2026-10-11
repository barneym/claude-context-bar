// Pure rendering logic: number formatting, segment math and threshold
// colors. Nothing here touches the engine, so every function is unit-tested.

/** One row of the engine's context breakdown, as far as the bar needs it. */
export type Row = {
  name: string
  tokens: number
  color?: string
  kind: 'used' | 'free' | 'buffer' | 'deferred'
}

/** A legend entry or bar segment: a used category with its paint. */
export type Segment = { name: string; tokens: number; color: string }

/** One horizontal run of the bar, `width` cells wide. */
export type Run =
  | { kind: 'segment'; index: number; color: string; width: number }
  | { kind: 'track'; width: number }
  | { kind: 'tick'; width: 1 }

/** What the card draws, settled from the usage reading. */
export type Card = {
  used: number
  window: number
  percent: number
  threshold?: number
  segments: Segment[]
}

export type Tone = 'success' | 'warning' | 'error'

/** Badge thresholds, in whole percent of the window. */
export const WARN_AT = 70
export const ALERT_AT = 85

/**
 * Fallback paint when the engine supplies no color, in the order /context
 * lists its categories (system prompt, tools, mcp tools, agents, memory
 * files, skills, messages).
 */
export const FALLBACK_COLORS = [
  'blue',
  'cyan',
  'magenta',
  'green',
  'yellow',
  'magentaBright',
  'redBright',
] as const

/** The paint of the compaction tick and of the free track, as theme keys. */
export const TICK_COLOR = 'warning'
export const TRACK_COLOR = 'subtle'

/**
 * Formats a token count: `0`, `950`, `4.2k`, `17k`, `987k`, `1M`, `1.5M`.
 * One decimal below 10k and below 10M, a trailing `.0` dropped.
 */
export function k(n: number): string {
  const value = Math.max(0, n)
  if (value < 1000) {
    return String(Math.round(value))
  }
  if (value < 10_000) {
    return `${trim((value / 1000).toFixed(1))}k`
  }
  const thousands = Math.round(value / 1000)
  if (thousands < 1000) {
    return `${thousands}k`
  }
  const millions = value / 1_000_000
  return `${millions < 10 ? trim(millions.toFixed(1)) : Math.round(millions)}M`
}

function trim(fixed: string): string {
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed
}

/**
 * A whole percent of the window, rounded, with anything above zero shown
 * as at least 1% so a small category never reads as empty.
 */
export function percentOf(tokens: number, window: number): number {
  if (window <= 0 || tokens <= 0) {
    return 0
  }
  return Math.max(1, Math.round((tokens / window) * 100))
}

/** The badge color for a fill percentage. */
export function badgeTone(percent: number): Tone {
  if (percent >= ALERT_AT) {
    return 'error'
  }
  if (percent >= WARN_AT) {
    return 'warning'
  }
  return 'success'
}

/** A category name as the legend shows it: lower case, trimmed. */
export function label(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * The legend's categories: every `used` row in the engine's order, zero rows
 * included (messages start at 0), each with the engine's color or a fallback.
 */
export function toSegments(rows: readonly Row[]): Segment[] {
  return rows
    .filter(row => row.kind === 'used')
    .map((row, i) => ({
      name: label(row.name),
      tokens: Math.max(0, row.tokens),
      color: row.color || (FALLBACK_COLORS[i % FALLBACK_COLORS.length] ?? 'blue'),
    }))
}

/**
 * Splits `width` cells among the segments in proportion to their tokens out
 * of `window`, by largest remainder. A segment with tokens gets at least one
 * cell while the used share leaves room; the rest of the row is track.
 */
export function segmentWidths(
  segments: readonly Segment[],
  window: number,
  width: number,
): number[] {
  const cells = Math.max(0, Math.floor(width))
  if (window <= 0 || cells === 0) {
    return segments.map(() => 0)
  }
  const used = segments.reduce((sum, s) => sum + s.tokens, 0)
  const usedCells = Math.min(cells, Math.round((Math.min(used, window) / window) * cells))
  const nonEmpty = segments.filter(s => s.tokens > 0).length
  const budget = Math.min(cells, Math.max(usedCells, Math.min(nonEmpty, cells)))
  if (used <= 0 || budget === 0) {
    return segments.map(() => 0)
  }

  // Each segment with tokens starts at its floor share, one cell at least;
  // those most over their exact share give back any overshoot, then the
  // largest remainders fill up.
  const shares: Share[] = segments.map(seg => {
    const exact = (seg.tokens / used) * budget
    return { exact, width: seg.tokens > 0 ? Math.max(1, Math.floor(exact)) : 0 }
  })
  while (total(shares) > budget) {
    mostOver(shares).width -= 1
  }
  const order = shares
    .filter(share => share.width > 0)
    .sort((x, y) => y.exact - y.width - (x.exact - x.width))
  for (let n = 0; total(shares) < budget; n++) {
    const share = order[n % order.length]
    if (share) {
      share.width += 1
    }
  }
  return shares.map(share => share.width)
}

type Share = { exact: number; width: number }

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0)
}

function total(shares: readonly Share[]): number {
  return sum(shares.map(share => share.width))
}

// The share furthest over its exact size, sparing one-cell shares while any
// share has more to give. Only called while some share has a cell.
function mostOver(shares: readonly Share[]): Share {
  const floor = shares.some(share => share.width > 1) ? 1 : 0
  const over = (share: Share) => share.width - share.exact
  return shares
    .filter(share => share.width > floor)
    .reduce((best, share) => (over(share) > over(best) ? share : best))
}

/**
 * The cell, 0-based, where the compaction tick sits: the threshold's share of
 * the row, the last cell at most. Undefined without a threshold.
 */
export function tickColumn(
  threshold: number | undefined,
  window: number,
  width: number,
): number | undefined {
  const cells = Math.floor(width)
  if (threshold === undefined || threshold <= 0 || window <= 0 || cells <= 0) {
    return undefined
  }
  const column = Math.round((Math.min(threshold, window) / window) * cells) - 1
  return Math.min(cells - 1, Math.max(0, column))
}

/**
 * The bar as runs that fill `width` cells exactly: segments, then track, with
 * the tick laid over whichever cell the threshold lands on.
 */
export function layoutBar(
  segments: readonly Segment[],
  window: number,
  threshold: number | undefined,
  width: number,
): Run[] {
  const cells = Math.max(0, Math.floor(width))
  const widths = segmentWidths(segments, window, cells)
  const flat: Run[] = []
  segments.forEach((seg, index) => {
    const cellsFor = widths[index] ?? 0
    if (cellsFor > 0) {
      flat.push({ kind: 'segment', index, color: seg.color, width: cellsFor })
    }
  })
  const rest = cells - sum(widths)
  if (rest > 0) {
    flat.push({ kind: 'track', width: rest })
  }

  const tick = tickColumn(threshold, window, cells)
  if (tick === undefined) {
    return flat
  }
  return overlayTick(flat, tick)
}

function overlayTick(runs: readonly Run[], column: number): Run[] {
  const out: Run[] = []
  let start = 0
  for (const run of runs) {
    const end = start + run.width
    if (column >= start && column < end) {
      const before = column - start
      const after = end - column - 1
      if (before > 0) {
        out.push({ ...run, width: before } as Run)
      }
      out.push({ kind: 'tick', width: 1 })
      if (after > 0) {
        out.push({ ...run, width: after } as Run)
      }
    } else {
      out.push(run)
    }
    start = end
  }
  return out
}

/**
 * The bar in text alone, for `NO_COLOR`: each segment drawn in its own glyph
 * (the legend's swatch, by `glyph`), track as `·`, the tick as `|`.
 */
export const TEXT_GLYPHS = ['█', '▓', '▒', '░'] as const

export function glyph(index: number): string {
  return TEXT_GLYPHS[index % TEXT_GLYPHS.length] ?? '█'
}

export function textBar(runs: readonly Run[]): string {
  return runs
    .map(run => {
      if (run.kind === 'tick') {
        return '|'
      }
      if (run.kind === 'track') {
        return '·'.repeat(run.width)
      }
      return glyph(run.index).repeat(run.width)
    })
    .join('')
}

/**
 * Settles the card from a usage reading. With a breakdown, every figure
 * comes from it, so header, bar and legend agree; without one, the plain
 * fill and window. Undefined while there is nothing to show yet.
 */
export function toCard(context: {
  tokens?: number
  window: number
  breakdown?: {
    categories: readonly Row[]
    totalTokens: number
    rawMaxTokens: number
    autoCompactThreshold?: number
    isAutoCompactEnabled: boolean
  }
}): Card | undefined {
  if (!context.tokens) {
    return undefined
  }
  const b = context.breakdown
  if (!b || b.rawMaxTokens <= 0) {
    return {
      used: context.tokens,
      window: context.window,
      percent: percentOf(context.tokens, context.window),
      segments: [],
    }
  }
  return {
    used: b.totalTokens,
    window: b.rawMaxTokens,
    percent: percentOf(b.totalTokens, b.rawMaxTokens),
    threshold: b.isAutoCompactEnabled ? b.autoCompactThreshold : undefined,
    segments: toSegments(b.categories),
  }
}
