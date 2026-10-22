import { createGameConfig, K_ABSOLUTE_MAX, K_ABSOLUTE_MIN, TOTAL_ROUNDS } from '@/config/game'
import type { GameConfig } from '@/config/game'
import { BankerProfileEnum, getBankerProfile } from '@/config/bankers'
import type { BankerProfile } from '@/config/bankers'
import { RAGE_MAX, RAGE_PER_NO_DEAL } from '@/config/presentation'
import type { MessageKey } from '@/language'
import { createRandom, deriveSeed, shuffle } from '@/utils/random'
import type { RandomSource } from '@/utils/random'
import { BankerPlanEnum, GameModeEnum, PersonaActionEnum, PlayerPersonaEnum } from '@/types/game'
import { EngineErrorEnum, GamePhaseEnum } from '../types'
import type {
  AmountRowState,
  BankerOfferMetaState,
  BankerPlanState,
  BankerSideBetState,
  BankerState,
  CaseState,
  EngineActionResult,
  EngineResult,
  GameResultState,
  GameSnapshot,
  PassiveNoticeState,
  PersonaActionState,
  PersonaState,
  RoundLogState,
  RoundOpenedState
} from '../types'
import { AmountGrader } from './AmountGrader'
import { chooseBankerPlan } from './BankerBrain'
import type { BankerPlanContext } from './BankerBrain'
import { createBankerRuntimeState, getBankerStrategy } from './bankers'
import type { BankerQuirkContext, BankerRuntimeState, BankerStrategy } from './bankers/types'
import { getPersonaStrategy } from './personas'
import type {
  PersonaActionContext,
  PersonaCaseContext,
  PersonaPrizeContext,
  PersonaRuntimeState,
  PersonaStrategy
} from './personas/types'
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
  personaState: PersonaRuntimeState
  bankerState: BankerRuntimeState
  personaActionLabelKey: MessageKey | null
  lastRejected: boolean
  rejectStreak: number
  audienceDelta: number
  planHistory: BankerPlanEnum[]
  passiveNotice: PassiveNoticeState | null
  highestOffer: number
}

/**
 * 《一掷千金》规则状态机。角色/银行家行为通过策略注册表注入，
 * 引擎只负责状态迁移、边界钳制和事件顺序。
 */
export class GameEngine {
  private readonly config: GameConfig
  private readonly modeId: GameModeEnum
  private readonly bankerProfile: BankerProfile
  private readonly bankerStrategy: BankerStrategy
  private personaStrategy: PersonaStrategy
  private random: RandomSource
  private bankerRandom: RandomSource
  private configErrors: string[] = []
  private state: InternalState

  constructor(
    config: GameConfig = createGameConfig(),
    modeId: GameModeEnum = GameModeEnum.classic,
    bankerProfileId: BankerProfileEnum = BankerProfileEnum.default
  ) {
    this.config = config
    this.modeId = modeId
    this.bankerProfile = getBankerProfile(bankerProfileId)
    this.bankerStrategy = getBankerStrategy(bankerProfileId)
    this.personaStrategy = getPersonaStrategy(PlayerPersonaEnum.pragmatic)
    this.random = createRandom(config.seed)
    this.bankerRandom = createRandom(deriveSeed(this.random.seed, 'banker'))
    this.state = GameEngine.createIdleState(this.personaStrategy)
  }

  /** 生成开局摇奖的候选 k；每局顺序由引擎随机源决定 */
  createKDraw(): number[] {
    if (!this.config.randomKEnabled) return []
    const candidates: number[] = []
    for (let k = this.config.kMin; k <= this.config.kMax; k += 1) candidates.push(k)
    return shuffle(candidates, this.random)
  }

  /** 开局：校验配置 → 确定顶奖数量 → 构建并洗牌 → 进入选箱 */
  start(
    topCount?: number,
    personaId: PlayerPersonaEnum = PlayerPersonaEnum.pragmatic
  ): EngineResult {
    this.configErrors = PoolBuilder.validate(this.config)
    if (this.configErrors.length > 0) {
      this.state = GameEngine.createIdleState(this.personaStrategy)
      return { ok: false, error: EngineErrorEnum.configInvalid }
    }

    this.personaStrategy = getPersonaStrategy(personaId)
    this.random = createRandom(this.config.seed)
    this.bankerRandom = createRandom(deriveSeed(this.random.seed, 'banker'))
    const forcedK = this.personaStrategy.getForcedStartK?.(this.modeId) ?? null
    const k = forcedK ?? (this.config.randomKEnabled
      ? (topCount ?? PoolBuilder.resolveK(this.config, this.random))
      : this.config.fixedK)
    const minCount = forcedK !== null
      ? K_ABSOLUTE_MIN
      : this.config.randomKEnabled ? this.config.kMin : 1
    const maxCount = forcedK !== null
      ? K_ABSOLUTE_MAX
      : this.config.randomKEnabled ? this.config.kMax : this.config.totalCases - 1
    if (!Number.isInteger(k) || k < minCount || k > maxCount) {
      this.state = GameEngine.createIdleState(this.personaStrategy)
      return { ok: false, error: EngineErrorEnum.invalidDraw }
    }

    const pool = shuffle(PoolBuilder.build(this.config, k), this.random)
    const topPrizeCount = pool.filter((amount) => amount === this.config.topPrize).length
    const baseBelowTop = this.config.baseAmounts.every(
      (amount) => amount < this.config.topPrize
    )
    if (pool.length !== this.config.totalCases || (baseBelowTop && topPrizeCount !== k)) {
      this.state = GameEngine.createIdleState(this.personaStrategy)
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
      personaState: this.personaStrategy.createState(),
      bankerState: createBankerRuntimeState(),
      personaActionLabelKey: null,
      lastRejected: false,
      rejectStreak: 0,
      audienceDelta: 0,
      planHistory: [],
      passiveNotice: null,
      highestOffer: 0
    }
    return { ok: true }
  }

  /** 选定玩家箱，进入第 1 轮 */
  selectPlayerCase(caseNo: number): EngineResult {
    const state = this.state
    if (state.phase !== GamePhaseEnum.waitingPlayerCase) {
      return GameEngine.reject(EngineErrorEnum.wrongPhase)
    }
    if (!state.cases.some((item) => item.no === caseNo)) {
      return GameEngine.reject(EngineErrorEnum.unknownCase)
    }

    state.playerCaseNo = caseNo
    state.round = 1
    state.remainingToOpen = this.config.openSequence[0]
    state.phase = GamePhaseEnum.opening
    this.settleIfCertain()
    return { ok: true }
  }

  /** 开一个箱子；本轮开满后自动进入报价 */
  openCase(caseNo: number): EngineResult {
    const state = this.state
    if (state.phase === GamePhaseEnum.settled) {
      return GameEngine.reject(EngineErrorEnum.gameOver)
    }
    if (state.phase !== GamePhaseEnum.opening) {
      return GameEngine.reject(EngineErrorEnum.wrongPhase)
    }

    const target = state.cases.find((item) => item.no === caseNo)
    if (!target) return GameEngine.reject(EngineErrorEnum.unknownCase)
    if (target.opened) return GameEngine.reject(EngineErrorEnum.caseAlreadyOpened)
    if (target.no === state.playerCaseNo) {
      return GameEngine.reject(EngineErrorEnum.playerCaseForbidden)
    }
    if (state.remainingToOpen <= 0) {
      return GameEngine.reject(EngineErrorEnum.openQuotaReached)
    }

    state.passiveNotice = null
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
    this.resolveSideBet(amount)
    this.applyPersonaCaseEffect()
    if (this.settleIfCertain()) return { ok: true }
    if (state.remainingToOpen === 0) this.closeRound()
    return { ok: true }
  }

  /** 接受报价 */
  deal(): EngineResult {
    const state = this.state
    if (state.phase === GamePhaseEnum.settled) {
      return GameEngine.reject(EngineErrorEnum.gameOver)
    }
    if (state.phase !== GamePhaseEnum.offerPending || state.currentOffer === null) {
      return GameEngine.reject(EngineErrorEnum.wrongPhase)
    }
    if (!this.personaStrategy.canDeal) {
      return GameEngine.reject(EngineErrorEnum.personaLocked)
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

  /** 拒绝报价；第 9 轮后进入终局交换或直接结算 */
  noDeal(): EngineResult {
    const state = this.state
    if (state.phase === GamePhaseEnum.settled) {
      return GameEngine.reject(EngineErrorEnum.gameOver)
    }
    if (state.phase !== GamePhaseEnum.offerPending || state.currentOffer === null) {
      return GameEngine.reject(EngineErrorEnum.wrongPhase)
    }

    const offer = state.currentOffer
    this.personaStrategy.onNoDeal?.(
      this.personaOfferContext(state, offer),
      state.personaState
    )

    state.currentOffer = null
    state.offerMeta = null
    state.personaActionLabelKey = null
    state.noDealCount += 1
    state.lastRejected = true
    state.rejectStreak += 1
    state.rage = Math.min(RAGE_MAX, state.rage + RAGE_PER_NO_DEAL)
    state.bankerState.sideBetOutcome = null
    state.bankerState.sideBetPending = false
    state.bankerState.sideBetRound = 0
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

  /** 终局交换决策 */
  swap(shouldSwap: boolean): EngineResult {
    const state = this.state
    if (state.phase === GamePhaseEnum.settled) {
      return GameEngine.reject(EngineErrorEnum.gameOver)
    }
    if (state.phase !== GamePhaseEnum.swapPending) {
      return GameEngine.reject(EngineErrorEnum.wrongPhase)
    }

    this.settleByCase(shouldSwap)
    return { ok: true }
  }

  /** 使用角色主动能力，返回需要由会话层落到观众系统的增量 */
  usePersonaAction(action: PersonaActionEnum): EngineActionResult {
    const state = this.state
    if (state.phase !== GamePhaseEnum.offerPending || state.currentOffer === null) {
      return { ok: false, error: EngineErrorEnum.wrongPhase }
    }
    const actions = this.getPersonaActions()
    if (!actions.some((item) => item.id === action && item.enabled)) {
      return { ok: false, error: EngineErrorEnum.actionUnavailable }
    }

    const result = this.personaStrategy.performAction?.(
      action,
      this.personaOfferContext(state, state.currentOffer),
      state.personaState
    )
    if (!result) return { ok: false, error: EngineErrorEnum.actionUnavailable }

    const before = state.currentOffer
    const { lower, upper } = this.remainingRange()
    state.currentOffer = GameEngine.clampAmount(before * result.offerMultiplier, lower, upper)
    state.highestOffer = Math.max(state.highestOffer, state.currentOffer)
    state.rage = Math.min(RAGE_MAX, Math.max(0, state.rage + result.rageDelta))
    state.personaActionLabelKey = result.labelKey
    if (state.offerMeta) {
      state.offerMeta.breakdown.action = before > 0 ? state.currentOffer / before - 1 : 0
    }
    return { ok: true, audienceMoodDelta: result.audienceMoodDelta }
  }

  /** 赌场老板的边注：押下一箱不是顶奖 */
  placeSideBet(): EngineResult {
    const state = this.state
    const rule = this.bankerStrategy.sideBet
    if (!rule) return GameEngine.reject(EngineErrorEnum.actionUnavailable)
    if (state.phase !== GamePhaseEnum.opening) {
      return GameEngine.reject(EngineErrorEnum.wrongPhase)
    }
    if (
      state.remainingToOpen <= 0 ||
      state.bankerState.sideBetPending ||
      state.bankerState.sideBetRound === state.round ||
      state.bankerState.sideBetUsed >= rule.maxUses ||
      this.topPrizeRemaining() <= 0
    ) {
      return GameEngine.reject(EngineErrorEnum.actionUnavailable)
    }

    state.bankerState.sideBetPending = true
    state.bankerState.sideBetOutcome = null
    state.bankerState.sideBetRound = state.round
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

    const personaActions = this.getPersonaActions()
    const personaState = this.getPersonaState(personaActions)
    const bankerState = this.getBankerState(topPrizeRemaining)

    return {
      phase: state.phase,
      modeId: this.modeId,
      personaId: state.personaId,
      bankerId: this.bankerProfile.id,
      passiveNotice: state.passiveNotice ? { ...state.passiveNotice } : null,
      personaState,
      personaActions: personaActions.map((item) => ({ ...item })),
      bankerState,
      highestOffer: state.highestOffer,
      k: state.k,
      topPrizeCount: state.k,
      round: state.round,
      totalRounds: TOTAL_ROUNDS,
      remainingToOpen: state.remainingToOpen,
      playerCaseNo: state.playerCaseNo,
      cases,
      amountRows,
      currentOffer: state.currentOffer,
      canDeal: this.personaStrategy.canDeal,
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

  getConfigErrors(): string[] {
    return [...this.configErrors]
  }

  getSeed(): number {
    return this.random.seed
  }

  /** 阴谋家低语使用的只读金额查询 */
  getCaseAmountForHint(caseNo: number): number | null {
    const target = this.state.cases.find((item) => item.no === caseNo)
    return target ? this.amountOf(target) : null
  }

  /** 会话层同步观众情绪；角色策略会在报价时消费它 */
  setAudienceDelta(delta: number): void {
    this.state.audienceDelta = Number.isFinite(delta) ? delta : 0
  }

  private personaOfferContext(state: InternalState, offer: number): PersonaActionContext {
    const remainingAmounts = this.remainingAmounts()
    return {
      round: state.round,
      offer,
      ev: OfferCalculator.arithmeticMean(remainingAmounts),
      remainingAmounts,
      topPrize: this.config.topPrize,
      rage: state.rage
    }
  }

  private getPersonaActions(): PersonaActionState[] {
    const state = this.state
    if (state.phase !== GamePhaseEnum.offerPending || state.currentOffer === null) return []
    return (
      this.personaStrategy.getActions?.(
        this.personaOfferContext(state, state.currentOffer),
        state.personaState
      ) ?? []
    ).map((item) => ({ ...item }))
  }

  private getPersonaState(actions: readonly PersonaActionState[]): PersonaState {
    const state = this.state
    return {
      actionAvailable: actions.some((item) => item.enabled),
      actionUsed: state.personaState.actionUsed,
      actionLabelKey: state.personaActionLabelKey,
      stacks: state.personaState.stacks,
      stackBonus: this.personaStrategy.getStackBonus?.(state.personaState) ?? 0
    }
  }

  private getBankerState(topPrizeRemaining: number): BankerState {
    const state = this.state
    const quirkContext = this.bankerQuirkContext(
      this.remainingAmounts(),
      state.currentOffer ?? 0,
      topPrizeRemaining
    )
    const quirkLabelKey = this.bankerStrategy.getStatusKey?.(quirkContext) ?? null
    const rule = this.bankerStrategy.sideBet
    if (!rule) return { quirkLabelKey, sideBet: null }

    const sideBet: BankerSideBetState = {
      available:
        state.phase === GamePhaseEnum.opening &&
        state.remainingToOpen > 0 &&
        !state.bankerState.sideBetPending &&
        state.bankerState.sideBetRound !== state.round &&
        state.bankerState.sideBetUsed < rule.maxUses &&
        topPrizeRemaining > 0,
      used: state.bankerState.sideBetUsed,
      maxUses: rule.maxUses,
      pending: state.bankerState.sideBetPending,
      outcome: state.bankerState.sideBetOutcome,
      winFactor: rule.winFactor,
      lossFactor: rule.lossFactor,
      labelKey: rule.labelKey,
      winLabelKey: rule.winLabelKey,
      lossLabelKey: rule.lossLabelKey
    }
    return { quirkLabelKey, sideBet }
  }

  private bankerQuirkContext(
    amounts: readonly number[],
    offer: number,
    topPrizeRemaining: number
  ): BankerQuirkContext {
    return {
      offer,
      round: this.state.round,
      topPrize: this.config.topPrize,
      topPrizeRemaining,
      lower: amounts.length > 0 ? Math.min(...amounts) : 0,
      upper: amounts.length > 0 ? Math.max(...amounts) : 0
    }
  }

  private closeRound(): void {
    const state = this.state
    const remaining = this.remainingAmounts()
    const ev = OfferCalculator.arithmeticMean(remaining)
    const topProb =
      remaining.filter((amount) => amount === this.config.topPrize).length / remaining.length
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
    const plan = chooseBankerPlan(planContext, this.bankerRandom, this.bankerProfile)

    const offerContext = this.personaOfferContext(state, baseOffer.amount)
    const personaDelta = this.personaStrategy.getOfferDelta?.(offerContext, state.personaState) ?? 0
    const raise = this.personaStrategy.getRaise?.(offerContext, state.personaState) ?? 0
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
        audience: state.audienceDelta,
        raise,
        baseMultiplier:
          this.bankerProfile.offerMode === 'highest'
            ? OfferCalculator.maxMultiplier(this.config)
            : undefined
      }
    )
    this.personaStrategy.onOfferComputed?.(offerContext, state.personaState)

    const quirk = this.bankerStrategy.getQuirk?.(
      this.bankerQuirkContext(remaining, offer.amount, this.topPrizeRemaining()),
      state.bankerState
    )
    let amount = offer.amount
    let quirkDelta = 0
    if (quirk) {
      const lower = remaining.length > 0 ? Math.min(...remaining) : 0
      const upper = remaining.length > 0 ? Math.max(...remaining) : 0
      amount = GameEngine.clampAmount(offer.amount * quirk.factor, lower, upper)
      quirkDelta = offer.amount > 0 ? amount / offer.amount - 1 : 0
      offer.breakdown.quirk = quirkDelta
      offer.breakdown.clamped = offer.breakdown.clamped || amount !== offer.amount * quirk.factor
    }

    const planState: BankerPlanState = { id: plan.id, delta: plan.delta }
    state.currentOffer = amount
    state.highestOffer = Math.max(state.highestOffer, amount)
    state.personaActionLabelKey = null
    state.offerMeta = {
      fear: offer.fear,
      ragePenalty: offer.ragePenalty,
      confidence: 1 - offer.probability,
      breakdown: { ...offer.breakdown, quirk: quirkDelta },
      plan: planState,
      quirkLabelKey: quirk?.labelKey ?? null
    }
    state.planHistory = [...state.planHistory, plan.id].slice(-3)
    state.logs.push({
      round: state.round,
      openedAmounts: state.roundOpened.map((entry) => entry.amount),
      offer: state.currentOffer
    })
    state.phase = GamePhaseEnum.offerPending
  }

  private resolveSideBet(amount: number): void {
    const state = this.state
    const rule = this.bankerStrategy.sideBet
    if (!rule || !state.bankerState.sideBetPending) return
    state.bankerState.sideBetPending = false
    state.bankerState.sideBetUsed += 1
    state.bankerState.sideBetOutcome =
      amount === this.config.topPrize ? 'lose' : 'win'
  }

  private applyPersonaCaseEffect(): void {
    const state = this.state
    const unopenedCases = state.cases.filter((item) => !item.opened)
    const context: PersonaCaseContext = {
      topPrize: this.config.topPrize,
      playerCaseNo: state.playerCaseNo,
      remainingCases: unopenedCases.map((item) => ({
        caseNo: item.no,
        amount: this.amountOf(item),
        isPlayerCase: item.no === state.playerCaseNo
      }))
    }
    const effect = this.personaStrategy.onCaseOpened?.(context, state.personaState)
    if (!effect || effect.candidateCaseNos.length === 0) return

    const targetNo =
      effect.candidateCaseNos[
        Math.floor(this.random.next() * effect.candidateCaseNos.length)
      ]
    const target = state.cases.find((item) => item.no === targetNo)
    if (!target) return
    state.pool[target.poolIndex] = effect.amount
    state.passiveNotice = {
      personaId: state.personaId,
      caseNo: target.no,
      amount: effect.amount
    }
  }

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
    const prizeContext: PersonaPrizeContext = {
      basePrize,
      decidedBy,
      topPrize: this.config.topPrize,
      highestOffer: state.highestOffer
    }
    const personaResult = this.personaStrategy.getPrize?.(
      prizeContext,
      state.personaState
    ) ?? { prize: basePrize, honorBonus: 0 }
    const personaBonus = personaResult.prize - basePrize
    const prize = personaResult.prize + personaResult.honorBonus
    state.result = {
      basePrize,
      personaBonus,
      honorBonus: personaResult.honorBonus,
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

  private topPrizeRemaining(): number {
    return this.state.cases.filter(
      (item) => !item.opened && this.amountOf(item) === this.config.topPrize
    ).length
  }

  private remainingRange(): { lower: number; upper: number } {
    const amounts = this.remainingAmounts()
    return {
      lower: amounts.length > 0 ? Math.min(...amounts) : 0,
      upper: amounts.length > 0 ? Math.max(...amounts) : 0
    }
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

  private static clampAmount(value: number, lower: number, upper: number): number {
    return Math.min(upper, Math.max(lower, Math.floor(value)))
  }

  private static reject(error: EngineErrorEnum): EngineResult {
    return { ok: false, error }
  }

  private static createIdleState(strategy: PersonaStrategy): InternalState {
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
      personaState: strategy.createState(),
      bankerState: createBankerRuntimeState(),
      personaActionLabelKey: null,
      lastRejected: false,
      rejectStreak: 0,
      audienceDelta: 0,
      planHistory: [],
      passiveNotice: null,
      highestOffer: 0
    }
  }
}
