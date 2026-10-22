import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { createGameConfig } from '@/config/game'
import {
  FINAL_REVEAL_MS,
  FLASH_MS,
  MILESTONE_HALF,
  MILESTONE_HIGH,
  MILESTONE_LOW,
  OFFER_CONFIDENT_CONFIDENCE,
  RAGE_TIER_ANGRY,
  RAGE_TIER_ANNOYED,
  RAGE_TIER_FURIOUS,
  REVEAL_HOLD_MS,
  RESULT_PANEL_DELAY_MS
} from '@/config/presentation'
import { t } from '@/language'
import type { MessageKey, MessageParams } from '@/language'
import { useStore } from '@/store'
import { AmountGradeEnum, PayoutGradeEnum } from '@/types/game'
import { formatMoney } from '@/utils/money'
import { useAudio } from './useAudio'
import { createBankerLinePicker } from './bankerLines'
import type { BankerEvent } from './bankerLines'
import { GameEngine } from './services/GameEngine'
import { PoolBuilder } from './services/PoolBuilder'
import { EngineErrorEnum, GamePhaseEnum } from './types'
import type {
  BankerExpression,
  BankerOfferMetaState,
  CaseState,
  GameSnapshot,
  PlayerCaseStats,
  RoundOpenedState
} from './types'

/** 引擎错误码 → 文案 Key */
const ERROR_KEYS: Record<EngineErrorEnum, MessageKey> = {
  [EngineErrorEnum.configInvalid]: 'ErrorConfigInvalid',
  [EngineErrorEnum.invalidDraw]: 'ErrorInvalidDraw',
  [EngineErrorEnum.wrongPhase]: 'ErrorWrongPhase',
  [EngineErrorEnum.unknownCase]: 'ErrorUnknownCase',
  [EngineErrorEnum.caseAlreadyOpened]: 'ErrorCaseAlreadyOpened',
  [EngineErrorEnum.playerCaseForbidden]: 'ErrorPlayerCaseForbidden',
  [EngineErrorEnum.openQuotaReached]: 'ErrorOpenQuotaReached',
  [EngineErrorEnum.gameOver]: 'ErrorGameOver'
}

/** 单局会话对外暴露的状态与操作 */
export interface GameSessionApi {
  drawing: Ref<boolean>
  drawCandidates: Ref<number[]>
  pickedIndex: Ref<number | null>
  drawLowestAmount: ComputedRef<number>
  topPrize: ComputedRef<number>
  snapshot: Ref<GameSnapshot>
  errorText: ComputedRef<string>
  hint: ComputedRef<string>
  gridCases: ComputedRef<CaseState[]>
  playerCaseStats: ComputedRef<PlayerCaseStats>
  revealVisible: ComputedRef<boolean>
  lastOpened: ComputedRef<RoundOpenedState | null>
  offerVisible: ComputedRef<boolean>
  swapVisible: ComputedRef<boolean>
  resultVisible: ComputedRef<boolean>
  tableShaking: ComputedRef<boolean>
  bestPrize: ComputedRef<number>
  flashGrade: Ref<AmountGradeEnum | PayoutGradeEnum | null>
  bankerLine: ComputedRef<string>
  bankerExpression: ComputedRef<BankerExpression>
  bankerConfidence: ComputedRef<number>
  rage: ComputedRef<number>
  noDealCount: ComputedRef<number>
  offerMeta: ComputedRef<BankerOfferMetaState | null>
  handlePick: (index: number) => void
  beginGame: () => void
  resetDraw: () => void
  handleSelect: (caseNo: number) => void
  handleDeal: () => void
  handleNoDeal: () => void
  handleSwap: (shouldSwap: boolean) => void
  dismissResult: () => void
}

/**
 * 单局游戏会话：摇奖开局、开箱节奏、报价决策、结算节奏与战绩落库
 * 规则逻辑全部在 services/GameEngine，本 composable 只负责编排 UI 状态
 */
export function useGameSession(): GameSessionApi {
  const gameConfig = createGameConfig()
  const engine = new GameEngine(gameConfig)
  const snapshot = ref<GameSnapshot>(engine.getSnapshot())
  const errorKey = ref<MessageKey | null>(null)
  const errorParams = reactive<MessageParams>({})

  /** 清空错误提示与占位参数 */
  const clearError = (): void => {
    errorKey.value = null
    for (const key of Object.keys(errorParams)) delete errorParams[key]
  }
  const store = useStore()
  const { playOpen, playOffer, playGrade, playPayout, playDraw } = useAudio()

  /** 开局摇奖：玩家从金球中抽本局的百万箱数量 */
  const drawing = ref<boolean>(true)
  const drawCandidates = ref<number[]>([])
  const pickedIndex = ref<number | null>(null)

  /** 报价面板在开箱亮相之后才出现；结算先翻牌再出结算面板 */
  const offerReady = ref<boolean>(false)
  const finalRevealed = ref<boolean>(false)
  const resultReady = ref<boolean>(false)
  const resultDismissed = ref<boolean>(false)
  const flashGrade = ref<AmountGradeEnum | PayoutGradeEnum | null>(null)
  const nextBankerLine = createBankerLinePicker()
  const bankerLineKey = ref<MessageKey>('BankerLineGreeting1')
  const meltdownActive = ref(false)
  let holdTimer: number | undefined
  let flashTimer: number | undefined
  let revealTimer: number | undefined
  let resultTimer: number | undefined

  const phase = computed(() => snapshot.value.phase)
  const pickedK = computed(() => {
    const index = pickedIndex.value
    return index === null ? null : (drawCandidates.value[index] ?? null)
  })
  const drawLowestAmount = computed(() => {
    const k = pickedK.value
    if (k === null) return 0
    return Math.min(...PoolBuilder.build(gameConfig, k))
  })
  const topPrize = computed(() => gameConfig.topPrize)
  const offerVisible = computed(
    () => phase.value === GamePhaseEnum.offerPending && offerReady.value
  )
  const swapVisible = computed(() => phase.value === GamePhaseEnum.swapPending)
  const resultVisible = computed(
    () => phase.value === GamePhaseEnum.settled && resultReady.value && !resultDismissed.value
  )
  const tableShaking = computed(() => flashGrade.value === AmountGradeEnum.disaster)
  const bestPrize = computed(() => store.state.record.bestPrize)
  const bankerLine = computed(() => t(bankerLineKey.value))
  const bankerExpression = computed<BankerExpression>(() => {
    if (meltdownActive.value) return 'furious'
    const value = snapshot.value.rage
    if (value >= RAGE_TIER_FURIOUS) return 'furious'
    if (value >= RAGE_TIER_ANGRY) return 'angry'
    if (value >= RAGE_TIER_ANNOYED) return 'annoyed'
    return 'smug'
  })
  const bankerConfidence = computed(() => snapshot.value.bankerConfidence)
  const rage = computed(() => snapshot.value.rage)
  const noDealCount = computed(() => snapshot.value.noDealCount)
  const offerMeta = computed(() => snapshot.value.offerMeta)
  const hideSettledReveal = computed(
    () => phase.value === GamePhaseEnum.settled && !finalRevealed.value
  )
  const gridCases = computed(() =>
    snapshot.value.cases
      .filter((item) => !item.isPlayerCase)
      .map((item) =>
        hideSettledReveal.value && !item.opened
          ? { ...item, revealedAmount: null, grade: null }
          : item
      )
  )
  const lastOpened = computed(() => snapshot.value.lastOpened)
  const revealVisible = computed(
    () => lastOpened.value !== null && phase.value !== GamePhaseEnum.waitingPlayerCase
  )
  const topPrizeProbability = computed(() => {
    const { topPrizeRemaining, remainingCaseCount } = snapshot.value
    return remainingCaseCount === 0 ? 0 : topPrizeRemaining / remainingCaseCount
  })
  const remainingRangeText = computed(() => {
    const amounts = snapshot.value.remainingAmounts
    if (amounts.length === 0) return ''
    return `${formatMoney(Math.min(...amounts))} – ${formatMoney(Math.max(...amounts))}`
  })
  const milestoneText = computed(() => {
    const probability = topPrizeProbability.value
    if (probability >= MILESTONE_HIGH) return t('MilestoneHigh')
    if (probability >= MILESTONE_HALF) return t('MilestoneHalf')
    if (probability >= MILESTONE_LOW) return t('MilestoneLow')
    return ''
  })
  const playerCaseStats = computed<PlayerCaseStats>(() => {
    const playerCase = snapshot.value.cases.find((item) => item.isPlayerCase)
    const settled = phase.value === GamePhaseEnum.settled
    const heldResult = settled && finalRevealed.value ? snapshot.value.result : null

    return {
      caseNo: heldResult ? heldResult.heldCaseNo : (playerCase?.no ?? null),
      revealedAmount: heldResult ? heldResult.heldCaseAmount : null,
      revealedGrade: heldResult ? heldResult.payoutGrade : null,
      revealing: settled && !finalRevealed.value,
      topPrize: snapshot.value.topPrize,
      probability: topPrizeProbability.value,
      topPrizeRemaining: snapshot.value.topPrizeRemaining,
      remainingCaseCount: snapshot.value.remainingCaseCount,
      rangeText: remainingRangeText.value,
      milestoneText: milestoneText.value
    }
  })
  const hint = computed<string>(() => {
    switch (phase.value) {
      case GamePhaseEnum.waitingPlayerCase:
        return t('HintChoosePlayerCase')
      case GamePhaseEnum.opening:
        return t('HintOpenCases', { count: snapshot.value.remainingToOpen })
      case GamePhaseEnum.offerPending:
        return offerReady.value ? t('HintOfferPending') : t('HintBankerCalling')
      case GamePhaseEnum.swapPending:
        return t('HintSwapPending')
      case GamePhaseEnum.settled:
        return finalRevealed.value ? t('HintSettled') : t('HintFinalReveal')
      default:
        return t('HintChoosePlayerCase')
    }
  })
  const errorText = computed(() => (errorKey.value ? t(errorKey.value, errorParams) : ''))

  const refresh = (): void => {
    snapshot.value = engine.getSnapshot()
  }

  const reject = (error: EngineErrorEnum, params: MessageParams = {}): void => {
    errorKey.value = ERROR_KEYS[error]
    for (const key of Object.keys(errorParams)) delete errorParams[key]
    Object.assign(errorParams, params)
  }

  const pickBankerLine = (event: BankerEvent): void => {
    bankerLineKey.value = nextBankerLine(event)
  }

  const flash = (grade: AmountGradeEnum | PayoutGradeEnum): void => {
    flashGrade.value = grade
    window.clearTimeout(flashTimer)
    flashTimer = window.setTimeout(() => {
      flashGrade.value = null
    }, FLASH_MS)
  }

  const clearTimers = (): void => {
    window.clearTimeout(holdTimer)
    window.clearTimeout(revealTimer)
    window.clearTimeout(resultTimer)
    window.clearTimeout(flashTimer)
  }

  /** 回到摇奖：新一局都从金球抽奖开始，不自动开局 */
  const resetDraw = (): void => {
    clearTimers()
    offerReady.value = false
    finalRevealed.value = false
    resultReady.value = false
    resultDismissed.value = false
    flashGrade.value = null
    meltdownActive.value = false
    bankerLineKey.value = 'BankerLineGreeting1'
    pickedIndex.value = null
    drawCandidates.value = engine.createKDraw()
    drawing.value = true
    clearError()
    refresh()
  }

  const handlePick = (index: number): void => {
    if (pickedIndex.value !== null) return
    pickedIndex.value = index
    playDraw()
  }

  /** 用玩家抽到的 k 开局 */
  const beginGame = (): void => {
    const k = pickedK.value
    if (k === null) return
    const result = engine.start(k)
    refresh()
    if (!result.ok) {
      reject(result.error, { codes: engine.getConfigErrors().join(', ') })
      return
    }
    clearError()
    drawing.value = false
    pickBankerLine('greeting')
  }

  /** 选箱阶段点击即选箱，开箱阶段点击即开箱 */
  const handleSelect = (caseNo: number): void => {
    const picking = phase.value === GamePhaseEnum.waitingPlayerCase
    const result = picking ? engine.selectPlayerCase(caseNo) : engine.openCase(caseNo)
    if (!result.ok) {
      reject(result.error)
      return
    }
    clearError()
    refresh()
    if (picking) {
      playOpen()
      return
    }

    const opened = snapshot.value.lastOpened
    if (opened) {
      playGrade(opened.grade)
      flash(opened.grade)
      if (opened.grade === AmountGradeEnum.disaster) pickBankerLine('gloat')
      else if (opened.grade === AmountGradeEnum.good) pickBankerLine('annoyedSmall')
    }
  }

  const persistResult = (): void => {
    const result = snapshot.value.result
    if (!result) return
    void store.dispatch('record/recordOutcome', {
      prize: result.prize,
      k: snapshot.value.k,
      decidedBy: result.decidedBy,
      swapped: result.swapped,
      playedAt: Date.now()
    })
  }

  const handleDeal = (): void => {
    if (!engine.deal().ok) return
    clearError()
    refresh()
    persistResult()
    pickBankerLine('deal')
  }

  const handleNoDeal = (): void => {
    const result = engine.noDeal()
    if (!result.ok) {
      reject(result.error)
      return
    }
    clearError()
    refresh()
    if (phase.value === GamePhaseEnum.settled) {
      persistResult()
    } else {
      playOpen()
    }

    const currentRage = snapshot.value.rage
    if (currentRage >= RAGE_TIER_FURIOUS) pickBankerLine('noDealFurious')
    else if (currentRage >= RAGE_TIER_ANGRY) pickBankerLine('noDealAngry')
    else if (currentRage >= RAGE_TIER_ANNOYED) pickBankerLine('noDealAnnoyed')
    else pickBankerLine('noDealCalm')
  }

  const handleSwap = (shouldSwap: boolean): void => {
    if (!engine.swap(shouldSwap).ok) return
    clearError()
    refresh()
    persistResult()
  }

  /** 关闭结算面板但保留牌面（不重开） */
  const dismissResult = (): void => {
    resultDismissed.value = true
  }

  /** 阶段节奏：一轮开完先亮金额再出报价；结算先留念再翻牌，翻牌后才出结算面板 */
  watch(phase, (value) => {
    window.clearTimeout(holdTimer)
    window.clearTimeout(revealTimer)
    window.clearTimeout(resultTimer)
    offerReady.value = false
    finalRevealed.value = false
    resultReady.value = false
    resultDismissed.value = false

    if (value === GamePhaseEnum.offerPending) {
      holdTimer = window.setTimeout(() => {
        offerReady.value = true
        playOffer()
        pickBankerLine(
          snapshot.value.bankerConfidence >= OFFER_CONFIDENT_CONFIDENCE ? 'offerConfident' : 'offerNervous'
        )
      }, REVEAL_HOLD_MS)
      return
    }

    if (value === GamePhaseEnum.settled) {
      revealTimer = window.setTimeout(() => {
        finalRevealed.value = true
        const result = snapshot.value.result
        if (result && result.decidedBy !== 'deal') {
          if (result.payoutGrade === PayoutGradeEnum.jackpot) {
            meltdownActive.value = true
            pickBankerLine('meltdown')
          } else {
            pickBankerLine('gloat')
          }
        }

        const grade = snapshot.value.result?.payoutGrade
        if (!grade) return
        playPayout(grade)
        flash(grade)
      }, FINAL_REVEAL_MS)
      resultTimer = window.setTimeout(() => {
        resultReady.value = true
      }, FINAL_REVEAL_MS + RESULT_PANEL_DELAY_MS)
    }
  })

  onMounted(() => {
    void store.dispatch('record/hydrate')
    resetDraw()
  })

  onUnmounted(clearTimers)

  return {
    drawing,
    drawCandidates,
    pickedIndex,
    drawLowestAmount,
    topPrize,
    snapshot,
    errorText,
    hint,
    gridCases,
    playerCaseStats,
    revealVisible,
    lastOpened,
    offerVisible,
    swapVisible,
    resultVisible,
    tableShaking,
    bestPrize,
    flashGrade,
    bankerLine,
    bankerExpression,
    bankerConfidence,
    rage,
    noDealCount,
    offerMeta,
    handlePick,
    beginGame,
    resetDraw,
    handleSelect,
    handleDeal,
    handleNoDeal,
    handleSwap,
    dismissResult
  }
}
