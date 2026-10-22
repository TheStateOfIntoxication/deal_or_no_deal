import { describe, expect, it } from 'vitest'
import { createGameConfig, TOP_PRIZE_CENTS } from '@/config/game'
import { AmountGradeEnum, PayoutGradeEnum } from '@/types/game'
import { AmountGrader } from '../AmountGrader'
import { PoolBuilder } from '../PoolBuilder'

describe('开箱金额分级（展示层）', () => {
  const pool = PoolBuilder.build(createGameConfig(), 2)

  it('小额算好签、顶奖算重击、池中位算不妙', () => {
    expect(AmountGrader.gradeOf(100, pool)).toBe(AmountGradeEnum.good)
    expect(AmountGrader.gradeOf(TOP_PRIZE_CENTS, pool)).toBe(AmountGradeEnum.disaster)

    const middle = [...pool].sort((left, right) => left - right)[13]
    expect(AmountGrader.gradeOf(middle, pool)).toBe(AmountGradeEnum.bad)
  })

  it('池内金额全部相等时视为重击（分位为 1）', () => {
    expect(AmountGrader.gradeOf(100_000, [100_000, 100_000])).toBe(AmountGradeEnum.disaster)
  })

  it('空池不抛错', () => {
    expect(AmountGrader.gradeOf(100, [])).toBe(AmountGradeEnum.neutral)
  })
})

describe('到手奖金分级（展示层）', () => {
  const pool = PoolBuilder.build(createGameConfig(), 2)

  it('顶奖为 jackpot、最小额为 small、高档为 big、中档为 normal', () => {
    expect(AmountGrader.payoutGradeOf(TOP_PRIZE_CENTS, pool, TOP_PRIZE_CENTS)).toBe(
      PayoutGradeEnum.jackpot
    )
    expect(AmountGrader.payoutGradeOf(100, pool, TOP_PRIZE_CENTS)).toBe(PayoutGradeEnum.small)
    expect(AmountGrader.payoutGradeOf(75_000_000, pool, TOP_PRIZE_CENTS)).toBe(
      PayoutGradeEnum.big
    )
    expect(AmountGrader.payoutGradeOf(500_000, pool, TOP_PRIZE_CENTS)).toBe(
      PayoutGradeEnum.normal
    )
  })
})
