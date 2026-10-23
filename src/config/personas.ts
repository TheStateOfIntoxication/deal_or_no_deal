import type { MessageKey } from '@/language'
import { PlayerPersonaEnum } from '@/types/game'

/** Static definition of one player character card */
export interface PlayerPersonaDefinition {
  id: PlayerPersonaEnum
  nameKey: MessageKey
  traitKey: MessageKey
  adviceDealKey: MessageKey
  adviceHoldKey: MessageKey
  emoji: string
  tone: 'blue' | 'red' | 'green' | 'gold' | 'violet'
  difficulty: number
}

/** Gambler final case: top prize pays 2×, other amounts pay 10% */
export const GAMBLER_TOP_MULTIPLIER = 2
export const GAMBLER_CONSOLATION_RATE = 0.1
/** Pragmatic is punished for rejecting an offer at/above this share of EV */
export const PRAGMATIC_GREED_THRESHOLD = 0.8
/** Pragmatic next-offer penalty when punished */
export const PRAGMATIC_PENALTY = 0.03
/** Maximum pragmatic penalties per game */
export const PRAGMATIC_MAX_PENALTIES = 2
/** Conformist: each mood point away from neutral shifts the offer by 1% */
export const CONFORMIST_AUDIENCE_SCALE = 0.01
/** Conformist audience adjustment cap, both directions */
export const CONFORMIST_AUDIENCE_CAP = 0.02
/** Pragmatic advice threshold (offer / EV) */
export const PRAGMATIC_ADVICE_THRESHOLD = 0.65
/** Raiser: every banker offer is lifted by this ratio */
export const RAISER_OFFER_BOOST = 0.08
/** Closer: final non-top case pays this share */
export const CLOSER_FINAL_RATE = 0.5
/** Restorer: only trigger while at least this many cases remain (before the final two) */
export const RESTORER_MIN_REMAINING = 5
/** Host: one-off offer multiplier when hyping the crowd */
export const HOST_HYPE_OFFER = 1.05
/** Host: one-off offer multiplier when calming the banker */
export const HOST_CALM_OFFER = 0.98
/** Host: rage gained/lost by each action */
export const HOST_HYPE_RAGE = 20
export const HOST_CALM_RAGE = 25
/** Host: audience mood gained/lost by each action */
export const HOST_HYPE_AUDIENCE = 2
export const HOST_CALM_AUDIENCE = -1
/** Holdout: only low offers create resolve stacks */
export const HOLDOUT_OFFER_THRESHOLD = 0.55
/** Holdout: each stack adds this multiplier delta to future offers */
export const HOLDOUT_STACK_BONUS = 0.03
/** Holdout: maximum resolve stacks per game */
export const HOLDOUT_MAX_STACKS = 3
/** Lucky: classic mode skips the k draw and starts with this many $1M cases */
export const LUCKY_TOP_PRIZE_COUNT = 13
/** Rogue: only the first N total opened cases can trigger the instant win */
export const ROGUE_INSTANT_WINDOW = 2
/** Rogue: chance to instantly win when a top prize is opened inside the window */
export const ROGUE_INSTANT_WIN_CHANCE = 0.5

export const PLAYER_PERSONAS: PlayerPersonaDefinition[] = [
  {
    id: PlayerPersonaEnum.pragmatic,
    nameKey: 'PersonaPragmaticName',
    traitKey: 'PersonaPragmaticTrait',
    adviceDealKey: 'PersonaPragmaticAdviceDeal',
    adviceHoldKey: 'PersonaPragmaticAdviceHold',
    emoji: '🧮',
    tone: 'blue',
    difficulty: 1
  },
  {
    id: PlayerPersonaEnum.gambler,
    nameKey: 'PersonaGamblerName',
    traitKey: 'PersonaGamblerTrait',
    adviceDealKey: 'PersonaGamblerAdvice',
    adviceHoldKey: 'PersonaGamblerAdvice',
    emoji: '🎲',
    tone: 'red',
    difficulty: 3
  },
  {
    id: PlayerPersonaEnum.conformist,
    nameKey: 'PersonaConformistName',
    traitKey: 'PersonaConformistTrait',
    adviceDealKey: 'PersonaConformistAdviceDeal',
    adviceHoldKey: 'PersonaConformistAdviceHold',
    emoji: '👥',
    tone: 'green',
    difficulty: 2
  },
  {
    id: PlayerPersonaEnum.restorer,
    nameKey: 'PersonaRestorerName',
    traitKey: 'PersonaRestorerTrait',
    adviceDealKey: 'PersonaRestorerAdvice',
    adviceHoldKey: 'PersonaRestorerAdvice',
    emoji: '🪄',
    tone: 'violet',
    difficulty: 2
  },
  {
    id: PlayerPersonaEnum.raiser,
    nameKey: 'PersonaRaiserName',
    traitKey: 'PersonaRaiserTrait',
    adviceDealKey: 'PersonaRaiserAdvice',
    adviceHoldKey: 'PersonaRaiserAdvice',
    emoji: '📈',
    tone: 'gold',
    difficulty: 1
  },
  {
    id: PlayerPersonaEnum.closer,
    nameKey: 'PersonaCloserName',
    traitKey: 'PersonaCloserTrait',
    adviceDealKey: 'PersonaCloserAdvice',
    adviceHoldKey: 'PersonaCloserAdvice',
    emoji: '🧾',
    tone: 'blue',
    difficulty: 2
  },
  {
    id: PlayerPersonaEnum.host,
    nameKey: 'PersonaHostName',
    traitKey: 'PersonaHostTrait',
    adviceDealKey: 'PersonaHostAdvice',
    adviceHoldKey: 'PersonaHostAdvice',
    emoji: '🎤',
    tone: 'gold',
    difficulty: 2
  },
  {
    id: PlayerPersonaEnum.holdout,
    nameKey: 'PersonaHoldoutName',
    traitKey: 'PersonaHoldoutTrait',
    adviceDealKey: 'PersonaHoldoutAdvice',
    adviceHoldKey: 'PersonaHoldoutAdvice',
    emoji: '🧱',
    tone: 'red',
    difficulty: 1
  },
  {
    id: PlayerPersonaEnum.lucky,
    nameKey: 'PersonaLuckyName',
    traitKey: 'PersonaLuckyTrait',
    adviceDealKey: 'PersonaLuckyAdvice',
    adviceHoldKey: 'PersonaLuckyAdvice',
    emoji: '🍀',
    tone: 'green',
    difficulty: 1
  },
  {
    id: PlayerPersonaEnum.nagger,
    nameKey: 'PersonaNaggerName',
    traitKey: 'PersonaNaggerTrait',
    adviceDealKey: 'PersonaNaggerAdvice',
    adviceHoldKey: 'PersonaNaggerAdvice',
    emoji: '🗣️',
    tone: 'violet',
    difficulty: 2
  },
  {
    id: PlayerPersonaEnum.rogue,
    nameKey: 'PersonaRogueName',
    traitKey: 'PersonaRogueTrait',
    adviceDealKey: 'PersonaRogueAdvice',
    adviceHoldKey: 'PersonaRogueAdvice',
    emoji: '🦹',
    tone: 'red',
    difficulty: 3
  },
  {
    id: PlayerPersonaEnum.admin,
    nameKey: 'PersonaAdminName',
    traitKey: 'PersonaAdminTrait',
    adviceDealKey: 'PersonaAdminAdvice',
    adviceHoldKey: 'PersonaAdminAdvice',
    emoji: '🛠️',
    tone: 'blue',
    difficulty: 1
  }
]

const PERSONA_MAP = new Map(PLAYER_PERSONAS.map((persona) => [persona.id, persona]))

export function getPlayerPersona(id: PlayerPersonaEnum): PlayerPersonaDefinition {
  const persona = PERSONA_MAP.get(id)
  if (!persona) throw new Error(`Unknown persona: ${id}`)
  return persona
}
