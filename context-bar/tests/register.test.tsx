import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, SessionUsage } from 'claude-code'

// Runs under `claude plugin test context-bar`: the engine's own host, with
// the hooks registered here standing for the engine beneath the mod.

const START = { cwd: '/work', surface: 'terminal', isInteractive: true } as const
const RUN = {
  command: 'context-bar',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 100 },
} as const

function band(bodyColumns = 96, hasSurvey = false) {
  return {
    plugin: 'context-bar',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: {
      hasSurvey,
      isWorking: false,
      maxRows: 20,
      bodyColumns,
      scroll: { offset: 0, bodyRows: 19 },
      view: {},
    },
  } as const
}

function usage(tokens: number | undefined, messages = 0): SessionUsage {
  return {
    startedAt: 0,
    rateLimits: [],
    context: {
      tokens,
      window: 1_000_000,
      percent: tokens === undefined ? undefined : Math.round(tokens / 10_000),
      breakdown: {
        categories: [
          { name: 'System prompt', tokens: 4_200, color: 'promptBorder', isDeferred: false, kind: 'used' },
          { name: 'MCP tools', tokens: 52_000, color: 'cyan_FOR_SUBAGENTS_ONLY', isDeferred: false, kind: 'used' },
          { name: 'Messages', tokens: messages, color: 'permission', isDeferred: false, kind: 'used' },
          { name: 'Free space', tokens: 900_000, color: 'promptBorder', isDeferred: false, kind: 'free' },
          { name: 'Autocompact buffer', tokens: 13_000, color: 'inactive', isDeferred: false, kind: 'buffer' },
        ],
        totalTokens: 56_200 + messages,
        maxTokens: 1_000_000,
        rawMaxTokens: 1_000_000,
        autocompactSource: 'auto',
        percentage: 6,
        gridRows: [],
        model: 'test-model',
        memoryFiles: [],
        mcpTools: [],
        agents: [],
        autoCompactThreshold: 987_000,
        isAutoCompactEnabled: true,
        apiUsage: null,
      },
    },
  }
}

/** The engine beneath the mod: a usage reading the test can change. */
function engine(on: On, env: Record<string, string> = {}, store: Record<string, unknown> = {}) {
  let reading = usage(90_000)
  const registered: string[] = []
  mock.store(on, store)
  mock.env(on, env)
  on('command.register', (_$, e) => {
    registered.push(`${e.name}: ${e.description}`)
    return { value: { command: e.name } }
  })
  on('session.start', () => ({ cwd: START.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.usage', () => ({ value: reading }))
  // What the engine draws when the mod passes.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine band</Text>
  })
  return {
    registered,
    set(next: SessionUsage) {
      reading = next
    },
  }
}

describe('context bar', () => {
  test('draws the header, bar and legend once usage is reported', async ($, on) => {
    engine(on)
    await $.session.start(START)
    const ui = await $.ui.mount(band())

    expect((await ui.find({ type: 'Text', text: /◆ context/ }))).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /56k of 1M · compacts at 987k/ }))).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /mcp tools 52k 5%/ }))).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /messages 0 0%/ }))).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /free space|autocompact/ })).toBeUndefined()
    await ui.unmount()
  })

  test('the badge is green below 70%', async ($, on) => {
    engine(on)
    await $.session.start(START)
    const ui = await $.ui.mount(band())

    const badge = await ui.find({ type: 'Text', text: /^ 6% $/ })
    expect(badge?.props.backgroundColor).toBe('success')
    expect(badge?.props.color).toBe('inverseText')
    await ui.unmount()
  })

  test("paints with the engine's colors and a yellow tick", async ($, on) => {
    engine(on)
    await $.session.start(START)
    const ui = await $.ui.mount(band())

    const tree = JSON.stringify(await ui.drawn())
    expect(tree).toContain('"backgroundColor":"promptBorder"')
    expect(tree).toContain('"backgroundColor":"cyan_FOR_SUBAGENTS_ONLY"')
    expect(tree).toContain('"backgroundColor":"warning"')
    await ui.unmount()
  })

  test('shows nothing before the first response', async ($, on) => {
    const world = engine(on)
    world.set(usage(undefined))
    await $.session.start(START)
    const ui = await $.ui.mount(band())

    expect(await ui.find({ type: 'Text', text: /◆/ })).toBeUndefined()
    await ui.unmount()
  })

  test('yields the band to a survey', async ($, on) => {
    engine(on)
    await $.session.start(START)
    const ui = await $.ui.mount(band(96, true))

    expect(await ui.find({ type: 'Text', text: /◆/ })).toBeUndefined()
    await ui.unmount()
  })

  test('refreshes when the context moves', async ($, on) => {
    const world = engine(on)
    await $.session.start(START)
    const ui = await $.ui.mount(band())

    world.set(usage(108_000, 18_000))
    await $.session.measure({ context: usage(108_000).context, rateLimits: [], changed: ['context'] })
    expect(await ui.find({ type: 'Text', text: /messages 18k 2%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /74k of 1M/ })).toBeDefined()
    await ui.unmount()
  })

  test('/context-bar hides and shows it, and remembers', async ($, on) => {
    engine(on)
    await $.session.start(START)
    const ui = await $.ui.mount(band())

    expect((await $.command.run(RUN)).text).toBe('Context bar hidden.')
    expect(await ui.find({ type: 'Text', text: /◆/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /engine band/ })).toBeDefined()

    // A new session (or a reload) reads the flag back from the store.
    await $.session.start(START)
    expect(await ui.find({ type: 'Text', text: /◆/ })).toBeUndefined()

    expect((await $.command.run(RUN)).text).toBe('Context bar shown.')
    expect(await ui.find({ type: 'Text', text: /◆/ })).toBeDefined()
    await $.session.start(START)
    expect(await ui.find({ type: 'Text', text: /◆/ })).toBeDefined()
    await ui.unmount()
  })

  test('a hidden bar stays hidden in the next session', async ($, on) => {
    engine(on, {}, { hidden: true })
    await $.session.start(START)
    const ui = await $.ui.mount(band())

    expect(await ui.find({ type: 'Text', text: /◆/ })).toBeUndefined()
    await ui.unmount()
  })

  test('registers the command with the slash-list description', async ($, on) => {
    const world = engine(on)
    await $.session.start(START)

    expect(world.registered).toContain(
      'context-bar: Show a live breakdown of the context window above the prompt',
    )
  })

  test('NO_COLOR draws a text-only bar', async ($, on) => {
    engine(on, { NO_COLOR: '1' })
    await $.session.start(START)
    const ui = await $.ui.mount(band())

    const tree = JSON.stringify(await ui.drawn())
    expect(tree).not.toContain('backgroundColor')
    expect(await ui.find({ type: 'Text', text: /\[6%\]/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /█+▓+·+\|·/ })).toBeDefined()
    await ui.unmount()
  })
})
