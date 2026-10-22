import { GRADE_BAD_SHARE, GRADE_DISASTER_SHARE, GRADE_NEUTRAL_SHARE, PAYOUT_BIG_SHARE, PAYOUT_NORMAL_SHARE } from '@/config/presentation'
import { AmountGradeEnum, PayoutGradeEnum } from '@/types/game'

/** Continuous, amount-driven color used by the screen flash */
export interface AmountTone {
  /** 0 = smallest unique amount, 1 = largest unique amount */
  ratio: number
  /** hsla color string; green at 0, red at 1 */
  glow: string
}

/**
 * 开箱金额分级：按该金额在金额池中的累计分位判定，
 * 分位越高说明玩家送走的钱越多，情绪反馈越负面。
 */
export class AmountGrader {
  /**
   * Continuous tone for the reveal flash. Unlike the four display grades,
   * this never hard-switches at a threshold: the hue moves from green to red
   * across the unique amounts of the current pool.
   */
  static toneOf(amount: number, pool: readonly number[]): AmountTone {
    if (pool.length === 0) return { ratio: 0.5, glow: 'hsla(60, 85%, 55%, 0.45)' }

    // Rank against unique values, not raw value / max: amount pools span several
    // orders of magnitude, but a second-highest $750K should still read as near-red.
    const unique = [...new Set(pool)].sort((left, right) => left - right)
    let ratio = 0.5
    if (unique.length > 1) {
      if (amount <= unique[0]) ratio = 0
      else if (amount >= unique[unique.length - 1]) ratio = 1
      else {
        const index = unique.findIndex((value) => value >= amount)
        ratio = index < 0 ? 0.5 : index / (unique.length - 1)
      }
    }
    const hue = 120 - ratio * 120
    const alpha = 0.28 + ratio * 0.34
    return { ratio, glow: `hsla(${hue.toFixed(1)}, 85%, 55%, ${alpha.toFixed(2)})` }
  }

  static gradeOf(amount: number, pool: readonly number[]): AmountGradeEnum {
    if (pool.length === 0) return AmountGradeEnum.neutral

    const share = pool.filter((value) => value <= amount).length / pool.length
    if (share >= GRADE_DISASTER_SHARE) return AmountGradeEnum.disaster
    if (share >= GRADE_BAD_SHARE) return AmountGradeEnum.bad
    if (share >= GRADE_NEUTRAL_SHARE) return AmountGradeEnum.neutral
    return AmountGradeEnum.good
  }

  /**
   * 到手奖金分级：金额越高越喜庆；命中顶奖单独称“jackpot”，便于结算时放大效果。
   */
  static payoutGradeOf(
    prize: number,
    pool: readonly number[],
    topPrize: number
  ): PayoutGradeEnum {
    if (prize >= topPrize) return PayoutGradeEnum.jackpot
    if (pool.length === 0) return PayoutGradeEnum.normal

    const share = pool.filter((value) => value <= prize).length / pool.length
    if (share >= PAYOUT_BIG_SHARE) return PayoutGradeEnum.big
    if (share >= PAYOUT_NORMAL_SHARE) return PayoutGradeEnum.normal
    return PayoutGradeEnum.small
  }
}
