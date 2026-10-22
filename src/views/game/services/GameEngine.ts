import { createGameConfig, TOTAL_ROUNDS } from '@/config/game'
import type { GameConfig } from '@/config/game'
import { RAGE_MAX, RAGE_PER_NO_DEAL } from '@/config/presentation'
import { createRandom, shuffle } from '@/utils/random'
import type { RandomSource } from '@/utils/random'
import { EngineErrorEnum, GamePhaseEnum } from '../types'
import type {
  AmountRowState,
  BankerOfferMetaState,
  CaseState,
  EngineResult,
  GameResultState,
  GameSnapshot,
  RoundLogState,
  RoundOpenedState
} from '../types'
import { AmountGrader } from './AmountGrader'
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
}

/**
 * 《一掷千金》规则状态机（纯类，不依赖 Vue / DOM）
 * 规则依据：.pi/docx/需求文档.md v1.1 §3–§9
 */
export class GameEngine {
  private readonly config: GameConfig
  private random: RandomSource
  private configErrors: string[] = []
  private state: InternalState

  constructor(config: GameConfig = createGameConfig()) {
    this.config = config
    this.random = createRandom(config.seed)
    this.state = GameEngine.createIdleState()
  }

  /**
   * 生成开局摇奖的候选 k：配置区间的等概率排列，供玩家抽取（R-4.1.1、R-4.1.7）
   * 每次调用都会重新洗乱；指定 seed 时排列可复现
   */
  createKDraw(): number[] {
    const candidates: number[] = []
    for (let k = this.config.kMin; k <= this.config.kMax; k += 1) candidates.push(k)
    return shuffle(candidates, this.random)
  }

  /** 开局：校验配置 → 确定 k（优先用玩家摇奖结果）→ 构建金额池 → 洗乱并绑定箱子（R-4） */
  start(drawnK?: number): EngineResult {
    this.configErrors = PoolBuilder.validate(this.config)
    if (this.configErrors.length > 0) {
      this.state = GameEngine.createIdleState()
      return { ok: false, error: EngineErrorEnum.configInvalid }
    }

    this.random = createRandom(this.config.seed)
    const k = drawnK ?? PoolBuilder.resolveK(this.config, this.random)
    if (!Number.isInteger(k) || k < this.config.kMin || k > this.config.kMax) {
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
      result: null
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
      grade: AmountGrader.gradeOf(amount, state.pool)
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
    const prize = state.currentOffer
    state.result = {
      prize,
      payoutGrade: AmountGrader.payoutGradeOf(prize, state.pool, this.config.topPrize),
      decidedBy: 'deal',
      swapped: false,
      heldCaseNo: state.playerCaseNo ?? 0,
      heldCaseAmount: playerAmount,
      playerCaseAmount: playerAmount,
      otherCaseAmount: others.length === 1 ? this.amountOf(others[0]) : null
    }
    state.remainingToOpen = 0
    state.phase = GamePhaseEnum.settled
    return { ok: true }
  }

  /** 拒绝报价：进入下一轮；第 9 轮拒绝后进入终局交换，不再出价（R-5.3.5、R-7.1.1） */
  noDeal(): EngineResult {
    const state = this.state
    if (state.phase === GamePhaseEnum.settled) return GameEngine.reject(EngineErrorEnum.gameOver)
    if (state.phase !== GamePhaseEnum.offerPending) return GameEngine.reject(EngineErrorEnum.wrongPhase)

    state.currentOffer = null
    state.offerMeta = null
    state.noDealCount += 1
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
      k: state.k,
      round: state.round,
      totalRounds: TOTAL_ROUNDS,
      remainingToOpen: state.remainingToOpen,
      playerCaseNo: state.playerCaseNo,
      cases,
      amountRows,
      currentOffer: state.currentOffer,
      remainingAmounts: unopenedCases.map((item) => this.amountOf(item)),
      remainingCaseCount: unopenedCases.length,
      topPrize: this.config.topPrize,
      topPrizeRemaining,
      rage: state.rage,
      noDealCount: state.noDealCount,
      bankerConfidence:
        unopenedCases.length === 0 ? 1 : 1 - topPrizeRemaining / unopenedCases.length,
      offerMeta: state.offerMeta ? { ...state.offerMeta } : null,
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

  /** 本轮开箱完成：生成报价并进入决策阶段（R-5.2.6、R-5.3.1） */
  private closeRound(): void {
    const state = this.state
    const offer = OfferCalculator.calculate(
      this.remainingAmounts(),
      state.round,
      this.config,
      () => this.random.next(),
      { topPrize: this.config.topPrize, rage: state.rage }
    )

    state.currentOffer = offer.amount
    state.offerMeta = {
      fear: offer.fear,
      ragePenalty: offer.ragePenalty,
      confidence: 1 - offer.probability
    }
    state.logs.push({
      round: state.round,
      openedAmounts: state.roundOpened.map((entry) => entry.amount),
      offer: offer.amount
    })
    state.phase = GamePhaseEnum.offerPending
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

    state.result = {
      prize: heldCaseAmount,
      payoutGrade: AmountGrader.payoutGradeOf(heldCaseAmount, state.pool, this.config.topPrize),
      decidedBy: 'case',
      swapped: effectiveSwap,
      heldCaseNo,
      heldCaseAmount,
      playerCaseAmount,
      otherCaseAmount
    }
    state.remainingToOpen = 0
    state.phase = GamePhaseEnum.settled
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
    state.result = {
      prize: certainAmount,
      payoutGrade: AmountGrader.payoutGradeOf(certainAmount, state.pool, this.config.topPrize),
      decidedBy: 'certainty',
      swapped: false,
      heldCaseNo: state.playerCaseNo ?? 0,
      heldCaseAmount: certainAmount,
      playerCaseAmount: this.playerCaseAmount(),
      otherCaseAmount: others.length === 1 ? this.amountOf(others[0]) : null
    }
    state.remainingToOpen = 0
    state.phase = GamePhaseEnum.settled
    return true
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
      result: null
    }
  }
}
