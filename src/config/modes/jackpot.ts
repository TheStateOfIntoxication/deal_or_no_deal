import { BASE_AMOUNTS_CENTS, TOP_PRIZE_CENTS } from '@/config/game'
import { GameModeEnum } from '@/types/game'
import type { GameModeDefinition } from './types'

/** $5,000,000 in cents; exactly one copy */
export const JACKPOT_TOP_PRIZE_CENTS = 500_000_000

/** Replace the $0.01 base amount with the universal guaranteed $1M */
export const JACKPOT_BASE_AMOUNTS_CENTS = [...BASE_AMOUNTS_CENTS.slice(1), TOP_PRIZE_CENTS]

/** Jackpot: one unique $5M, at least one $1M, no k draw, 25 base + 1 top = 26 */
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
    baseAmounts: [...JACKPOT_BASE_AMOUNTS_CENTS],
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
