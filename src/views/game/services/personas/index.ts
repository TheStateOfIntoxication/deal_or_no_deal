import { AUDIENCE_CONFORMIST_BONUS } from '@/config/audience'
import { BANKER_HONOR_RATE } from '@/config/banker'
import {
  CLOSER_FINAL_RATE,
  CONFORMIST_AUDIENCE_CAP,
  CONFORMIST_AUDIENCE_SCALE,
  GAMBLER_CONSOLATION_RATE,
  GAMBLER_TOP_MULTIPLIER,
  HOLDOUT_MAX_STACKS,
  HOLDOUT_OFFER_THRESHOLD,
  HOLDOUT_STACK_BONUS,
  HOST_CALM_AUDIENCE,
  HOST_CALM_OFFER,
  HOST_CALM_RAGE,
  HOST_HYPE_AUDIENCE,
  HOST_HYPE_OFFER,
  HOST_HYPE_RAGE,
  LUCKY_TOP_PRIZE_COUNT,
  PRAGMATIC_ADVICE_THRESHOLD,
  PRAGMATIC_GREED_THRESHOLD,
  PRAGMATIC_MAX_PENALTIES,
  PRAGMATIC_PENALTY,
  RAISER_OFFER_BOOST,
  RESTORER_MIN_REMAINING,
  ROGUE_INSTANT_WINDOW,
  ROGUE_INSTANT_WIN_CHANCE
} from '@/config/personas'
import { GameModeEnum, PersonaActionEnum, PlayerPersonaEnum } from '@/types/game'
import type {
  PersonaActionContext,
  PersonaActionView,
  PersonaCaseContext,
  PersonaCaseEffect,
  PersonaPrizeContext,
  PersonaPrizeResult,
  PersonaRuntimeState,
  PersonaStrategy
} from './types'

function createRuntimeState(): PersonaRuntimeState {
  return {
    actionUsed: false,
    stacks: 0,
    pendingPenalty: false,
    penaltiesUsed: 0,
    restorerUsed: false,
    openedCount: 0
  }
}

const PRAGMATIC: PersonaStrategy = {
  id: PlayerPersonaEnum.pragmatic,
  canDeal: true,
  audienceExtraMembers: 0,
  createState: createRuntimeState,
  onNoDeal(ctx, state) {
    if (
      ctx.ev > 0 &&
      ctx.offer / ctx.ev >= PRAGMATIC_GREED_THRESHOLD &&
      state.penaltiesUsed < PRAGMATIC_MAX_PENALTIES
    ) {
      state.pendingPenalty = true
    }
  },
  getOfferDelta(_ctx, state) {
    return state.pendingPenalty ? -PRAGMATIC_PENALTY : 0
  },
  onOfferComputed(_ctx, state) {
    if (!state.pendingPenalty) return
    state.penaltiesUsed += 1
    state.pendingPenalty = false
  },
  getAdviceKey(ctx) {
    return ctx.offerRatio >= PRAGMATIC_ADVICE_THRESHOLD
      ? 'PersonaPragmaticAdviceDeal'
      : 'PersonaPragmaticAdviceHold'
  }
}

const GAMBLER: PersonaStrategy = {
  id: PlayerPersonaEnum.gambler,
  canDeal: false,
  audienceExtraMembers: 0,
  createState: createRuntimeState,
  getPrize(ctx: PersonaPrizeContext): PersonaPrizeResult {
    if (ctx.decidedBy === 'deal') return { prize: ctx.basePrize, honorBonus: 0 }
    const prize =
      ctx.basePrize === ctx.topPrize
        ? Math.floor(ctx.basePrize * GAMBLER_TOP_MULTIPLIER)
        : Math.floor(ctx.basePrize * GAMBLER_CONSOLATION_RATE)
    const honorBonus =
      ctx.highestOffer > 0 && prize > ctx.highestOffer
        ? Math.floor(prize * BANKER_HONOR_RATE)
        : 0
    return { prize, honorBonus }
  }
}

const CONFORMIST: PersonaStrategy = {
  id: PlayerPersonaEnum.conformist,
  canDeal: true,
  audienceExtraMembers: AUDIENCE_CONFORMIST_BONUS,
  audienceRecommendationCount: 2,
  createState: createRuntimeState,
  getAudienceDelta(mood) {
    const raw = (mood - 3) * CONFORMIST_AUDIENCE_SCALE
    return Math.min(CONFORMIST_AUDIENCE_CAP, Math.max(-CONFORMIST_AUDIENCE_CAP, raw))
  },
  getAdviceKey(ctx) {
    if (ctx.audienceMood >= 3.5) return 'PersonaConformistAdviceHold'
    if (ctx.audienceMood <= 2.5) return 'PersonaConformistAdviceDeal'
    return 'PersonaConformistAdviceWait'
  }
}

const RESTORER: PersonaStrategy = {
  id: PlayerPersonaEnum.restorer,
  canDeal: true,
  audienceExtraMembers: 0,
  createState: createRuntimeState,
  onCaseOpened(ctx: PersonaCaseContext, state): PersonaCaseEffect | null {
    if (state.restorerUsed) return null
    if (ctx.remainingCases.length < RESTORER_MIN_REMAINING) return null
    if (ctx.remainingCases.some((item) => item.amount === ctx.topPrize)) return null

    const candidates = ctx.remainingCases.filter((item) => !item.isPlayerCase)
    if (candidates.length === 0) return null
    const largest = Math.max(...candidates.map((item) => item.amount))
    const candidateCaseNos = candidates
      .filter((item) => item.amount === largest)
      .map((item) => item.caseNo)
    state.restorerUsed = true
    return { candidateCaseNos, amount: ctx.topPrize }
  }
}

const RAISER: PersonaStrategy = {
  id: PlayerPersonaEnum.raiser,
  canDeal: true,
  audienceExtraMembers: 0,
  createState: createRuntimeState,
  getRaise() {
    return RAISER_OFFER_BOOST
  }
}

const CLOSER: PersonaStrategy = {
  id: PlayerPersonaEnum.closer,
  canDeal: true,
  audienceExtraMembers: 0,
  createState: createRuntimeState,
  getPrize(ctx: PersonaPrizeContext): PersonaPrizeResult | null {
    if (ctx.decidedBy === 'deal' || ctx.basePrize === ctx.topPrize) return null
    return { prize: Math.floor(ctx.basePrize * CLOSER_FINAL_RATE), honorBonus: 0 }
  }
}

const HOST: PersonaStrategy = {
  id: PlayerPersonaEnum.host,
  canDeal: true,
  audienceExtraMembers: 0,
  createState: createRuntimeState,
  getActions(_ctx: PersonaActionContext, state): PersonaActionView[] {
    if (state.actionUsed) return []
    return [
      {
        id: PersonaActionEnum.hostHype,
        labelKey: 'PersonaHostHype',
        hintKey: 'PersonaHostHypeHint',
        enabled: true
      },
      {
        id: PersonaActionEnum.hostCalm,
        labelKey: 'PersonaHostCalm',
        hintKey: 'PersonaHostCalmHint',
        enabled: true
      }
    ]
  },
  performAction(action, _ctx, state) {
    if (state.actionUsed) return null
    if (action === PersonaActionEnum.hostHype) {
      state.actionUsed = true
      return {
        offerMultiplier: HOST_HYPE_OFFER,
        rageDelta: HOST_HYPE_RAGE,
        audienceMoodDelta: HOST_HYPE_AUDIENCE,
        labelKey: 'PersonaHostHype'
      }
    }
    if (action === PersonaActionEnum.hostCalm) {
      state.actionUsed = true
      return {
        offerMultiplier: HOST_CALM_OFFER,
        rageDelta: -HOST_CALM_RAGE,
        audienceMoodDelta: HOST_CALM_AUDIENCE,
        labelKey: 'PersonaHostCalm'
      }
    }
    return null
  }
}

const HOLDOUT: PersonaStrategy = {
  id: PlayerPersonaEnum.holdout,
  canDeal: true,
  audienceExtraMembers: 0,
  createState: createRuntimeState,
  onNoDeal(ctx, state) {
    if (ctx.ev <= 0 || state.stacks >= HOLDOUT_MAX_STACKS) return
    if (ctx.offer / ctx.ev < HOLDOUT_OFFER_THRESHOLD) state.stacks += 1
  },
  getOfferDelta(_ctx, state) {
    return state.stacks * HOLDOUT_STACK_BONUS
  },
  getStackBonus(state) {
    return state.stacks * HOLDOUT_STACK_BONUS
  }
}

const NAGGER: PersonaStrategy = {
  id: PlayerPersonaEnum.nagger,
  canDeal: true,
  audienceExtraMembers: 0,
  createState: createRuntimeState,
  getAutoOpenCaseNos(ctx) {
    const selectable = ctx.remainingCases.filter((item) => !item.isPlayerCase)
    if (selectable.length === 0) return []
    const lowest = Math.min(...selectable.map((item) => item.amount))
    if (ctx.openedAmount > lowest) return []
    const candidates = selectable.filter((item) => item.amount !== ctx.topPrize)
    if (candidates.length === 0) return []
    const largest = Math.max(...candidates.map((item) => item.amount))
    return candidates
      .filter((item) => item.amount === largest)
      .map((item) => item.caseNo)
  }
}

const ROGUE: PersonaStrategy = {
  id: PlayerPersonaEnum.rogue,
  canDeal: true,
  audienceExtraMembers: 0,
  createState: createRuntimeState,
  getInstantWinChance(ctx, state) {
    if (state.openedCount > ROGUE_INSTANT_WINDOW) return 0
    if (ctx.openedAmount !== ctx.topPrize) return 0
    return ROGUE_INSTANT_WIN_CHANCE
  }
}

const LUCKY: PersonaStrategy = {
  id: PlayerPersonaEnum.lucky,
  canDeal: true,
  audienceExtraMembers: 0,
  createState: createRuntimeState,
  getForcedStartK(modeId) {
    return modeId === GameModeEnum.classic ? LUCKY_TOP_PRIZE_COUNT : null
  }
}

const ADMIN: PersonaStrategy = {
  id: PlayerPersonaEnum.admin,
  canDeal: true,
  adminControls: true,
  audienceExtraMembers: 0,
  createState: createRuntimeState
}

const PERSONA_STRATEGIES: Record<PlayerPersonaEnum, PersonaStrategy> = {
  [PlayerPersonaEnum.pragmatic]: PRAGMATIC,
  [PlayerPersonaEnum.gambler]: GAMBLER,
  [PlayerPersonaEnum.conformist]: CONFORMIST,
  [PlayerPersonaEnum.restorer]: RESTORER,
  [PlayerPersonaEnum.raiser]: RAISER,
  [PlayerPersonaEnum.closer]: CLOSER,
  [PlayerPersonaEnum.host]: HOST,
  [PlayerPersonaEnum.holdout]: HOLDOUT,
  [PlayerPersonaEnum.lucky]: LUCKY,
  [PlayerPersonaEnum.nagger]: NAGGER,
  [PlayerPersonaEnum.rogue]: ROGUE,
  [PlayerPersonaEnum.admin]: ADMIN
}

export function getPersonaStrategy(id: PlayerPersonaEnum): PersonaStrategy {
  const strategy = PERSONA_STRATEGIES[id]
  if (!strategy) throw new Error(`Unknown persona strategy: ${id}`)
  return strategy
}
