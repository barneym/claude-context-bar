import { describe, expect, test } from 'bun:test'

import {
  FALLBACK_COLORS,
  type Row,
  type Run,
  type Segment,
  badgeTone,
  glyph,
  k,
  label,
  layoutBar,
  percentOf,
  segmentWidths,
  textBar,
  tickColumn,
  toCard,
  toSegments,
} from '../hooks/format'

// The demo's reading: 90k used of a 1M window, compacting at 987k.
const DEMO: Segment[] = [
  { name: 'system prompt', tokens: 4_200, color: 'blue' },
  { name: 'tools', tokens: 17_000, color: 'cyan' },
  { name: 'mcp tools', tokens: 52_000, color: 'magenta' },
  { name: 'agents', tokens: 3_400, color: 'green' },
  { name: 'memory files', tokens: 8_600, color: 'yellow' },
  { name: 'skills', tokens: 5_100, color: 'magentaBright' },
  { name: 'messages', tokens: 0, color: 'redBright' },
]

const width = (runs: readonly Run[]) => runs.reduce((n, r) => n + r.width, 0)

describe('k', () => {
  test.each([
    [0, '0'],
    [950, '950'],
    [999.6, '1000'],
    [1_000, '1k'],
    [4_200, '4.2k'],
    [9_949, '9.9k'],
    [9_960, '10k'],
    [17_000, '17k'],
    [90_000, '90k'],
    [897_000, '897k'],
    [987_000, '987k'],
    [999_499, '999k'],
    [999_500, '1M'],
    [1_000_000, '1M'],
    [1_500_000, '1.5M'],
    [12_000_000, '12M'],
  ])('%p is %p', (n, out) => {
    expect(k(n)).toBe(out)
  })

  test('a negative count reads as zero', () => {
    expect(k(-5)).toBe('0')
  })
})

describe('percentOf', () => {
  test('matches the demo legend', () => {
    expect(DEMO.map(s => percentOf(s.tokens, 1_000_000))).toEqual([1, 2, 5, 1, 1, 1, 0])
  })

  test('matches the demo header as messages grow', () => {
    expect(percentOf(90_000, 1_000_000)).toBe(9)
    expect(percentOf(95_000, 1_000_000)).toBe(10)
    expect(percentOf(108_000, 1_000_000)).toBe(11)
  })

  test('anything above zero is at least 1%', () => {
    expect(percentOf(1, 1_000_000)).toBe(1)
  })

  test('an empty window is 0%', () => {
    expect(percentOf(5, 0)).toBe(0)
  })

  test('past the window reads past 100%', () => {
    expect(percentOf(1_200_000, 1_000_000)).toBe(120)
  })
})

describe('badgeTone', () => {
  test.each([
    [0, 'success'],
    [9, 'success'],
    [69, 'success'],
    [70, 'warning'],
    [84, 'warning'],
    [85, 'error'],
    [120, 'error'],
  ])('%p%% is %p', (percent, tone) => {
    expect(badgeTone(percent)).toBe(tone)
  })
})

describe('toSegments', () => {
  const rows: Row[] = [
    { name: 'System prompt', tokens: 4_200, color: 'promptBorder', kind: 'used' },
    { name: 'MCP tools', tokens: 52_000, color: '', kind: 'used' },
    { name: 'MCP tools (deferred)', tokens: 9_000, color: 'inactive', kind: 'deferred' },
    { name: 'Messages', tokens: 0, color: 'permission', kind: 'used' },
    { name: 'Free space', tokens: 897_000, color: 'inactive', kind: 'free' },
    { name: 'Autocompact buffer', tokens: 13_000, color: 'inactive', kind: 'buffer' },
  ]

  test('keeps used rows only, in order, zero rows included', () => {
    expect(toSegments(rows).map(s => s.name)).toEqual(['system prompt', 'mcp tools', 'messages'])
  })

  test("prefers the engine's color and falls back by position", () => {
    expect(toSegments(rows).map(s => s.color)).toEqual([
      'promptBorder',
      FALLBACK_COLORS[1],
      'permission',
    ])
  })

  test('label lower-cases and trims', () => {
    expect(label('  Memory files ')).toBe('memory files')
  })
})

describe('segmentWidths', () => {
  test('a 100-cell bar is proportional, small segments kept visible', () => {
    const widths = segmentWidths(DEMO, 1_000_000, 100)
    expect(widths.reduce((a, b) => a + b, 0)).toBe(9)
    expect(widths[2]).toBeGreaterThanOrEqual(widths[1])
    expect(widths[1]).toBeGreaterThanOrEqual(widths[0])
    expect(widths.slice(0, 6).every(w => w >= 1)).toBe(true)
    expect(widths[6]).toBe(0)
  })

  test('a 1000-cell bar is exact', () => {
    expect(segmentWidths(DEMO, 1_000_000, 1000)).toEqual([4, 17, 52, 3, 9, 5, 0])
  })

  test('more segments than cells fills every cell and no more', () => {
    const widths = segmentWidths(DEMO, 1_000_000, 3)
    expect(widths.reduce((a, b) => a + b, 0)).toBe(3)
    expect(widths[2]).toBe(1)
  })

  test('past the window, segments fill the bar', () => {
    const over = DEMO.map(s => ({ ...s, tokens: s.tokens * 20 }))
    expect(segmentWidths(over, 1_000_000, 40).reduce((a, b) => a + b, 0)).toBe(40)
  })

  test('no width, no window or no tokens is all zero', () => {
    expect(segmentWidths(DEMO, 1_000_000, 0)).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(segmentWidths(DEMO, 0, 50)).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(segmentWidths(DEMO.map(s => ({ ...s, tokens: 0 })), 1_000_000, 50)).toEqual([
      0, 0, 0, 0, 0, 0, 0,
    ])
  })
})

describe('tickColumn', () => {
  test("the demo's 987k of 1M sits on the last cells", () => {
    expect(tickColumn(987_000, 1_000_000, 100)).toBe(98)
    expect(tickColumn(987_000, 1_000_000, 60)).toBe(58)
  })

  test('halfway is the middle', () => {
    expect(tickColumn(500_000, 1_000_000, 10)).toBe(4)
  })

  test('clamps to the row', () => {
    expect(tickColumn(2_000_000, 1_000_000, 10)).toBe(9)
    expect(tickColumn(1, 1_000_000, 10)).toBe(0)
  })

  test('no threshold, no tick', () => {
    expect(tickColumn(undefined, 1_000_000, 10)).toBeUndefined()
    expect(tickColumn(0, 1_000_000, 10)).toBeUndefined()
    expect(tickColumn(500, 0, 10)).toBeUndefined()
    expect(tickColumn(500, 1_000, 0)).toBeUndefined()
  })
})

describe('layoutBar', () => {
  test('always fills the width exactly', () => {
    for (const cells of [1, 5, 37, 60, 100, 211]) {
      expect(width(layoutBar(DEMO, 1_000_000, 987_000, cells))).toBe(cells)
    }
  })

  test('segments, then track, with the tick near the end', () => {
    const runs = layoutBar(DEMO, 1_000_000, 987_000, 100)
    expect(runs.slice(0, 6).every(r => r.kind === 'segment')).toBe(true)
    expect(runs.map(r => r.kind).slice(-3)).toEqual(['track', 'tick', 'track'])
    expect(runs.at(-1)?.width).toBe(1)
  })

  test('no threshold, no tick', () => {
    expect(layoutBar(DEMO, 1_000_000, undefined, 50).some(r => r.kind === 'tick')).toBe(false)
  })

  test('the tick lays over a segment once usage passes it', () => {
    const big: Segment[] = [{ name: 'messages', tokens: 900_000, color: 'red' }]
    const runs = layoutBar(big, 1_000_000, 500_000, 10)
    expect(runs.map(r => [r.kind, r.width])).toEqual([
      ['segment', 4],
      ['tick', 1],
      ['segment', 4],
      ['track', 1],
    ])
  })

  test('zero width is empty', () => {
    expect(layoutBar(DEMO, 1_000_000, 987_000, 0)).toEqual([])
  })
})

describe('textBar', () => {
  test('one glyph per segment, dots for track, a bar for the tick', () => {
    const runs: Run[] = [
      { kind: 'segment', index: 0, color: 'x', width: 2 },
      { kind: 'segment', index: 1, color: 'y', width: 1 },
      { kind: 'track', width: 3 },
      { kind: 'tick', width: 1 },
      { kind: 'track', width: 1 },
    ]
    expect(textBar(runs)).toBe('██▓···|·')
  })

  test("a segment's glyph follows its legend index, not its run order", () => {
    const runs: Run[] = [{ kind: 'segment', index: 2, color: 'x', width: 1 }]
    expect(textBar(runs)).toBe(glyph(2))
    expect(glyph(2)).toBe('▒')
    expect(glyph(5)).toBe('▓')
  })

  test('is as long as the bar', () => {
    expect([...textBar(layoutBar(DEMO, 1_000_000, 987_000, 60))].length).toBe(60)
  })
})

describe('toCard', () => {
  const breakdown = {
    categories: [
      { name: 'System prompt', tokens: 4_200, color: 'promptBorder', kind: 'used' },
      { name: 'Messages', tokens: 85_800, color: 'permission', kind: 'used' },
      { name: 'Free space', tokens: 897_000, color: 'inactive', kind: 'free' },
    ] satisfies Row[],
    totalTokens: 90_000,
    rawMaxTokens: 1_000_000,
    autoCompactThreshold: 987_000,
    isAutoCompactEnabled: true,
  }

  test('nothing before the first response', () => {
    expect(toCard({ window: 1_000_000 })).toBeUndefined()
    expect(toCard({ tokens: 0, window: 1_000_000, breakdown })).toBeUndefined()
  })

  test('takes every figure from the breakdown when there is one', () => {
    const card = toCard({ tokens: 91_000, window: 1_000_000, breakdown })
    expect(card).toEqual({
      used: 90_000,
      window: 1_000_000,
      percent: 9,
      threshold: 987_000,
      segments: [
        { name: 'system prompt', tokens: 4_200, color: 'promptBorder' },
        { name: 'messages', tokens: 85_800, color: 'permission' },
      ],
    })
  })

  test('measures against a smaller compaction window', () => {
    const card = toCard({
      tokens: 90_000,
      window: 1_000_000,
      breakdown: { ...breakdown, rawMaxTokens: 400_000, autoCompactThreshold: 387_000 },
    })
    expect(card?.window).toBe(400_000)
    expect(card?.percent).toBe(23)
  })

  test('no threshold while auto-compaction is off', () => {
    const card = toCard({
      tokens: 90_000,
      window: 1_000_000,
      breakdown: { ...breakdown, isAutoCompactEnabled: false },
    })
    expect(card?.threshold).toBeUndefined()
  })

  test('falls back to the plain fill without a breakdown', () => {
    expect(toCard({ tokens: 90_000, window: 1_000_000 })).toEqual({
      used: 90_000,
      window: 1_000_000,
      percent: 9,
      segments: [],
    })
  })
})
