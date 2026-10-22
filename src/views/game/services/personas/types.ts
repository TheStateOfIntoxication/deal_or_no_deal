import type { MessageKey } from '@/language'
import type { DecidedByType, PersonaActionEnum, PlayerPersonaEnum } from '@/types/game'

/** Mutable state owned by one persona for the current game */
export interface PersonaRuntimeState {
  actionUsed: boolean
  stacks: number
  pendingPenalty: boolean
  penaltiesUsed: number
  restorerUsed: boolean
}

export interface PersonaOfferContext {
  round: number
  offer: number
  ev: number
  remainingAmounts: readonly number[]
  topPrize: number
  rage: number
}

export type PersonaNoDealContext = PersonaOfferContext
export type PersonaActionContext = PersonaOfferContext

export interface PersonaRemainingCase {
  caseNo: number
  amount: number
  isPlayerCase: boolean
}

export interface PersonaCaseContext {
  topPrize: number
  playerCaseNo: number | null
  remainingCases: readonly PersonaRemainingCase[]
}

/** Pool mutation requested after a case is opened */
export interface PersonaCaseEffect {
  candidateCaseNos: number[]
  amount: number
}

export interface PersonaPrizeContext {
  basePrize: number
  decidedBy: DecidedByType
  topPrize: number
  highestOffer: number
}

/** `prize` excludes honorBonus; the engine adds both to the final result */
export interface PersonaPrizeResult {
  prize: number
  honorBonus: number
}

export interface PersonaActionResult {
  offerMultiplier: number
  rageDelta: number
  audienceMoodDelta: number
  labelKey: MessageKey
}

export interface PersonaActionView {
  id: PersonaActionEnum
  labelKey: MessageKey
  hintKey: MessageKey
  enabled: boolean
}

export interface PersonaAdviceContext {
  offerRatio: number
  audienceMood: number
}

/**
 * A persona strategy owns only its own behavior and state.
 * The engine remains the single state machine and applies the returned effects.
 */
export interface PersonaStrategy {
  id: PlayerPersonaEnum
  canDeal: boolean
  audienceExtraMembers: number
  audienceRecommendationCount?: number
  createState: () => PersonaRuntimeState
  getAudienceDelta?: (mood: number) => number
  onNoDeal?: (ctx: PersonaNoDealContext, state: PersonaRuntimeState) => void
  getOfferDelta?: (ctx: PersonaOfferContext, state: PersonaRuntimeState) => number
  getRaise?: (ctx: PersonaOfferContext, state: PersonaRuntimeState) => number
  onOfferComputed?: (ctx: PersonaOfferContext, state: PersonaRuntimeState) => void
  onCaseOpened?: (
    ctx: PersonaCaseContext,
    state: PersonaRuntimeState
  ) => PersonaCaseEffect | null
  getPrize?: (ctx: PersonaPrizeContext, state: PersonaRuntimeState) => PersonaPrizeResult | null
  getStackBonus?: (state: PersonaRuntimeState) => number
  getActions?: (ctx: PersonaActionContext, state: PersonaRuntimeState) => PersonaActionView[]
  performAction?: (
    action: PersonaActionEnum,
    ctx: PersonaActionContext,
    state: PersonaRuntimeState
  ) => PersonaActionResult | null
  getAdviceKey?: (ctx: PersonaAdviceContext) => MessageKey | null
}
