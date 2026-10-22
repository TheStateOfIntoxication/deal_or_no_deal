import type { MessageKey } from '@/language'
import type { GameConfig } from '@/config/game'
import type { GameModeEnum } from '@/types/game'

/** How the mode prepares its pool before the main flow */
export type ModeSetupKind = 'k-draw' | 'fixed'

/** Fields a mode may override on the default GameConfig */
export type ModeConfigOverrides = Pick<
  GameConfig,
  | 'baseAmounts'
  | 'topPrize'
  | 'randomKEnabled'
  | 'fixedK'
  | 'kMin'
  | 'kMax'
  | 'kWeights'
  | 'offerBaseMode'
>

/** Static definition of one pre-game mode card */
export interface GameModeDefinition {
  id: GameModeEnum
  nameKey: MessageKey
  taglineKey: MessageKey
  descKey: MessageKey
  /** Three bullet rules shown on the card face */
  ruleKeys: [MessageKey, MessageKey, MessageKey]
  /** Key numbers line, e.g. expected value range */
  statKey: MessageKey
  icon: string
  tone: 'gold' | 'violet'
  setup: ModeSetupKind
  overrides: ModeConfigOverrides
  features: {
    persona: boolean
    audience: boolean
    bankerPlans: boolean
  }
}
