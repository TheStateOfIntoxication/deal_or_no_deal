import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { GAME_MODES, createModeGameConfig, getGameMode } from '@/config/modes'
import type { GameModeDefinition } from '@/config/modes'
import { PRAGMATIC_ADVICE_THRESHOLD, getPlayerPersona } from '@/config/personas'
import type { PlayerPersonaDefinition } from '@/config/personas'
import {
  FINAL_REVEAL_MS,
  FLASH_MS,
  GAMBLER_AUTO_NO_DEAL_MS,
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
import {
  AmountGradeEnum,
  GameModeEnum,
  PayoutGradeEnum,
  PlayerPersonaEnum
} from '@/types/game'
import { formatMoney } from '@/utils/money'
import { createRandom, createSeed, deriveSeed } from '@/utils/random'
import { OfferCalculator } from './services/OfferCalculator'
import { PoolBuilder } from './services/PoolBuilder'
import { GameEngine } from './services/GameEngine'
import { AudienceDirector } from './services/AudienceDirector'
import { buildModeDeck } from './services/ModeDeckBuilder'
import type { ModeCardState } from './services/ModeDeckBuilder'
import { useAudio } from './useAudio'
import { BANKER_PLAN_EVENTS, createBankerLinePicker } from './bankerLines'
import type { BankerEvent } from './bankerLines'
import { EngineErrorEnum, GamePhaseEnum, SetupPhaseEnum } from './types'
import type {
  AudienceMemberState,
  AudienceReactionState,
  AudienceRecommendationState,
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
  setupPhase: Ref<SetupPhaseEnum>
  modeDeck: Ref<ModeCardState[]>
  selectedMode: ComputedRef<GameModeEnum | null>
  personaId: Ref<PlayerPersonaEnum | null>
  mode: ComputedRef<GameModeDefinition | null>
  persona: ComputedRef<PlayerPersonaDefinition | null>
  modeLabel: ComputedRef<string>
  personaLabel: ComputedRef<string>
  topPrizeLabel: ComputedRef<string>
  drawCandidates: Ref<number[]>
  pickedIndex: Ref<number | null>
  drawLowestAmount: ComputedRef<number>
  topPrize: ComputedRef<number>
  snapshot: Ref<GameSnapshot>
  errorText: ComputedRef<string>
  hint: ComputedRef<string>
  adviceText: ComputedRef<string>
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
  noDealLocked: ComputedRef<boolean>
  autoNoDealSeconds: Ref<number>
  audienceMembers: Ref<AudienceMemberState[]>
  audienceRecommendations: Ref<AudienceRecommendationState[]>
  audienceReactions: Ref<AudienceReactionState[]>
  recommendedCaseNos: ComputedRef<number[]>
  handleModePick: (index: number) => void
  handleModeRethink: () => void
  handleModeConfirm: () => void
  handlePersonaPick: (id: PlayerPersonaEnum) => void
  handlePersonaConfirm: () => void
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
 * 单局游戏会话：玩法卡/角色选择 → 摇奖或揭幕 → 开箱节奏 → 报价决策 → 结算
 * 规则逻辑在 services/GameEngine；本 composable 只负责编排 UI 状态与观众表现
 */
export function useGameSession(): GameSessionApi {
  const sessionSeed = ref<number>(createSeed())
  const setupPhase = ref<SetupPhaseEnum>(SetupPhaseEnum.modeDraw)
  const modeDeck = ref<ModeCardState[]>([])
  /** Reserved for a future multi-mode persona; the current UI keeps exactly one id */
  const selectedModeIds = ref<GameModeEnum[]>([])
  const selectedMode = computed<GameModeEnum | null>(() => selectedModeIds.value[0] ?? null)
  const personaId = ref<PlayerPersonaEnum | null>(null)

  let engine = new GameEngine(
    createModeGameConfig(GameModeEnum.classic, sessionSeed.value),
    GameModeEnum.classic
  )
  const snapshot = ref<GameSnapshot>(engine.getSnapshot())
  const errorKey = ref<MessageKey | null>(null)
  const errorParams = reactive<MessageParams>({})

  const clearError = (): void => {
    errorKey.value = null
    for (const key of Object.keys(errorParams)) delete errorParams[key]
  }

  const store = useStore()
  const { playOpen, playOffer, playGrade, playPayout, playDraw } = useAudio()

  const drawCandidates = ref<number[]>([])
  const pickedIndex = ref<number | null>(null)

  const offerReady = ref<boolean>(false)
  const finalRevealed = ref<boolean>(false)
  const resultReady = ref<boolean>(false)
  const resultDismissed = ref<boolean>(false)
  const flashGrade = ref<AmountGradeEnum | PayoutGradeEnum | null>(null)
  const nextBankerLine = createBankerLinePicker()
  const bankerLineKey = ref<MessageKey>('BankerLineGreeting1')
  const meltdownActive = ref(false)

  let audienceDirector: AudienceDirector | null = null
  const audienceMembers = ref<AudienceMemberState[]>([])
  const audienceRecommendations = ref<AudienceRecommendationState[]>([])
  const audienceReactions = ref<AudienceReactionState[]>([])

  let holdTimer: number | undefined
  let flashTimer: number | undefined
  let revealTimer: number | undefined
  let resultTimer: number | undefined
  let autoNoDealTimer: number | undefined
  const autoNoDealSeconds = ref<number>(0)
  let lastModeOrder: GameModeEnum[] = []

  const mode = computed<GameModeDefinition | null>(() =>
    selectedMode.value ? getGameMode(selectedMode.value) : null
  )
  const persona = computed<PlayerPersonaDefinition | null>(() =>
    personaId.value ? getPlayerPersona(personaId.value) : null
  )
  const modeLabel = computed(() => (mode.value ? t(mode.value.nameKey) : ''))
  const personaLabel = computed(() => (persona.value ? t(persona.value.nameKey) : ''))
  const topPrizeLabel = computed(
    () => `${formatMoney(snapshot.value.topPrize)} ×${snapshot.value.topPrizeCount}`
  )

  const phase = computed(() => snapshot.value.phase)
  const pickedK = computed(() => {
    const index = pickedIndex.value
    return index === null ? null : (drawCandidates.value[index] ?? null)
  })
  const drawLowestAmount = computed(() => {
    const k = pickedK.value
    if (k === null) return 0
    return Math.min(...PoolBuilder.build(createModeGameConfig(GameModeEnum.classic), k))
  })
  const topPrize = computed(() => mode.value?.overrides.topPrize ?? snapshot.value.topPrize)
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
  const noDealLocked = computed(() => snapshot.value.noDealLocked)
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
        if (noDealLocked.value) return t('OfferNoDealLocked')
        return offerReady.value ? t('HintOfferPending') : t('HintBankerCalling')
      case GamePhaseEnum.swapPending:
        return t('HintSwapPending')
      case GamePhaseEnum.settled:
        return finalRevealed.value ? t('HintSettled') : t('HintFinalReveal')
      default:
        return t('HintChoosePlayerCase')
    }
  })
  const offerRatio = computed(() => {
    const offer = snapshot.value.currentOffer
    if (offer === null) return 0
    const ev = OfferCalculator.arithmeticMean(snapshot.value.remainingAmounts)
    return ev > 0 ? offer / ev : 0
  })
  const adviceText = computed<string>(() => {
    if (phase.value !== GamePhaseEnum.offerPending || !persona.value) return ''
    if (persona.value.id === PlayerPersonaEnum.pragmatic) {
      return offerRatio.value >= PRAGMATIC_ADVICE_THRESHOLD
        ? t('PersonaPragmaticAdviceDeal')
        : t('PersonaPragmaticAdviceHold')
    }
    if (persona.value.id === PlayerPersonaEnum.gambler) {
      return t('PersonaGamblerAdvice')
    }
    const mood = audienceMembers.value.length
      ? audienceMembers.value.reduce((sum, member) => sum + member.mood, 0) /
        audienceMembers.value.length
      : 3
    if (mood >= 3.5) return t('PersonaConformistAdviceHold')
    if (mood <= 2.5) return t('PersonaConformistAdviceDeal')
    return t('PersonaConformistAdviceWait')
  })
  const recommendedCaseNos = computed(() =>
    audienceRecommendations.value.map((item) => item.caseNo)
  )
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

  const stopAutoNoDeal = (): void => {
    if (autoNoDealTimer !== undefined) window.clearInterval(autoNoDealTimer)
    autoNoDealTimer = undefined
    autoNoDealSeconds.value = 0
  }

  const startAutoNoDeal = (): void => {
    if (personaId.value !== PlayerPersonaEnum.gambler) return
    if (phase.value !== GamePhaseEnum.offerPending) return
    stopAutoNoDeal()
    autoNoDealSeconds.value = Math.ceil(GAMBLER_AUTO_NO_DEAL_MS / 1000)
    autoNoDealTimer = window.setInterval(() => {
      autoNoDealSeconds.value -= 1
      if (autoNoDealSeconds.value <= 0) {
        stopAutoNoDeal()
        handleNoDeal()
      }
    }, 1000)
  }

  const clearTimers = (): void => {
    stopAutoNoDeal()
    window.clearTimeout(holdTimer)
    window.clearTimeout(revealTimer)
    window.clearTimeout(resultTimer)
    window.clearTimeout(flashTimer)
  }

  /** 把观众情绪同步给引擎；只有从众角色会真正影响报价 */
  const syncAudience = (): void => {
    audienceMembers.value = audienceDirector?.getMembers() ?? []
    engine.setAudienceDelta(audienceDirector?.getOfferDelta() ?? 0)
  }

  const startAudienceRound = (): void => {
    if (!audienceDirector || phase.value !== GamePhaseEnum.opening) return
    audienceReactions.value = []
    audienceRecommendations.value = audienceDirector.beginRound(
      snapshot.value.cases,
      snapshot.value.playerCaseNo
    )
    syncAudience()
  }

  /** 回到玩法卡：新一局重新抽卡、抽角色、抽种子 */
  const resetDraw = (): void => {
    clearTimers()
    sessionSeed.value = createSeed()
    setupPhase.value = SetupPhaseEnum.modeDraw
    selectedModeIds.value = []
    personaId.value = null
    let deck = buildModeDeck(
      GAME_MODES.map((item) => item.id),
      createRandom(deriveSeed(sessionSeed.value, 'deck'))
    )
    // Two cards have a 50% chance of the same shuffled order; avoid repeating visibly.
    if (deck.length > 1 && deck.every((card, index) => card.modeId === lastModeOrder[index])) {
      deck = [...deck].reverse()
    }
    lastModeOrder = deck.map((card) => card.modeId)
    modeDeck.value = deck
    pickedIndex.value = null
    drawCandidates.value = []
    audienceDirector = null
    audienceMembers.value = []
    audienceRecommendations.value = []
    audienceReactions.value = []
    offerReady.value = false
    finalRevealed.value = false
    resultReady.value = false
    resultDismissed.value = false
    flashGrade.value = null
    meltdownActive.value = false
    bankerLineKey.value = 'BankerLineGreeting1'
    engine = new GameEngine(
      createModeGameConfig(GameModeEnum.classic, sessionSeed.value),
      GameModeEnum.classic
    )
    clearError()
    refresh()
  }

  const handleModePick = (index: number): void => {
    if (setupPhase.value !== SetupPhaseEnum.modeDraw && setupPhase.value !== SetupPhaseEnum.modeReveal) {
      return
    }
    const card = modeDeck.value[index]
    if (!card) return
    modeDeck.value = modeDeck.value.map((item, itemIndex) => ({
      ...item,
      revealed: itemIndex === index
    }))
    selectedModeIds.value = [card.modeId]
    setupPhase.value = SetupPhaseEnum.modeReveal
    playDraw()
  }

  const handleModeRethink = (): void => {
    if (setupPhase.value !== SetupPhaseEnum.modeReveal) return
    modeDeck.value = modeDeck.value.map((card) => ({ ...card, revealed: false }))
    selectedModeIds.value = []
    setupPhase.value = SetupPhaseEnum.modeDraw
  }

  const handleModeConfirm = (): void => {
    if (!selectedMode.value || setupPhase.value !== SetupPhaseEnum.modeReveal) return
    engine = new GameEngine(
      createModeGameConfig(selectedMode.value, sessionSeed.value),
      selectedMode.value
    )
    drawCandidates.value = []
    pickedIndex.value = null
    clearError()
    refresh()
    setupPhase.value = SetupPhaseEnum.personaPick
  }

  const handlePersonaPick = (id: PlayerPersonaEnum): void => {
    if (setupPhase.value !== SetupPhaseEnum.personaPick) return
    personaId.value = id
  }

  const handlePersonaConfirm = (): void => {
    if (!personaId.value || setupPhase.value !== SetupPhaseEnum.personaPick) return
    setupPhase.value = SetupPhaseEnum.modeSetup
    if (mode.value?.setup === 'k-draw') {
      drawCandidates.value = engine.createKDraw()
      pickedIndex.value = null
    }
  }

  const handlePick = (index: number): void => {
    if (pickedIndex.value !== null) return
    pickedIndex.value = index
    playDraw()
  }

  /** 用玩家抽到的 k（经典）或固定 1 个顶奖（巨奖）开局 */
  const beginGame = (): void => {
    if (!selectedMode.value || !personaId.value) return
    const isClassic = mode.value?.setup === 'k-draw'
    const k = isClassic ? pickedK.value : undefined
    if (isClassic && k === null) return

    const result = engine.start(k ?? undefined, personaId.value)
    refresh()
    if (!result.ok) {
      reject(result.error, { codes: engine.getConfigErrors().join(', ') })
      return
    }
    clearError()
    setupPhase.value = SetupPhaseEnum.playing
    if (mode.value?.features.audience) {
      audienceDirector = new AudienceDirector(
        deriveSeed(sessionSeed.value, 'audience'),
        personaId.value
      )
      syncAudience()
    }
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
      startAudienceRound()
      return
    }

    const opened = snapshot.value.lastOpened
    if (opened) {
      playGrade(opened.grade)
      flash(opened.grade)
      if (audienceDirector) {
        const reactions = audienceDirector.react(opened, snapshot.value.amountRows.map((row) => row.amount))
        if (reactions.length > 0) {
          audienceReactions.value = reactions
          syncAudience()
        }
      }
      if (snapshot.value.phase !== GamePhaseEnum.opening) {
        audienceRecommendations.value = []
      }
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
      playedAt: Date.now(),
      modeId: snapshot.value.modeId,
      personaId: snapshot.value.personaId,
      sessionSeed: sessionSeed.value
    })
  }

  const handleDeal = (): void => {
    stopAutoNoDeal()
    const result = engine.deal()
    if (!result.ok) {
      reject(result.error)
      return
    }
    clearError()
    refresh()
    persistResult()
    pickBankerLine('deal')
  }

  const handleNoDeal = (): void => {
    stopAutoNoDeal()
    const result = engine.noDeal()
    if (!result.ok) {
      reject(result.error)
      return
    }
    clearError()
    refresh()
    if (phase.value === GamePhaseEnum.settled) {
      persistResult()
    } else if (phase.value === GamePhaseEnum.opening) {
      playOpen()
      startAudienceRound()
    }

    const currentRage = snapshot.value.rage
    if (currentRage >= RAGE_TIER_FURIOUS) pickBankerLine('noDealFurious')
    else if (currentRage >= RAGE_TIER_ANGRY) pickBankerLine('noDealAngry')
    else if (currentRage >= RAGE_TIER_ANNOYED) pickBankerLine('noDealAnnoyed')
    else pickBankerLine('noDealCalm')
  }

  const handleSwap = (shouldSwap: boolean): void => {
    const result = engine.swap(shouldSwap)
    if (!result.ok) {
      reject(result.error)
      return
    }
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
    stopAutoNoDeal()

    if (value === GamePhaseEnum.offerPending) {
      holdTimer = window.setTimeout(() => {
        offerReady.value = true
        playOffer()
        const plan = snapshot.value.offerMeta?.plan?.id
        if (plan) {
          pickBankerLine(BANKER_PLAN_EVENTS[plan])
        } else {
          pickBankerLine(
            snapshot.value.bankerConfidence >= OFFER_CONFIDENT_CONFIDENCE
              ? 'offerConfident'
              : 'offerNervous'
          )
        }
        startAutoNoDeal()
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
    setupPhase,
    modeDeck,
    selectedMode,
    personaId,
    mode,
    persona,
    modeLabel,
    personaLabel,
    topPrizeLabel,
    drawCandidates,
    pickedIndex,
    drawLowestAmount,
    topPrize,
    snapshot,
    errorText,
    hint,
    adviceText,
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
    noDealLocked,
    autoNoDealSeconds,
    audienceMembers,
    audienceRecommendations,
    audienceReactions,
    recommendedCaseNos,
    handleModePick,
    handleModeRethink,
    handleModeConfirm,
    handlePersonaPick,
    handlePersonaConfirm,
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
