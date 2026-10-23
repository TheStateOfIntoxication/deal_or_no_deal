import type { MessageKey } from '@/language'
import type { BankerProfileEnum } from '@/config/bankers'

export type SideBetOutcome = 'win' | 'lose'

/** Runtime state owned by one banker for the current game */
export interface BankerRuntimeState {
  sideBetUsed: number
  sideBetRound: number
  sideBetPending: boolean
  sideBetOutcome: SideBetOutcome | null
}

export interface BankerQuirkContext {
  offer: number
  round: number
  topPrize: number
  topPrizeRemaining: number
  lower: number
  upper: number
}

export interface BankerQuirkResult {
  factor: number
  labelKey: MessageKey
}

export interface BankerForcedOpenRule {
  /** Rage must be above this percentage (0-100) */
  rageThreshold: number
  chance: number
  /** Number of highest-value candidates eligible below max rage */
  highCandidateCount: number
  resetRage: boolean
}

export interface BankerSideBetRule {
  maxUses: number
  winFactor: number
  lossFactor: number
  labelKey: MessageKey
  winLabelKey: MessageKey
  lossLabelKey: MessageKey
}

/**
 * A banker strategy describes only the banker-specific offer/state behavior.
 * Plan weights, offer mode, portrait and i18n stay in the profile config.
 */
export interface BankerStrategy {
  id: BankerProfileEnum
  sideBet?: BankerSideBetRule
  forcedOpen?: BankerForcedOpenRule
  getQuirk?: (
    ctx: BankerQuirkContext,
    state: BankerRuntimeState
  ) => BankerQuirkResult | null
  getStatusKey?: (ctx: BankerQuirkContext) => MessageKey | null
}
