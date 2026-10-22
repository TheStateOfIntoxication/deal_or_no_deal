import { createGameConfig, TOTAL_ROUNDS } from '@/config/game'
import type { GameConfig } from '@/config/game'
import {
  CONFORMIST_AUDIENCE_CAP,
  GAMBLER_CONSOLATION_RATE,
  GAMBLER_TOP_MULTIPLIER,
  PRAGMATIC_GREED_THRESHOLD,
  PRAGMATIC_MAX_PENALTIES,
  PRAGMATIC_PENALTY
} from '@/config/personas'
import { RAGE_MAX, RAGE_PER_NO_DEAL } from '@/config/presentation'
import { createRandom, deriveSeed, shuffle } from '@/utils/random'
import type { RandomSource } from '@/utils/random'
import { BankerPlanEnum, GameModeEnum, PlayerPersonaEnum } from '@/types/game'
import { EngineErrorEnum, GamePhaseEnum } from '../types'
import type {
  AmountRowState,
  BankerOfferMetaState,
  BankerPlanState,
  CaseState,
  EngineResult,
  GameResultState,
  GameSnapshot,
  RoundLogState,
  RoundOpenedState
} from '../types'
import { AmountGrader } from './AmountGrader'
import { chooseBankerPlan } from './BankerBrain'
import type { BankerPlanContext } from './BankerBrain'
import { OfferCalculator } from './OfferCalculator'
import { PoolBuilder } from './PoolBuilder'

interface InternalCase {
  no: number
  poolIndex: number
  opened: boolean
}

interface InternalState {
  phase: GamePhaseEnum
  k: number
  round: number
  remainingToOpen: number
  cases: InternalCase[]
  pool: number[]
  playerCaseNo: number | null
  currentOffer: number | null
  rage: number
  noDealCount: number
  offerMeta: BankerOfferMetaState | null
  roundOpened: RoundOpenedState[]
  lastOpened: RoundOpenedState | null
  logs: RoundLogState[]
  result: GameResultState | null
  personaId: PlayerPersonaEnum
  lastRejected: boolean
  rejectStreak: number
  pendingGreedPenalty: boolean
  greedPenaltiesUsed: number
  audienceDelta: number
  planHistory: BankerPlanEnum[]
}

/**
 * 《一掷千金》规则状态机（纯类，不依赖 Vue / DOM）
 * 规则依据：.pi/docx/需求文档.md v1.1 §3–§9
 */
export class GameEngine {
  private readonly config: GameConfig
  private readonly modeId: GameModeEnum
  private random: RandomSource
  private bankerRandom: RandomSource
  private configErrors: string[] = []
  private state: InternalState

  constructor(config: GameConfig = createGameConfig(), modeId: GameModeEnum = GameModeEnum.classic) {
    this.config = config
    this.modeId = modeId
    this.random = createRandom(config.seed)
    this.bankerRandom = createRandom(deriveSeed(this.random.seed, 'banker'))
    this.state = GameEngine.createIdleState()
  }

  /**
   * 生成开局摇奖的候选 k：配置区间的等概率排列，供玩家抽取（R-4.1.1、R-4.1.7）
   * 每次调用都会重新洗乱；指定 seed 时排列可复现
   */
  createKDraw(): number[] {
    if (!this.config.randomKEnabled) return []
    const candidates: number[] = []
    for (let k = this.config.kMin; k <= this.config.kMax; k += 1) candidates.push(k)
    return shuffle(candidates, this.random)
  }

  /** 开局：校验配置 → 确定顶奖数量 → 构建金额池 → 洗乱并绑定箱子（R-4） */
  start(
    topCount?: number,
    personaId: PlayerPersonaEnum = PlayerPersonaEnum.pragmatic
  ): EngineResult {
    this.configErrors = PoolBuilder.validate(this.config)
    if (this.configErrors.length > 0) {
      this.state = GameEngine.createIdleState()
      return { ok: false, error: EngineErrorEnum.configInvalid }
    }

    this.random = createRandom(this.config.seed)
    this.bankerRandom = createRandom(deriveSeed(this.random.seed, 'banker'))
    const k = this.config.randomKEnabled
      ? (topCount ?? PoolBuilder.resolveK(this.config, this.random))
      : this.config.fixedK
    const minCount = this.config.randomKEnabled ? this.config.kMin : 1
    const maxCount = this.config.randomKEnabled
      ? this.config.kMax
      : this.config.totalCases - 1
    if (!Number.isInteger(k) || k < minCount || k > maxCount) {
      this.state = GameEngine.createIdleState()
      return { ok: false, error: EngineErrorEnum.invalidDraw }
    }

    const pool = shuffle(PoolBuilder.build(this.config, k), this.random)
    // 内部不变式：奖池总数与顶奖数必须与抽到的 k 一致（防展示层不一致）
    // 若基础金额表本身含与顶奖相等的金额（异常配置），只能校验总数
    const topPrizeCount = pool.filter((amount) => amount === this.config.topPrize).length
    const baseBelowTop = this.config.baseAmounts.every(
      (amount) => amount < this.config.topPrize
    )
    if (
      pool.length !== this.config.totalCases ||
      (baseBelowTop && topPrizeCount !== k)
    ) {
      this.state = GameEngine.createIdleState()
      this.configErrors = ['pool']
      return { ok: false, error: EngineErrorEnum.configInvalid }
    }

    this.state = {
      phase: GamePhaseEnum.waitingPlayerCase,
      k,
      round: 1,
      remainingToOpen: this.config.openSequence[0],
      cases: pool.map((_, index) => ({ no: index + 1, poolIndex: index, opened: false })),
      pool,
      playerCaseNo: null,
      currentOffer: null,
      rage: 0,
      noDealCount: 0,
      offerMeta: null,
      roundOpened: [],
      lastOpened: null,
      logs: [],
      result: null,
      personaId,
      lastRejected: false,
      rejectStreak: 0,
      pendingGreedPenalty: false,
      greedPenaltiesUsed: 0,
      audienceDelta: 0,
      planHistory: []
    }
    return { ok: true }
  }

  /** 玩家选箱，进入第 1 轮（R-4.4） */
  selectPlayerCase(caseNo: number): EngineResult {
    const state = this.state
    if (state.phase !== GamePhaseEnum.waitingPlayerCase) return GameEngine.reject(EngineErrorEnum.wrongPhase)
    if (!state.cases.some((item) => item.no === caseNo)) return GameEngine.reject(EngineErrorEnum.unknownCase)

    state.playerCaseNo = caseNo
    state.round = 1
    state.remainingToOpen = this.config.openSequence[0]
    state.phase = GamePhaseEnum.opening
    this.settleIfCertain()
    return { ok: true }
  }

  /** 打开一个非玩家箱；本轮配额用尽后立即生成本轮报价（R-5.2、R-5.3.1） */
  openCase(caseNo: number): EngineResult {
    const state = this.state
    if (state.phase === GamePhaseEnum.settled) return GameEngine.reject(EngineErrorEnum.gameOver)
    if (state.phase !== GamePhaseEnum.opening) return GameEngine.reject(EngineErrorEnum.wrongPhase)

    const target = state.cases.find((item) => item.no === caseNo)
    if (!target) return GameEngine.reject(EngineErrorEnum.unknownCase)
    if (target.opened) return GameEngine.reject(EngineErrorEnum.caseAlreadyOpened)
    if (target.no === state.playerCaseNo) return GameEngine.reject(EngineErrorEnum.playerCaseForbidden)
    if (state.remainingToOpen <= 0) return GameEngine.reject(EngineErrorEnum.openQuotaReached)

    target.opened = true
    state.remainingToOpen -= 1
    const amount = this.amountOf(target)
    const entry: RoundOpenedState = {
      caseNo: target.no,
      amount,
      grade: AmountGrader.gradeOf(amount, state.pool),
      poolIndex: target.poolIndex
    }
    state.roundOpened.push(entry)
    state.lastOpened = entry
    if (this.settleIfCertain()) return { ok: true }
    if (state.remainingToOpen === 0) this.closeRound()
    return { ok: true }
  }

  /** 接受报价：立即结束，奖金为报价金额（R-5.3.4） */
  deal(): EngineResult {
    const state = this.state
    if (state.phase === GamePhaseEnum.settled) return GameEngine.reject(EngineErrorEnum.gameOver)
    if (state.phase !== GamePhaseEnum.offerPending || state.currentOffer === null) {
      return GameEngine.reject(EngineErrorEnum.wrongPhase)
    }
    const others = this.unopenedOtherCases()
    const playerAmount = this.playerCaseAmount()
    this.finishWithPrize(
      state.currentOffer,
      'deal',
      false,
      state.playerCaseNo ?? 0,
      playerAmount,
      playerAmount,
      others.length === 1 ? this.amountOf(others[0]) : null
    )
    return { ok: true }
  }

  /** 拒绝报价：进入下一轮；第 9 轮拒绝后进入终局交换，不再出价（R-5.3.5、R-7.1.1） */
  noDeal(): EngineResult {
    const state = this.state
    if (state.phase === GamePhaseEnum.settled) return GameEngine.reject(EngineErrorEnum.gameOver)
    if (state.phase !== GamePhaseEnum.offerPending) return GameEngine.reject(EngineErrorEnum.wrongPhase)
    // 稳重的“贪心惩罚”：拒绝明显高于期望的报价，下一轮会被压价
    const ev = OfferCalculator.arithmeticMean(this.remainingAmounts())
    if (
      state.personaId === PlayerPersonaEnum.pragmatic &&
      state.currentOffer !== null &&
      ev > 0 &&
      state.currentOffer / ev >= PRAGMATIC_GREED_THRESHOLD &&
      state.greedPenaltiesUsed < PRAGMATIC_MAX_PENALTIES
    ) {
      state.pendingGreedPenalty = true
    }

    state.currentOffer = null
    state.offerMeta = null
    state.noDealCount += 1
    state.lastRejected = true
    state.rejectStreak += 1
    state.rage = Math.min(RAGE_MAX, state.rage + RAGE_PER_NO_DEAL)
    if (state.round < TOTAL_ROUNDS) {
      state.round += 1
      state.remainingToOpen = this.config.openSequence[state.round - 1]
      state.roundOpened = []
      state.phase = GamePhaseEnum.opening
      return { ok: true }
    }

    if (this.config.swapEnabled && this.unopenedOtherCases().length === 1) {
      state.phase = GamePhaseEnum.swapPending
    } else {
      this.settleByCase(false)
    }
    return { ok: true }
  }

  /** 终局交换决策（R-7.3） */
  swap(shouldSwap: boolean): EngineResult {
    const state = this.state
    if (state.phase === GamePhaseEnum.settled) return GameEngine.reject(EngineErrorEnum.gameOver)
    if (state.phase !== GamePhaseEnum.swapPending) return GameEngine.reject(EngineErrorEnum.wrongPhase)

    this.settleByCase(shouldSwap)
    return { ok: true }
  }

  /** 供界面渲染的只读快照 */
  getSnapshot(): GameSnapshot {
    const state = this.state
    const settled = state.phase === GamePhaseEnum.settled
    const openedIndexes = new Set(
      state.cases.filter((item) => item.opened).map((item) => item.poolIndex)
    )

    const cases: CaseState[] = state.cases.map((item) => {
      const revealed = item.opened || settled
      const amount = this.amountOf(item)
      return {
        no: item.no,
        isPlayerCase: item.no === state.playerCaseNo,
        opened: item.opened,
        revealedAmount: revealed ? amount : null,
        grade: revealed ? AmountGrader.gradeOf(amount, state.pool) : null
      }
    })

    const unopenedCases = state.cases.filter((item) => !item.opened)
    const topPrizeRemaining = unopenedCases.filter(
      (item) => this.amountOf(item) === this.config.topPrize
    ).length

    const amountRows: AmountRowState[] = state.pool.map((amount, id) => ({
      id,
      amount,
      eliminated: openedIndexes.has(id)
    }))

    return {
      phase: state.phase,
      modeId: this.modeId,
      personaId: state.personaId,
      k: state.k,
      topPrizeCount: state.k,
      round: state.round,
      totalRounds: TOTAL_ROUNDS,
      remainingToOpen: state.remainingToOpen,
      playerCaseNo: state.playerCaseNo,
      cases,
      amountRows,
      currentOffer: state.currentOffer,
      noDealLocked:
        state.phase === GamePhaseEnum.offerPending &&
        state.personaId === PlayerPersonaEnum.gambler,
      remainingAmounts: unopenedCases.map((item) => this.amountOf(item)),
      remainingCaseCount: unopenedCases.length,
      topPrize: this.config.topPrize,
      topPrizeRemaining,
      rage: state.rage,
      noDealCount: state.noDealCount,
      bankerConfidence:
        unopenedCases.length === 0 ? 1 : 1 - topPrizeRemaining / unopenedCases.length,
      offerMeta: state.offerMeta
        ? {
            ...state.offerMeta,
            breakdown: { ...state.offerMeta.breakdown },
            plan: state.offerMeta.plan ? { ...state.offerMeta.plan } : null
          }
        : null,
      roundOpened: state.roundOpened.map((entry) => ({ ...entry })),
      lastOpened: state.lastOpened ? { ...state.lastOpened } : null,
      logs: state.logs.map((log) => ({ ...log, openedAmounts: [...log.openedAmounts] })),
      result: state.result ? { ...state.result } : null
    }
  }

  /** 配置错误码，供界面提示（空数组表示配置合法） */
  getConfigErrors(): string[] {
    return [...this.configErrors]
  }

  /** 本局实际使用的随机种子，便于复现（R-10） */
  getSeed(): number {
    return this.random.seed
  }

  /** 本轮开箱完成：银行家选计划 → 计算报价并进入决策阶段（R-5.2.6、R-5.3.1） */
  private closeRound(): void {
    const state = this.state
    const remaining = this.remainingAmounts()
    const ev = OfferCalculator.arithmeticMean(remaining)
    const topProb = remaining.filter((amount) => amount === this.config.topPrize).length / remaining.length
    const baseOffer = OfferCalculator.calculate(remaining, state.round, this.config)
    const planContext: BankerPlanContext = {
      round: state.round,
      topProb,
      rage: state.rage,
      lastRejected: state.lastRejected,
      rejectStreak: state.rejectStreak,
      offerRatio: ev > 0 ? baseOffer.amount / ev : 1,
      planHistory: state.planHistory
    }
    const plan = chooseBankerPlan(planContext, this.bankerRandom)

    let personaDelta = 0
    if (state.personaId === PlayerPersonaEnum.pragmatic && state.pendingGreedPenalty) {
      personaDelta = -PRAGMATIC_PENALTY
    }
    const audienceDelta = state.personaId === PlayerPersonaEnum.conformist ? state.audienceDelta : 0

    const offer = OfferCalculator.calculate(
      remaining,
      state.round,
      this.config,
      () => this.random.next(),
      {
        topPrize: this.config.topPrize,
        rage: state.rage,
        plan: plan.delta,
        persona: personaDelta,
        audience: audienceDelta
      }
    )

    const planState: BankerPlanState = { id: plan.id, delta: plan.delta }
    state.currentOffer = offer.amount
    state.offerMeta = {
      fear: offer.fear,
      ragePenalty: offer.ragePenalty,
      confidence: 1 - offer.probability,
      breakdown: offer.breakdown,
      plan: planState
    }
    state.planHistory = [...state.planHistory, plan.id].slice(-3)
    if (state.pendingGreedPenalty) {
      state.greedPenaltiesUsed += 1
      state.pendingGreedPenalty = false
    }
    state.logs.push({
      round: state.round,
      openedAmounts: state.roundOpened.map((entry) => entry.amount),
      offer: offer.amount
    })
    state.phase = GamePhaseEnum.offerPending
  }

  /** 结算唯一入口：赌徒加成统一在这里应用，覆盖 Deal / 开箱 / 提前结算 */
  private finishWithPrize(
    basePrize: number,
    decidedBy: 'deal' | 'case' | 'certainty',
    swapped: boolean,
    heldCaseNo: number,
    heldCaseAmount: number,
    playerCaseAmount: number,
    otherCaseAmount: number | null
  ): void {
    const state = this.state
    const isGamblerFinal =
      state.personaId === PlayerPersonaEnum.gambler && decidedBy !== 'deal'
    const prize = isGamblerFinal
      ? basePrize === this.config.topPrize
        ? Math.floor(basePrize * GAMBLER_TOP_MULTIPLIER)
        : Math.floor(basePrize * GAMBLER_CONSOLATION_RATE)
      : basePrize
    const personaBonus = prize - basePrize
    state.result = {
      basePrize,
      personaBonus,
      prize,
      payoutGrade: AmountGrader.payoutGradeOf(prize, state.pool, this.config.topPrize),
      decidedBy,
      swapped,
      heldCaseNo,
      heldCaseAmount,
      playerCaseAmount,
      otherCaseAmount
    }
    state.remainingToOpen = 0
    state.phase = GamePhaseEnum.settled
  }

  /** 终局打开持有箱子结算（R-7.3.4–R-7.3.6） */
  private settleByCase(swapped: boolean): void {
    const state = this.state
    const playerCaseAmount = this.playerCaseAmount()
    const others = this.unopenedOtherCases()
    const otherCaseAmount = others.length === 1 ? this.amountOf(others[0]) : null
    const effectiveSwap = swapped && otherCaseAmount !== null
    const heldCaseAmount = effectiveSwap ? (otherCaseAmount as number) : playerCaseAmount
    const heldCaseNo = effectiveSwap ? (others[0]?.no ?? 0) : (state.playerCaseNo ?? 0)

    this.finishWithPrize(
      heldCaseAmount,
      'case',
      effectiveSwap,
      heldCaseNo,
      heldCaseAmount,
      playerCaseAmount,
      otherCaseAmount
    )
  }

  /**
   * 剩余金额全部相等 → 玩家箱金额已唯一确定，立即结算（R-5.2.7）
   * 典型场景：所有低于顶奖的箱子都已开出，玩家箱必定是顶奖
   */
  private settleIfCertain(): boolean {
    const amounts = this.remainingAmounts()
    if (amounts.length === 0) return false

    const certainAmount = amounts[0]
    if (!amounts.every((amount) => amount === certainAmount)) return false

    const state = this.state
    const others = this.unopenedOtherCases()
    this.finishWithPrize(
      certainAmount,
      'certainty',
      false,
      state.playerCaseNo ?? 0,
      certainAmount,
      this.playerCaseAmount(),
      others.length === 1 ? this.amountOf(others[0]) : null
    )
    return true
  }

  /** 从众角色：把观众平均情绪换算成报价修正 */
  setAudienceDelta(delta: number): void {
    const clamped = Math.min(CONFORMIST_AUDIENCE_CAP, Math.max(-CONFORMIST_AUDIENCE_CAP, delta))
    this.state.audienceDelta = this.state.personaId === PlayerPersonaEnum.conformist ? clamped : 0
  }

  private amountOf(item: InternalCase): number {
    return this.state.pool[item.poolIndex]
  }

  private playerCaseAmount(): number {
    const playerCase = this.state.cases.find((item) => item.no === this.state.playerCaseNo)
    return playerCase ? this.amountOf(playerCase) : 0
  }

  private unopenedOtherCases(): InternalCase[] {
    return this.state.cases.filter(
      (item) => !item.opened && item.no !== this.state.playerCaseNo
    )
  }

  private remainingAmounts(): number[] {
    return this.state.cases.filter((item) => !item.opened).map((item) => this.amountOf(item))
  }

  private static reject(error: EngineErrorEnum): EngineResult {
    return { ok: false, error }
  }

  private static createIdleState(): InternalState {
    return {
      phase: GamePhaseEnum.idle,
      k: 0,
      round: 1,
      remainingToOpen: 0,
      cases: [],
      pool: [],
      playerCaseNo: null,
      currentOffer: null,
      rage: 0,
      noDealCount: 0,
      offerMeta: null,
      roundOpened: [],
      lastOpened: null,
      logs: [],
      result: null,
      personaId: PlayerPersonaEnum.pragmatic,
      lastRejected: false,
      rejectStreak: 0,
      pendingGreedPenalty: false,
      greedPenaltiesUsed: 0,
      audienceDelta: 0,
      planHistory: []
    }
  }
}
