import type { EngineInterface } from 'claude-code'

import {
  type Card as CardData,
  TICK_COLOR,
  TRACK_COLOR,
  badgeTone,
  glyph,
  k,
  layoutBar,
  percentOf,
  textBar,
} from './format'

type Ui = ReturnType<EngineInterface['ui']['resolve']>

type Props = { ui: Ui; card: CardData; width: number; isPlain: boolean }

/** Columns the round border and one cell of padding each side take. */
export const CHROME = 4

/** The whole card: header, bar and legend in a round border. */
export function Card({ ui, card, width, isPlain }: Props) {
  const { Box } = ui
  const inner = Math.max(1, width - CHROME)

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} width={width}>
      <Header ui={ui} card={card} width={inner} isPlain={isPlain} />
      <Bar ui={ui} card={card} width={inner} isPlain={isPlain} />
      <Legend ui={ui} card={card} width={inner} isPlain={isPlain} />
    </Box>
  )
}

function Header({ ui, card, isPlain }: Props) {
  const { Box, Text } = ui
  const badge = ` ${card.percent}% `

  return (
    <Box flexDirection="row" justifyContent="space-between" flexWrap="wrap">
      <Text>
        <Text color={isPlain ? undefined : 'claude'}>◆</Text> <Text bold>context</Text>
      </Text>
      <Text>
        <Text bold>{k(card.used)}</Text>
        <Text dimColor> of {k(card.window)}</Text>
        {card.threshold === undefined ? '' : <Text dimColor> · compacts at {k(card.threshold)}</Text>}{' '}
        {isPlain ? (
          <Text bold>[{card.percent}%]</Text>
        ) : (
          <Text bold color="inverseText" backgroundColor={badgeTone(card.percent)}>
            {badge}
          </Text>
        )}
      </Text>
    </Box>
  )
}

function Bar({ ui, card, width, isPlain }: Props) {
  const { Box, Text } = ui
  const runs = layoutBar(card.segments, card.window, card.threshold, width)

  if (isPlain) {
    return <Text>{textBar(runs)}</Text>
  }

  return (
    <Box flexDirection="row" width={width} height={1}>
      {runs.map(run => (
        <Box
          width={run.width}
          height={1}
          flexShrink={0}
          backgroundColor={
            run.kind === 'segment' ? run.color : run.kind === 'tick' ? TICK_COLOR : TRACK_COLOR
          }
        />
      ))}
    </Box>
  )
}

function Legend({ ui, card, isPlain }: Props) {
  const { Box, Text } = ui

  return (
    <Box flexDirection="row" flexWrap="wrap" columnGap={3}>
      {card.segments.map((s, i) => (
        <Text>
          {isPlain ? <Text>{glyph(i)}</Text> : <Text color={s.color}>■</Text>}{' '}
          <Text dimColor>{s.name}</Text> <Text bold>{k(s.tokens)}</Text>{' '}
          <Text dimColor>{percentOf(s.tokens, card.window)}%</Text>
        </Text>
      ))}
    </Box>
  )
}
