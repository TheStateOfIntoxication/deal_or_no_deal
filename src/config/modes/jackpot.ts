import { BASE_AMOUNTS_CENTS } from '@/config/game'
import { GameModeEnum } from '@/types/game'
import type { GameModeDefinition } from './types'

/** $5,000,000 in cents; exactly one copy, no $1,000,000 in this mode */
export const JACKPOT_TOP_PRIZE_CENTS = 500_000_000

/** Jackpot: one unique $5M, no k draw, 25 base amounts + 1 top prize = 26 cases */
export const JACKPOT_MODE: GameModeDefinition = {
  id: GameModeEnum.jackpot,
  nameKey: 'ModeJackpotName',
  taglineKey: 'ModeJackpotTagline',
  descKey: 'ModeJackpotDesc',
  ruleKeys: ['ModeJackpotRule1', 'ModeJackpotRule2', 'ModeJackpotRule3'],
  statKey: 'ModeJackpotStat',
  icon: '👑',
  tone: 'violet',
  setup: 'fixed',
  overrides: {
    baseAmounts: [...BASE_AMOUNTS_CENTS],
    topPrize: JACKPOT_TOP_PRIZE_CENTS,
    randomKEnabled: false,
    fixedK: 1,
    kMin: 1,
    kMax: 1,
    kWeights: null,
    offerBaseMode: 'mean'
  },
  features: {
    persona: true,
    audience: true,
    bankerPlans: true
  }
}
