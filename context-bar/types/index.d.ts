/** One used category of the window, as the legend and the bar draw it. */
export type Segment = { name: string; tokens: number; color: string }

/** What the card draws, settled from the session's usage reading. */
export type Card = {
  used: number
  window: number
  percent: number
  threshold?: number
  segments: Segment[]
}

declare module 'claude-code' {
  interface PluginState {
    'context-bar': {
      card: Card | null
      isHidden: boolean
      isPlain: boolean
    }
  }
}
