import { BANKER_PLAN_BASE_WEIGHTS, BANKER_PLAN_RULES } from '@/config/banker'
import { DEFAULT_BANKER_PROFILE } from '@/config/bankers'
import type { BankerProfile } from '@/config/bankers'
import { BankerPlanEnum } from '@/types/game'
import type { RandomSource } from '@/utils/random'

/** Everything the banker is allowed to know when choosing a plan */
export interface BankerPlanContext {
  round: number
  /** Probability that the player's case holds the top prize */
  topProb: number
  rage: number
  lastRejected: boolean
  rejectStreak: number
  /** Current offer (before this plan) / remaining expected value */
  offerRatio: number
  planHistory: readonly BankerPlanEnum[]
}

export interface BankerPlanChoice {
  id: BankerPlanEnum
  delta: number
}

function lowballDelta(rage: number): number {
  if (rage >= 66) return 0.04
  if (rage >= 33) return 0.03
  return 0.02
}

function rebateDelta(streak: number): number {
  return Math.min(0.04, 0.02 + Math.max(0, streak - 1) * 0.01)
}

function repeatsTwice(plan: BankerPlanEnum, history: readonly BankerPlanEnum[]): boolean {
  if (plan === BankerPlanEnum.steady) return false
  const recent = history.slice(-BANKER_PLAN_RULES.repeatLimit)
  return recent.length === BANKER_PLAN_RULES.repeatLimit && recent.every((item) => item === plan)
}

function allowed(plan: BankerPlanEnum, ctx: BankerPlanContext): boolean {
  switch (plan) {
    case BankerPlanEnum.lowball:
      return (
        ctx.topProb <= BANKER_PLAN_RULES.lowballMaxTopProb &&
        ctx.rage >= BANKER_PLAN_RULES.lowballMinRage &&
        ctx.round >= BANKER_PLAN_RULES.lowballRoundMin &&
        ctx.round <= BANKER_PLAN_RULES.lowballRoundMax
      )
    case BankerPlanEnum.rebate:
      return (
        ctx.lastRejected &&
        ctx.round <= BANKER_PLAN_RULES.lowballRoundMax &&
        ctx.rejectStreak <= BANKER_PLAN_RULES.rebateMaxStreak
      )
    case BankerPlanEnum.generous:
      return (
        ctx.topProb >= BANKER_PLAN_RULES.generousMinTopProb ||
        ctx.offerRatio < BANKER_PLAN_RULES.generousMaxOfferRatio
      )
    case BankerPlanEnum.finalPush:
      return ctx.round === 9
    case BankerPlanEnum.steady:
      return true
  }
}

function deltaOf(plan: BankerPlanEnum, ctx: BankerPlanContext): number {
  switch (plan) {
    case BankerPlanEnum.lowball:
      return lowballDelta(ctx.rage)
    case BankerPlanEnum.rebate:
      return rebateDelta(ctx.rejectStreak)
    case BankerPlanEnum.generous:
      return ctx.topProb >= BANKER_PLAN_RULES.generousMinTopProb ? 0.04 : 0.02
    case BankerPlanEnum.finalPush:
      return 0.02
    case BankerPlanEnum.steady:
      return 0
  }
}

/**
 * Conditions gate candidates, weights express intent.
 * Rejecting does NOT guarantee a rebate: the banker may also lowball.
 */
export function chooseBankerPlan(
  ctx: BankerPlanContext,
  random: RandomSource,
  profile: BankerProfile = DEFAULT_BANKER_PROFILE
): BankerPlanChoice {
  if (ctx.round === 9) {
    return { id: BankerPlanEnum.finalPush, delta: deltaOf(BankerPlanEnum.finalPush, ctx) }
  }

  const weights: Record<BankerPlanEnum, number> = {
    ...BANKER_PLAN_BASE_WEIGHTS,
    ...profile.planWeights
  }
  weights.rebate = ctx.lastRejected ? 3 : 0
  weights.generous = ctx.offerRatio < BANKER_PLAN_RULES.generousMaxOfferRatio ? 3 : 1

  if (ctx.lastRejected) {
    weights.steady = 2
    weights.lowball = Math.max(weights.lowball, 1)
  }
  if (ctx.topProb >= BANKER_PLAN_RULES.generousMinTopProb) {
    weights.steady = 2
    weights.lowball = 0
    weights.generous = 3
    weights.rebate = ctx.lastRejected ? 1 : 0
  }
  if (ctx.rage >= 66 && ctx.topProb <= BANKER_PLAN_RULES.lowballMaxTopProb) {
    weights.steady = 1
    weights.lowball = 3
    weights.generous = 0
    weights.rebate = ctx.lastRejected ? 1 : 0
  }

  const candidates = Object.values(BankerPlanEnum)
    .filter((plan) => allowed(plan, ctx) && weights[plan] > 0)
    .filter((plan) => !repeatsTwice(plan, ctx.planHistory))

  if (candidates.length === 0) {
    return { id: BankerPlanEnum.steady, delta: 0 }
  }

  const total = candidates.reduce((sum, plan) => sum + weights[plan], 0)
  let cursor = random.next() * total
  for (const plan of candidates) {
    cursor -= weights[plan]
    if (cursor < 0) return { id: plan, delta: deltaOf(plan, ctx) }
  }

  const fallback = candidates[candidates.length - 1] as BankerPlanEnum
  return { id: fallback, delta: deltaOf(fallback, ctx) }
}
