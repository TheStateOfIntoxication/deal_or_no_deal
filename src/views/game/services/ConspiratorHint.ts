import type { RandomSource } from '@/utils/random'

/** Coarse case tiers used by the conspirator's whispers */
export enum CaseTierEnum {
  top = 'top',
  high = 'high',
  mid = 'mid',
  low = 'low'
}

/** First eligible hover of a round has this chance to trigger a whisper */
export const CONSPIRATOR_HINT_CHANCE = 0.35
/** When triggered, this share is truthful; the rest are lies */
export const CONSPIRATOR_TRUTH_CHANCE = 0.6

export interface ConspiratorHint {
  trueTier: CaseTierEnum
  claimTier: CaseTierEnum
  truthful: boolean
}

/** Classify an amount against the current pool; top prize is exact */
export function caseTierOf(amount: number, pool: readonly number[], topPrize: number): CaseTierEnum {
  if (amount === topPrize) return CaseTierEnum.top
  if (pool.length === 0) return CaseTierEnum.low
  const share = pool.filter((value) => value <= amount).length / pool.length
  if (share >= 0.75) return CaseTierEnum.high
  if (share >= 0.3) return CaseTierEnum.mid
  return CaseTierEnum.low
}

function claimTierOf(trueTier: CaseTierEnum, random: RandomSource): CaseTierEnum {
  const options = Object.values(CaseTierEnum).filter((tier) => tier !== trueTier)
  return options[Math.floor(random.next() * options.length)] as CaseTierEnum
}

/**
 * Roll a whisper. Returns null when it does not trigger.
 * A lie always claims a different tier, so a "top" claim is not guaranteed true.
 */
export function createConspiratorHint(
  amount: number,
  pool: readonly number[],
  topPrize: number,
  random: RandomSource
): ConspiratorHint | null {
  if (random.next() >= CONSPIRATOR_HINT_CHANCE) return null
  const trueTier = caseTierOf(amount, pool, topPrize)
  const truthful = random.next() < CONSPIRATOR_TRUTH_CHANCE
  return {
    trueTier,
    claimTier: truthful ? trueTier : claimTierOf(trueTier, random),
    truthful
  }
}
