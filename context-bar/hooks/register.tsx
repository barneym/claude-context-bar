import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { toCard } from './format'
import { Card } from './parts'

const card = atom({ plugin: 'context-bar', key: 'card' } as const, null)
const isHidden = atom({ plugin: 'context-bar', key: 'isHidden' } as const, false)
const isPlain = atom({ plugin: 'context-bar', key: 'isPlain' } as const, false)

/** The one `$.store` key: whether the person hid the bar, across sessions. */
const HIDDEN_KEY = 'hidden'

export const COMMAND = 'context-bar'
export const DESCRIPTION = 'Show a live breakdown of the context window above the prompt'
export const SHOWN = 'Context bar shown.'
export const HIDDEN = 'Context bar hidden.'

/**
 * Reads the window's breakdown (`summary` is estimated locally and sends no
 * request) and keeps only the figures the card draws.
 */
async function refresh($: EngineInterface) {
  const { context } = await $.session.usage({ breakdown: 'summary' })
  const next = toCard(context) ?? null
  await update($, card, () => next)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: COMMAND, description: DESCRIPTION })
    const hidden = (await $.store.get(HIDDEN_KEY)) === true
    const plain = Boolean(await $.env.get('NO_COLOR'))
    await update($, isHidden, () => hidden)
    await update($, isPlain, () => plain)
    await refresh($)

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) {
      await refresh($)
    }

    return next(e)
  })

  // A compaction empties the reading until the next response; drop the card
  // rather than show the figures from before it.
  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    if (e.trigger !== 'precompute' && !('skip' in result)) {
      await refresh($)
    }

    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: COMMAND }, async $ => {
    const hidden = !(await read($, isHidden))
    await update($, isHidden, () => hidden)
    await $.store.set(HIDDEN_KEY, hidden)

    return { text: hidden ? HIDDEN : SHOWN }
  }).catch(() => ({ text: 'Context bar could not be toggled.' }))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const [shown, hidden, plain] = await Promise.all([
      read($, card),
      read($, isHidden),
      read($, isPlain),
    ])
    if (!shown || hidden) {
      return next(e)
    }

    return <Card ui={$.ui.resolve(e)} card={shown} width={e.props.bodyColumns} isPlain={plain} />
  })
}
