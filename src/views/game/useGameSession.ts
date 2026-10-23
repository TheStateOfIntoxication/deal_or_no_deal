import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { BankerProfileEnum, getBankerProfile } from '@/config/bankers'
import { GAME_MODES, createModeGameConfig, getGameMode } from '@/config/modes'
import type { GameModeDefinition } from '@/config/modes'
import { getPlayerPersona } from '@/config/personas'
import type { PlayerPersonaDefinition } from '@/config/personas'
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
import {
  AmountGradeEnum,
  GameModeEnum,
  PayoutGradeEnum,
  PersonaActionEnum,
  PlayerPersonaEnum
} from '@/types/game'
import { formatMoney } from '@/utils/money'
import { createRandom, createSeed, deriveSeed } from '@/utils/random'
import { AmountGrader } from './services/AmountGrader'
import type { AmountTone } from './services/AmountGrader'
import { OfferCalculator } from './services/OfferCalculator'
import { PoolBuilder } from './services/PoolBuilder'
import { GameEngine } from './services/GameEngine'
import { AudienceDirector } from './services/AudienceDirector'
import { BankerRotation } from './services/BankerRotation'
import { CaseTierEnum, createConspiratorHint } from './services/ConspiratorHint'
import { getPersonaStrategy } from './services/personas'
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
  [EngineErrorEnum.personaLocked]: 'ErrorPersonaLocked',
  [EngineErrorEnum.actionUnavailable]: 'ErrorActionUnavailable',
  [EngineErrorEnum.gameOver]: 'ErrorGameOver'
}

/** 单局会话对外暴露的状态与操作 */
export interface GameSessionApi {
  setupPhase: Ref<SetupPhaseEnum>
  selectedMode: ComputedRef<GameModeEnum | null>
  bankerId: Ref<BankerProfileEnum>
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
  canReopenResult: ComputedRef<boolean>
  tableShaking: ComputedRef<boolean>
  bestPrize: ComputedRef<number>
  flashGrade: Ref<AmountGradeEnum | PayoutGradeEnum | null>
  flashTone: Ref<AmountTone | null>
  bankerLine: ComputedRef<string>
  bankerName: ComputedRef<string>
  bankerTrait: ComputedRef<string>
  bankerExpression: ComputedRef<BankerExpression>
  bankerConfidence: ComputedRef<number>
  rage: ComputedRef<number>
  noDealCount: ComputedRef<number>
  offerMeta: ComputedRef<BankerOfferMetaState | null>
  isConspirator: ComputedRef<boolean>
  conspiratorAsking: Ref<boolean>
  conspiratorAskAvailable: ComputedRef<boolean>
  conspiratorAskUsed: ComputedRef<boolean>
  conspiratorHints: Ref<Record<number, MessageKey>>
  audienceMembers: Ref<AudienceMemberState[]>
  audienceRecommendations: Ref<AudienceRecommendationState[]>
  audienceReactions: Ref<AudienceReactionState[]>
  recommendedCaseNos: ComputedRef<number[]>
  handleModeConfirm: () => void
  handlePersonaPick: (id: PlayerPersonaEnum) => void
  handlePersonaConfirm: () => void
  handleBankerPick: (id: BankerProfileEnum) => void
  handleBankerConfirm: () => void
  handlePick: (index: number) => void
  beginGame: (forcedK?: number) => void
  resetDraw: () => void
  handleSelect: (caseNo: number) => void
  handleConspiratorAsk: () => void
  handleDeal: () => void
  handleNoDeal: () => void
  handlePersonaAction: (action: PersonaActionEnum) => void
  handleSideBet: () => void
  handleSwap: (shouldSwap: boolean) => void
  dismissResult: () => void
  handleOpenResult: () => void
}

/**
 * 单局游戏会话：玩法卡/角色选择 → 摇奖或揭幕 → 开箱节奏 → 报价决策 → 结算
 * 规则逻辑在 services/GameEngine；本 composable 只负责编排 UI 状态与观众表现
 */
export function useGameSession(): GameSessionApi {
  const sessionSeed = ref<number>(createSeed())
  const setupPhase = ref<SetupPhaseEnum>(SetupPhaseEnum.personaPick)
  /** Reserved for a future multi-mode persona; the current UI keeps exactly one id */
  const selectedModeIds = ref<GameModeEnum[]>([])
  const selectedMode = computed<GameModeEnum | null>(() => selectedModeIds.value[0] ?? null)
  const personaId = ref<PlayerPersonaEnum | null>(null)
  const isAdmin = computed(
    () => !!personaId.value && getPersonaStrategy(personaId.value).adminControls === true
  )

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
  const flashTone = ref<AmountTone | null>(null)
  const bankerRotation = new BankerRotation(createSeed())
  let conspiratorRandom = createRandom(deriveSeed(sessionSeed.value, 'conspirator'))
  const conspiratorUsedRound = ref(0)
  const conspiratorAsking = ref(false)
  const conspiratorHints = ref<Record<number, MessageKey>>({})
  const bankerProfileId = ref<BankerProfileEnum>(BankerProfileEnum.default)
  const bankerProfile = computed(() => getBankerProfile(bankerProfileId.value))
  const isConspirator = computed(
    () => bankerProfileId.value === BankerProfileEnum.conspirator
  )
  let nextBankerLine = createBankerLinePicker()
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
  let modeRandom = createRandom(deriveSeed(sessionSeed.value, 'mode'))

  const mode = computed<GameModeDefinition | null>(() =>
    selectedMode.value ? getGameMode(selectedMode.value) : null
  )
  const persona = computed<PlayerPersonaDefinition | null>(() =>
    personaId.value ? getPlayerPersona(personaId.value) : null
  )
  const modeLabel = computed(() => (mode.value ? t(mode.value.nameKey) : ''))
  const bankerId = bankerProfileId
  const personaLabel = computed(() => (persona.value ? t(persona.value.nameKey) : ''))
  const topPrizeLabel = computed(
    () => `${formatMoney(snapshot.value.topPrize)} ×${snapshot.value.topPrizeRemaining}`
  )

  const phase = computed(() => snapshot.value.phase)
  const conspiratorAskUsed = computed(
    () => conspiratorUsedRound.value === snapshot.value.round
  )
  const conspiratorAskAvailable = computed(
    () =>
      isConspirator.value &&
      phase.value === GamePhaseEnum.opening &&
      snapshot.value.remainingToOpen > 0 &&
      !conspiratorAskUsed.value &&
      !conspiratorAsking.value
  )
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
  const canReopenResult = computed(
    () =>
      phase.value === GamePhaseEnum.settled &&
      resultReady.value &&
      resultDismissed.value &&
      snapshot.value.result !== null
  )
  const tableShaking = computed(() => flashGrade.value === AmountGradeEnum.disaster)
  const bestPrize = computed(() => store.state.record.bestPrize)
  const bankerLine = computed(() => t(bankerLineKey.value))
  const bankerName = computed(() => t(bankerProfile.value.nameKey))
  const bankerTrait = computed(() => t(bankerProfile.value.traitKey))
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
      .map((item) => {
        if (!item.opened && isAdmin.value) {
          const amount = engine.getCaseAmountForHint(item.no)
          if (amount !== null) return { ...item, revealedAmount: amount }
        }
        return hideSettledReveal.value && !item.opened
          ? { ...item, revealedAmount: null, grade: null }
          : item
      })
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
      adminAmount:
        isAdmin.value && playerCase ? engine.getCaseAmountForHint(playerCase.no) : null,
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
        if (!snapshot.value.canDeal) return t('HintGamblerContinue')
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
  const audienceMood = computed(() => {
    if (audienceMembers.value.length === 0) return 3
    return audienceMembers.value.reduce((sum, member) => sum + member.mood, 0) /
      audienceMembers.value.length
  })
  const adviceText = computed<string>(() => {
    if (phase.value !== GamePhaseEnum.offerPending || !persona.value) return ''
    const key = getPersonaStrategy(persona.value.id).getAdviceKey?.({
      offerRatio: offerRatio.value,
      audienceMood: audienceMood.value
    })
    return t(key ?? persona.value.adviceHoldKey)
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

  const flash = (grade: AmountGradeEnum | PayoutGradeEnum, tone: AmountTone): void => {
    flashGrade.value = grade
    flashTone.value = tone
    window.clearTimeout(flashTimer)
    flashTimer = window.setTimeout(() => {
      flashGrade.value = null
      flashTone.value = null
    }, FLASH_MS)
  }

  const clearTimers = (): void => {
    window.clearTimeout(holdTimer)
    window.clearTimeout(revealTimer)
    window.clearTimeout(resultTimer)
    window.clearTimeout(flashTimer)
  }

  /** 把观众情绪同步给引擎；角色策略决定是否把它转成报价修正 */
  const syncAudience = (): void => {
    audienceMembers.value = audienceDirector?.getMembers() ?? []
    const strategy = personaId.value ? getPersonaStrategy(personaId.value) : null
    const mood = audienceDirector?.getAverageMood() ?? 3
    engine.setAudienceDelta(strategy?.getAudienceDelta?.(mood) ?? 0)
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

  /** 回到开局：新一局重新随机玩法、抽角色、抽种子 */
  const resetDraw = (): void => {
    clearTimers()
    sessionSeed.value = createSeed()
    setupPhase.value = SetupPhaseEnum.personaPick
    selectedModeIds.value = []
    personaId.value = null
    modeRandom = createRandom(deriveSeed(sessionSeed.value, 'mode'))
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
    flashTone.value = null
    meltdownActive.value = false
    bankerLineKey.value = 'BankerLineGreeting1'
    bankerProfileId.value = bankerRotation.next()
    nextBankerLine = createBankerLinePicker(bankerProfile.value.lineTone)
    conspiratorRandom = createRandom(deriveSeed(sessionSeed.value, 'conspirator'))
    conspiratorUsedRound.value = 0
    conspiratorAsking.value = false
    conspiratorHints.value = {}
    engine = new GameEngine(
      createModeGameConfig(GameModeEnum.classic, sessionSeed.value),
      GameModeEnum.classic,
      bankerProfileId.value
    )
    clearError()
    refresh()
  }

  /** Randomly choose the mode for this run; no player draw and no admin override */
  const pickRandomMode = (): GameModeEnum => {
    const mode = GAME_MODES[Math.floor(modeRandom.next() * GAME_MODES.length)]
    return mode?.id ?? GameModeEnum.classic
  }

  /** Rebuild the engine with the chosen mode/banker and enter the mode setup */
  function enterModeSetup(): void {
    if (!selectedMode.value) return
    engine = new GameEngine(
      createModeGameConfig(selectedMode.value, sessionSeed.value),
      selectedMode.value,
      bankerProfileId.value
    )
    drawCandidates.value = []
    pickedIndex.value = null
    clearError()
    refresh()
    setupPhase.value = SetupPhaseEnum.modeSetup
    if (mode.value?.setup === 'k-draw') {
      drawCandidates.value = engine.createKDraw()
      pickedIndex.value = null
    }
  }

  const handleModeConfirm = (): void => {
    if (!selectedMode.value || setupPhase.value !== SetupPhaseEnum.modeReveal) return
    if (isAdmin.value) {
      setupPhase.value = SetupPhaseEnum.bankerPick
      return
    }
    const strategy = personaId.value ? getPersonaStrategy(personaId.value) : null
    const forcedK = strategy?.getForcedStartK?.(selectedMode.value) ?? null
    if (forcedK !== null) {
      engine = new GameEngine(
        createModeGameConfig(selectedMode.value, sessionSeed.value),
        selectedMode.value,
        bankerProfileId.value
      )
      refresh()
      beginGame(forcedK)
      return
    }
    enterModeSetup()
  }

  const handlePersonaPick = (id: PlayerPersonaEnum): void => {
    if (setupPhase.value !== SetupPhaseEnum.personaPick) return
    personaId.value = id
  }

  const handlePersonaConfirm = (): void => {
    if (!personaId.value || setupPhase.value !== SetupPhaseEnum.personaPick) return
    const strategy = getPersonaStrategy(personaId.value)
    const forcedK = strategy.getForcedStartK?.(GameModeEnum.classic) ?? null
    // Lucky still locks classic; every other persona (including admin) gets a random mode.
    selectedModeIds.value = [forcedK !== null ? GameModeEnum.classic : pickRandomMode()]
    setupPhase.value = SetupPhaseEnum.modeReveal
  }

  const handleBankerPick = (id: BankerProfileEnum): void => {
    if (setupPhase.value !== SetupPhaseEnum.bankerPick) return
    bankerProfileId.value = id
    nextBankerLine = createBankerLinePicker(bankerProfile.value.lineTone)
  }

  const handleBankerConfirm = (): void => {
    if (setupPhase.value !== SetupPhaseEnum.bankerPick) return
    enterModeSetup()
  }

  const handlePick = (index: number): void => {
    if (pickedIndex.value !== null) return
    pickedIndex.value = index
    playDraw()
  }

  /** 用玩家抽到的 k（经典）、角色强制 k，或固定 1 个顶奖（巨奖）开局 */
  const beginGame = (forcedK?: number): void => {
    if (!selectedMode.value || !personaId.value) return
    const isClassic = mode.value?.setup === 'k-draw'
    const k = forcedK ?? (isClassic ? pickedK.value : undefined)
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
      const strategy = getPersonaStrategy(personaId.value)
      audienceDirector = new AudienceDirector(
        deriveSeed(sessionSeed.value, 'audience'),
        strategy.audienceExtraMembers,
        strategy.audienceRecommendationCount ?? 1
      )
      syncAudience()
    }
    pickBankerLine('greeting')
  }

  /** 选箱阶段点击即选箱，开箱阶段点击即开箱 */
  const handleSelect = (caseNo: number): void => {
    const picking = phase.value === GamePhaseEnum.waitingPlayerCase
    // While the conspirator is waiting for a case, the click selects a whisper target.
    if (!picking && selectConspiratorHint(caseNo)) return
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
      startConspiratorRound()
      return
    }

    removeOpenedConspiratorHints()
    if (snapshot.value.phase === GamePhaseEnum.settled) persistResult()

    const opened = snapshot.value.lastOpened
    if (opened) {
      playGrade(opened.grade)
      const tone = AmountGrader.toneOf(
        opened.amount,
        snapshot.value.amountRows.map((row) => row.amount)
      )
      flash(opened.grade, tone)
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

  const CONSPIRATOR_CLAIM_KEYS: Record<CaseTierEnum, MessageKey> = {
    [CaseTierEnum.top]: 'BankerLineConspiratorClaimTop',
    [CaseTierEnum.high]: 'BankerLineConspiratorClaimHigh',
    [CaseTierEnum.mid]: 'BankerLineConspiratorClaimMid',
    [CaseTierEnum.low]: 'BankerLineConspiratorClaimLow'
  }

  const removeOpenedConspiratorHints = (): void => {
    const next = { ...conspiratorHints.value }
    let changed = false
    for (const key of Object.keys(next)) {
      const caseNo = Number(key)
      if (snapshot.value.cases.some((item) => item.no === caseNo && item.opened)) {
        delete next[caseNo]
        changed = true
      }
    }
    if (changed) conspiratorHints.value = next
  }

  /** Player picked a case after asking; show its persistent whisper without opening it */
  const selectConspiratorHint = (caseNo: number): boolean => {
    if (!conspiratorAsking.value || !isConspirator.value || phase.value !== GamePhaseEnum.opening) {
      return false
    }
    const target = snapshot.value.cases.find((item) => item.no === caseNo)
    if (!target || target.opened || target.isPlayerCase) return false
    const existing = conspiratorHints.value[caseNo]
    if (existing) {
      // Never reroll a case: repeated questions must not improve the truth odds.
      conspiratorAsking.value = false
      bankerLineKey.value = existing
      return true
    }
    const amount = engine.getCaseAmountForHint(caseNo)
    if (amount === null) return false
    const hint = createConspiratorHint(
      amount,
      snapshot.value.amountRows.map((row) => row.amount),
      snapshot.value.topPrize,
      conspiratorRandom
    )
    const textKey = CONSPIRATOR_CLAIM_KEYS[hint.claimTier]
    conspiratorHints.value = { ...conspiratorHints.value, [caseNo]: textKey }
    conspiratorAsking.value = false
    bankerLineKey.value = textKey
    return true
  }

  const handleConspiratorAsk = (): void => {
    if (!conspiratorAskAvailable.value) return
    conspiratorUsedRound.value = snapshot.value.round
    conspiratorAsking.value = true
    bankerLineKey.value = 'ConspiratorAskPrompt'
  }

  /** A new round clears the question prompt; previous case hints persist until end of game */
  const startConspiratorRound = (): void => {
    conspiratorAsking.value = false
  }

  const handleDeal = (): void => {
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
      startConspiratorRound()
    }

    const currentRage = snapshot.value.rage
    if (currentRage >= RAGE_TIER_FURIOUS) pickBankerLine('noDealFurious')
    else if (currentRage >= RAGE_TIER_ANGRY) pickBankerLine('noDealAngry')
    else if (currentRage >= RAGE_TIER_ANNOYED) pickBankerLine('noDealAnnoyed')
    else pickBankerLine('noDealCalm')
  }

  /** 主持人的造势/圆场：引擎改报价和怒气，会话层落观众情绪 */
  const handlePersonaAction = (action: PersonaActionEnum): void => {
    const result = engine.usePersonaAction(action)
    if (!result.ok) {
      reject(result.error)
      return
    }
    if (audienceDirector && result.audienceMoodDelta !== 0) {
      audienceDirector.adjustMood(result.audienceMoodDelta)
    }
    clearError()
    syncAudience()
    refresh()
  }

  /** 赌场老板：押下一箱不是顶奖 */
  const handleSideBet = (): void => {
    const result = engine.placeSideBet()
    if (!result.ok) {
      reject(result.error)
      return
    }
    clearError()
    refresh()
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

  const handleOpenResult = (): void => {
    if (canReopenResult.value) resultDismissed.value = false
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
    flashTone.value = null

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
        const prize = snapshot.value.result?.prize ?? 0
        const tone = AmountGrader.toneOf(
          prize,
          snapshot.value.amountRows.map((row) => row.amount)
        )
        playPayout(grade)
        flash(grade, tone)
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
    selectedMode,
    bankerId,
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
    flashTone,
    bankerLine,
    bankerName,
    bankerTrait,
    bankerExpression,
    bankerConfidence,
    rage,
    noDealCount,
    offerMeta,
    isConspirator,
    conspiratorAsking,
    conspiratorAskAvailable,
    conspiratorAskUsed,
    conspiratorHints,
    audienceMembers,
    audienceRecommendations,
    audienceReactions,
    recommendedCaseNos,
    handleModeConfirm,
    handlePersonaPick,
    handlePersonaConfirm,
    handleBankerPick,
    handleBankerConfirm,
    handlePick,
    beginGame,
    resetDraw,
    handleSelect,
    handleConspiratorAsk,
    handleDeal,
    handleNoDeal,
    handlePersonaAction,
    handleSideBet,
    handleSwap,
    dismissResult,
    canReopenResult,
    handleOpenResult
  }
}
