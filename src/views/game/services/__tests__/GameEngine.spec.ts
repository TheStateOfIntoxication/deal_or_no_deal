import { describe, expect, it } from 'vitest'
import { createGameConfig, TOP_PRIZE_CENTS, TOTAL_ROUNDS } from '@/config/game'
import type { GameConfig } from '@/config/game'
import { PayoutGradeEnum } from '@/types/game'
import { EngineErrorEnum, GamePhaseEnum } from '../../types'
import { GameEngine } from '../GameEngine'
import { OfferCalculator } from '../OfferCalculator'
import { PoolBuilder } from '../PoolBuilder'

function createEngine(overrides: Partial<GameConfig> = {}): GameEngine {
  return new GameEngine(
    createGameConfig({ randomKEnabled: false, fixedK: 2, seed: 20260101, ...overrides })
  )
}

function startEngine(overrides: Partial<GameConfig> = {}): GameEngine {
  const engine = createEngine(overrides)
  expect(engine.start()).toEqual({ ok: true })
  return engine
}

function pickPlayerCase(engine: GameEngine, caseNo = 1): void {
  expect(engine.selectPlayerCase(caseNo)).toEqual({ ok: true })
}

/** 按本轮配额开满箱子 */
function openCurrentRound(engine: GameEngine): void {
  const snapshot = engine.getSnapshot()
  const targets = snapshot.cases
    .filter((item) => !item.opened && !item.isPlayerCase)
    .slice(0, snapshot.remainingToOpen)
  targets.forEach((target) => expect(engine.openCase(target.no)).toEqual({ ok: true }))
}

/** 一路 No Deal 到第 9 轮报价决定后 */
function playAllRoundsWithNoDeal(engine: GameEngine): void {
  pickPlayerCase(engine)
  for (let round = 1; round <= TOTAL_ROUNDS; round += 1) {
    openCurrentRound(engine)
    expect(engine.getSnapshot().phase).toBe(GamePhaseEnum.offerPending)
    expect(engine.noDeal()).toEqual({ ok: true })
  }
}

describe('开局摇奖（R-4.1.7）', () => {
  it('候选覆盖配置区间且每项恰好出现一次', () => {
    const engine = new GameEngine(createGameConfig({ kMin: 2, kMax: 6 }))
    const candidates = engine.createKDraw()

    expect([...candidates].sort((left, right) => left - right)).toEqual([2, 3, 4, 5, 6])
  })

  it('用玩家摇到的 k 开局', () => {
    const engine = new GameEngine(createGameConfig())

    expect(engine.start(5)).toEqual({ ok: true })
    const snapshot = engine.getSnapshot()
    expect(snapshot.k).toBe(5)
    expect(snapshot.amountRows.filter((row) => row.amount === TOP_PRIZE_CENTS)).toHaveLength(5)
    expect(snapshot.remainingCaseCount).toBe(26)
  })

  it('2–6 每个 k 都生成等量的顶奖箱', () => {
    for (let k = 2; k <= 6; k += 1) {
      const engine = new GameEngine(createGameConfig())
      expect(engine.start(k)).toEqual({ ok: true })

      const snapshot = engine.getSnapshot()
      expect(snapshot.k).toBe(k)
      expect(snapshot.amountRows).toHaveLength(26)
      expect(snapshot.amountRows.filter((row) => row.amount === TOP_PRIZE_CENTS)).toHaveLength(k)
      expect(snapshot.topPrizeRemaining).toBe(k)
      expect(snapshot.remainingCaseCount).toBe(26)
    }
  })

  it('非法摇奖结果被拒绝', () => {
    const engine = new GameEngine(createGameConfig())

    expect(engine.start(99)).toEqual({ ok: false, error: EngineErrorEnum.invalidDraw })
    expect(engine.getSnapshot().phase).toBe(GamePhaseEnum.idle)
  })
})

describe('开局与金额池（R-4）', () => {
  it('场景 B/H：k=13 时 26 项金额池、13 个顶奖、最小项 $750', () => {
    const pool = PoolBuilder.build(createGameConfig(), 13)

    expect(pool).toHaveLength(26)
    expect(pool.filter((amount) => amount === TOP_PRIZE_CENTS)).toHaveLength(13)
    expect(Math.min(...pool)).toBe(75_000)
    expect(pool).not.toContain(1)
  })

  it('场景 H：k=13 开局后金额板出现 13 行顶奖（R-9.6）', () => {
    const engine = startEngine({ fixedK: 13, kMin: 13, kMax: 13 })
    const snapshot = engine.getSnapshot()

    expect(snapshot.k).toBe(13)
    expect(snapshot.amountRows.filter((row) => row.amount === TOP_PRIZE_CENTS)).toHaveLength(13)
    expect(snapshot.amountRows).toHaveLength(26)
  })

  it('固定种子可复现同一局（R-10）', () => {
    const first = startEngine({ seed: 42 })
    const second = startEngine({ seed: 42 })
    const other = startEngine({ seed: 43 })

    expect(first.getSeed()).toBe(42)
    expect(first.getSnapshot().amountRows).toEqual(second.getSnapshot().amountRows)
    expect(first.getSnapshot().amountRows).not.toEqual(other.getSnapshot().amountRows)
  })

  it('配置非法时阻止开局（R-11.7、R-10.1）', () => {
    const brokenSequence = new GameEngine(
      createGameConfig({ openSequence: [6, 5, 4, 3, 2, 1, 1, 1, 0] })
    )
    expect(brokenSequence.start()).toEqual({ ok: false, error: EngineErrorEnum.configInvalid })
    expect(brokenSequence.getConfigErrors()).toContain('openSequence')

    const randomTopPrize = new GameEngine(createGameConfig({ randomTopPrizeEnabled: true }))
    expect(randomTopPrize.start()).toEqual({ ok: false, error: EngineErrorEnum.configInvalid })
    expect(randomTopPrize.getConfigErrors()).toContain('randomTopPrize')
  })
})

describe('回合流程（R-5）', () => {
  it('场景 A：第 1 轮开 6 箱后报价，Deal 立即以报价结算', () => {
    const engine = startEngine()
    pickPlayerCase(engine)
    openCurrentRound(engine)

    const offered = engine.getSnapshot()
    expect(offered.phase).toBe(GamePhaseEnum.offerPending)
    expect(offered.logs).toHaveLength(1)
    expect(offered.cases.filter((item) => !item.opened)).toHaveLength(20)

    const lower = Math.min(...offered.remainingAmounts)
    const upper = Math.max(...offered.remainingAmounts)
    expect(offered.currentOffer).toBeGreaterThanOrEqual(lower)
    expect(offered.currentOffer).toBeLessThanOrEqual(upper)

    expect(engine.deal()).toEqual({ ok: true })
    const settled = engine.getSnapshot()
    expect(settled.phase).toBe(GamePhaseEnum.settled)
    expect(settled.result?.decidedBy).toBe('deal')
    expect(settled.result?.prize).toBe(offered.currentOffer)
    expect(settled.result?.heldCaseNo).toBe(1)
    expect(settled.result?.heldCaseAmount).toBe(settled.result?.playerCaseAmount)
    expect(settled.result?.payoutGrade).toBeTruthy()
    // 结算后全部金额可见（R-9.4）
    expect(settled.cases.every((item) => item.revealedAmount !== null)).toBe(true)
    // 已揭示箱子都带展示分级
    expect(settled.cases.every((item) => item.grade !== null)).toBe(true)
  })

  it('顶奖概率数据与本轮开箱同步（展示层）', () => {
    const engine = startEngine()
    pickPlayerCase(engine)

    const before = engine.getSnapshot()
    expect(before.topPrize).toBe(TOP_PRIZE_CENTS)
    expect(before.topPrizeRemaining).toBe(before.k)
    expect(before.remainingCaseCount).toBe(26)
    expect(before.lastOpened).toBeNull()

    openCurrentRound(engine)
    const after = engine.getSnapshot()
    const openedTopPrizes = after.amountRows.filter(
      (row) => row.eliminated && row.amount === TOP_PRIZE_CENTS
    ).length

    expect(after.topPrizeRemaining).toBe(after.k - openedTopPrizes)
    expect(after.remainingCaseCount).toBe(20)
    expect(after.roundOpened).toHaveLength(6)
    expect(after.lastOpened?.caseNo).toBe(after.roundOpened[5]?.caseNo)
    expect(after.lastOpened?.grade).toBeTruthy()
  })

  it('第 9 轮报价即最终报价，终局不再出价且只剩 2 箱（R-5.3.5、R-7.1）', () => {
    const engine = startEngine()
    playAllRoundsWithNoDeal(engine)

    const snapshot = engine.getSnapshot()
    expect(snapshot.logs).toHaveLength(TOTAL_ROUNDS)
    expect(snapshot.cases.filter((item) => !item.opened)).toHaveLength(2)
    expect(snapshot.phase).toBe(GamePhaseEnum.swapPending)
    expect(snapshot.currentOffer).toBeNull()
    expect(snapshot.round).toBe(TOTAL_ROUNDS)
  })

  it('场景 E：重复开箱、打开玩家箱均被拒绝且状态不变（R-11.3）', () => {
    const engine = startEngine()
    pickPlayerCase(engine)

    const target = engine.getSnapshot().cases.find((item) => !item.isPlayerCase)
    expect(target).toBeDefined()
    expect(engine.openCase(target?.no ?? 0)).toEqual({ ok: true })

    const before = engine.getSnapshot()
    expect(engine.openCase(target?.no ?? 0)).toEqual({
      ok: false,
      error: EngineErrorEnum.caseAlreadyOpened
    })
    expect(engine.openCase(before.playerCaseNo ?? 0)).toEqual({
      ok: false,
      error: EngineErrorEnum.playerCaseForbidden
    })
    expect(engine.getSnapshot()).toEqual(before)
  })

  it('结算后拒绝一切开箱与决策（R-11.6）', () => {
    const engine = startEngine()
    pickPlayerCase(engine)
    openCurrentRound(engine)
    expect(engine.deal()).toEqual({ ok: true })

    expect(engine.openCase(2)).toEqual({ ok: false, error: EngineErrorEnum.gameOver })
    expect(engine.deal()).toEqual({ ok: false, error: EngineErrorEnum.gameOver })
    expect(engine.noDeal()).toEqual({ ok: false, error: EngineErrorEnum.gameOver })
    expect(engine.swap(true)).toEqual({ ok: false, error: EngineErrorEnum.gameOver })
  })
})

describe('终局（R-7）', () => {
  it('场景 C：交换后奖金为原非玩家箱金额', () => {
    const engine = startEngine()
    playAllRoundsWithNoDeal(engine)

    const otherNo = engine
      .getSnapshot()
      .cases.find((item) => !item.opened && !item.isPlayerCase)?.no
    expect(engine.swap(true)).toEqual({ ok: true })
    const result = engine.getSnapshot().result
    expect(result?.swapped).toBe(true)
    expect(result?.prize).toBe(result?.otherCaseAmount)
    expect(result?.heldCaseNo).toBe(otherNo)
    expect(result?.heldCaseAmount).toBe(result?.otherCaseAmount)
    expect(result?.payoutGrade).toBeTruthy()
  })

  it('场景 D：不交换时奖金为原玩家箱金额', () => {
    const engine = startEngine()
    playAllRoundsWithNoDeal(engine)

    const playerNo = engine.getSnapshot().playerCaseNo
    expect(engine.swap(false)).toEqual({ ok: true })
    const result = engine.getSnapshot().result
    expect(result?.decidedBy).toBe('case')
    expect(result?.swapped).toBe(false)
    expect(result?.prize).toBe(result?.playerCaseAmount)
    expect(result?.heldCaseNo).toBe(playerNo)
    expect(result?.payoutGrade).toBeTruthy()
  })
})

describe('报价规则（R-6）', () => {
  it('场景 F：剩余 $5/$10 时报价始终落在区间内且为整数分', () => {
    for (let round = 1; round <= TOTAL_ROUNDS; round += 1) {
      const offer = OfferCalculator.calculate([500, 1000], round, createGameConfig(), () => 0.5)
      expect(offer.amount).toBeGreaterThanOrEqual(500)
      expect(offer.amount).toBeLessThanOrEqual(1000)
      expect(offer.amount).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(offer.amount)).toBe(true)
    }
  })

  it('曲线极端时仍落在 [最小值, 均值] 内（R-6.3.6）', () => {
    const tinyCurve = createGameConfig({ offerMultipliers: Array<number>(9).fill(0.001) })
    const hugeCurve = createGameConfig({ offerMultipliers: Array<number>(9).fill(5) })

    expect(OfferCalculator.calculate([100, 200], 1, tinyCurve).amount).toBe(100)
    expect(OfferCalculator.calculate([100, 200], 9, hugeCurve).amount).toBe(150)
  })

  it('乘数曲线随轮次单调不减（R-6.2.1）', () => {
    const config = createGameConfig()
    const multipliers = Array.from({ length: TOTAL_ROUNDS }, (_, index) =>
      OfferCalculator.multiplier(config, index + 1)
    )

    multipliers.forEach((value, index) => {
      if (index > 0) expect(value).toBeGreaterThanOrEqual(multipliers[index - 1])
    })
  })

  it('场景 G：剩余金额全部相等时立即结算，不再报价（R-5.2.7）', () => {
    const equalConfig: Partial<GameConfig> = {
      baseAmounts: Array.from({ length: 25 }, () => 100_000),
      topPrize: 100_000
    }

    const engine = startEngine(equalConfig)
    expect(engine.selectPlayerCase(1)).toEqual({ ok: true })

    const snapshot = engine.getSnapshot()
    expect(snapshot.phase).toBe(GamePhaseEnum.settled)
    expect(snapshot.result?.decidedBy).toBe('certainty')
    expect(snapshot.result?.prize).toBe(100_000)
    expect(snapshot.result?.payoutGrade).toBe(PayoutGradeEnum.jackpot)
    expect(snapshot.currentOffer).toBeNull()
    expect(snapshot.remainingToOpen).toBe(0)
    expect(engine.deal()).toEqual({ ok: false, error: EngineErrorEnum.gameOver })
  })

  it('开掉最后一个非顶奖后提前锁定顶奖（R-5.2.7）', () => {
    const baseAmounts = [100_000, 200_000, ...Array<number>(23).fill(TOP_PRIZE_CENTS)]
    let locked = false

    for (let playerCase = 1; playerCase <= 26 && !locked; playerCase += 1) {
      const engine = startEngine({ baseAmounts, seed: 777 })
      expect(engine.selectPlayerCase(playerCase)).toEqual({ ok: true })

      let snapshot = engine.getSnapshot()
      while (snapshot.phase === GamePhaseEnum.opening || snapshot.phase === GamePhaseEnum.offerPending) {
        if (snapshot.phase === GamePhaseEnum.offerPending) {
          expect(engine.noDeal()).toEqual({ ok: true })
          snapshot = engine.getSnapshot()
          continue
        }
        const target = snapshot.cases.find((item) => !item.opened && !item.isPlayerCase)
        expect(target).toBeDefined()
        expect(engine.openCase(target?.no ?? 0)).toEqual({ ok: true })
        snapshot = engine.getSnapshot()
      }

      if (snapshot.result?.decidedBy === 'certainty') {
        locked = true
        expect(snapshot.result.prize).toBe(TOP_PRIZE_CENTS)
        expect(snapshot.result.payoutGrade).toBe(PayoutGradeEnum.jackpot)
        expect(snapshot.remainingToOpen).toBe(0)
      }
    }

    expect(locked).toBe(true)
  })

  it('剩余金额整体偏高时报价贴近均值，而不是只给四成（R-6.1.5）', () => {
    const config = createGameConfig()
    const board = [TOP_PRIZE_CENTS, TOP_PRIZE_CENTS, TOP_PRIZE_CENTS, 75_000_000]

    const mean = OfferCalculator.arithmeticMean(board)
    const offer = OfferCalculator.calculate(board, 6, config).amount

    expect(offer).toBeGreaterThan(mean * 0.6)
    expect(offer).toBeGreaterThan(75_000_000)
    expect(offer).toBeLessThanOrEqual(TOP_PRIZE_CENTS)
  })

  it('下行风险很大时仍保留银行家折价（R-6.1.3）', () => {
    const config = createGameConfig()
    const board = [100, TOP_PRIZE_CENTS]

    const mean = OfferCalculator.arithmeticMean(board)
    expect(OfferCalculator.calculate(board, 1, config).amount).toBeLessThan(mean * 0.2)
  })

  it('同一剩余金额下报价随轮次单调不减（R-6.2.1）', () => {
    const config = createGameConfig()
    const board = [TOP_PRIZE_CENTS, TOP_PRIZE_CENTS, 100_000]
    const offers = Array.from({ length: TOTAL_ROUNDS }, (_, index) =>
      OfferCalculator.calculate(board, index + 1, config).amount
    )

    offers.forEach((value, index) => {
      if (index > 0) expect(value).toBeGreaterThanOrEqual(offers[index - 1])
    })
  })
})

describe('银行家（R-6.4）', () => {
  it('每次 No Deal 怒气 +15、上限 100，新局归零', () => {
    const engine = startEngine()
    playAllRoundsWithNoDeal(engine)

    const snapshot = engine.getSnapshot()
    expect(snapshot.noDealCount).toBe(TOTAL_ROUNDS)
    expect(snapshot.rage).toBe(100)

    expect(engine.start(2)).toEqual({ ok: true })
    expect(engine.getSnapshot().rage).toBe(0)
    expect(engine.getSnapshot().noDealCount).toBe(0)
  })

  it('开局首轮无怒气，报价元信息与信心一致', () => {
    const engine = startEngine()
    pickPlayerCase(engine)
    expect(engine.getSnapshot().rage).toBe(0)

    openCurrentRound(engine)
    const snapshot = engine.getSnapshot()
    expect(snapshot.offerMeta).not.toBeNull()
    expect(snapshot.offerMeta?.confidence).toBeCloseTo(snapshot.bankerConfidence, 6)
    expect(snapshot.offerMeta?.ragePenalty).toBe(0)
  })

  it('恐惧加价：顶奖概率越高，同局面报价越高', () => {
    const config = createGameConfig()
    const board = [TOP_PRIZE_CENTS, 1_000, 2_000, 3_000]

    const plain = OfferCalculator.calculate(board, 6, config).amount
    const withFear = OfferCalculator.calculate(board, 6, config, undefined, {
      topPrize: TOP_PRIZE_CENTS,
      rage: 0
    }).amount

    expect(withFear).toBeGreaterThan(plain)
  })

  it('怒气压价：满怒报价低于零怒气，且不突破下界', () => {
    const config = createGameConfig()
    const board = [TOP_PRIZE_CENTS, 1_000]
    const calm = OfferCalculator.calculate(board, 9, config, undefined, {
      topPrize: TOP_PRIZE_CENTS,
      rage: 0
    }).amount
    const furious = OfferCalculator.calculate(board, 9, config, undefined, {
      topPrize: TOP_PRIZE_CENTS,
      rage: 100
    }).amount

    expect(furious).toBeLessThan(calm)
    expect(furious).toBeGreaterThanOrEqual(1_000)
  })

  it('银行家修正后报价仍不越界、不高于均值', () => {
    const config = createGameConfig()
    const board = [TOP_PRIZE_CENTS, TOP_PRIZE_CENTS, 1_000]
    const mean = OfferCalculator.arithmeticMean(board)

    for (const rage of [0, 50, 100]) {
      const offer = OfferCalculator.calculate(board, 9, config, undefined, {
        topPrize: TOP_PRIZE_CENTS,
        rage
      })
      expect(offer.amount).toBeGreaterThanOrEqual(1_000)
      expect(offer.amount).toBeLessThanOrEqual(TOP_PRIZE_CENTS)
      expect(offer.amount).toBeLessThanOrEqual(mean)
    }
  })
})

describe('阶段守卫（R-11.5）', () => {
  it('未选箱不能开箱，已选箱不能重复选，非终局不能交换', () => {
    const engine = startEngine()

    expect(engine.openCase(2)).toEqual({ ok: false, error: EngineErrorEnum.wrongPhase })
    expect(engine.swap(true)).toEqual({ ok: false, error: EngineErrorEnum.wrongPhase })
    expect(engine.deal()).toEqual({ ok: false, error: EngineErrorEnum.wrongPhase })
    expect(engine.noDeal()).toEqual({ ok: false, error: EngineErrorEnum.wrongPhase })

    pickPlayerCase(engine)
    expect(engine.selectPlayerCase(3)).toEqual({ ok: false, error: EngineErrorEnum.wrongPhase })
    expect(engine.openCase(0)).toEqual({ ok: false, error: EngineErrorEnum.unknownCase })
  })
})
