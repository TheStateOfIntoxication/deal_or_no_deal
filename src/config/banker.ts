import { BankerPlanEnum } from '@/types/game'

/** Per-plan delta caps; values are multiplier deltas */
export const BANKER_PLAN_CAPS: Record<BankerPlanEnum, readonly number[]> = {
  [BankerPlanEnum.steady]: [0],
  [BankerPlanEnum.lowball]: [0.02, 0.03, 0.04],
  [BankerPlanEnum.rebate]: [0.02, 0.03, 0.04],
  [BankerPlanEnum.generous]: [0.02, 0.04],
  [BankerPlanEnum.finalPush]: [0.02]
}

/** Plan trigger thresholds (rules, not presentation) */
export const BANKER_PLAN_RULES = {
  lowballMinRage: 33,
  lowballMaxTopProb: 0.1,
  lowballRoundMin: 4,
  lowballRoundMax: 8,
  rebateMaxStreak: 3,
  generousMinTopProb: 0.25,
  generousMaxOfferRatio: 0.35,
  repeatLimit: 2
} as const

/** Base sampling weights; conditions gate each plan before sampling */
export const BANKER_PLAN_BASE_WEIGHTS: Record<BankerPlanEnum, number> = {
  [BankerPlanEnum.steady]: 4,
  [BankerPlanEnum.lowball]: 1,
  [BankerPlanEnum.rebate]: 0,
  [BankerPlanEnum.generous]: 1,
  [BankerPlanEnum.finalPush]: 0
}

/** Gambler honor bonus when the final prize beats the banker highest offer */
export const BANKER_HONOR_RATE = 0.1

/** Collector: final offer factor while at least one top prize remains */
export const COLLECTOR_TOP_PRESENT_FACTOR = 0.96
/** Collector: final offer factor after all top prizes are gone */
export const COLLECTOR_TOP_GONE_FACTOR = 1.08

/** Casino boss: side bet limits and payout factors */
export const CASINO_SIDE_BET_MAX_USES = 2
export const CASINO_SIDE_BET_WIN_FACTOR = 1.06
export const CASINO_SIDE_BET_LOSS_FACTOR = 0.92
