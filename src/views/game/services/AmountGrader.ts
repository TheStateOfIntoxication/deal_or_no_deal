import { GRADE_BAD_SHARE, GRADE_DISASTER_SHARE, GRADE_NEUTRAL_SHARE, PAYOUT_BIG_SHARE, PAYOUT_NORMAL_SHARE } from '@/config/presentation'
import { AmountGradeEnum, PayoutGradeEnum } from '@/types/game'

/**
 * 开箱金额分级：按该金额在金额池中的累计分位判定，
 * 分位越高说明玩家送走的钱越多，情绪反馈越负面。
 */
export class AmountGrader {
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
