import { BASE_AMOUNTS_CENTS, TOP_PRIZE_CENTS } from '@/config/game'
import { GameModeEnum } from '@/types/game'
import type { GameModeDefinition } from './types'

/** Classic: draw k = 2–6, k copies of $1,000,000 (R-4.1, R-4.2) */
export const CLASSIC_MODE: GameModeDefinition = {
  id: GameModeEnum.classic,
  nameKey: 'ModeClassicName',
  taglineKey: 'ModeClassicTagline',
  descKey: 'ModeClassicDesc',
  ruleKeys: ['ModeClassicRule1', 'ModeClassicRule2', 'ModeClassicRule3'],
  statKey: 'ModeClassicStat',
  icon: '💰',
  tone: 'gold',
  setup: 'k-draw',
  overrides: {
    baseAmounts: [...BASE_AMOUNTS_CENTS],
    topPrize: TOP_PRIZE_CENTS,
    randomKEnabled: true,
    fixedK: 2,
    kMin: 2,
    kMax: 6,
    kWeights: null,
    offerBaseMode: 'mean'
  },
  features: {
    persona: true,
    audience: true,
    bankerPlans: true
  }
}
