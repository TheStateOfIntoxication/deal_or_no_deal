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
  }
]

const PERSONA_MAP = new Map(PLAYER_PERSONAS.map((persona) => [persona.id, persona]))

export function getPlayerPersona(id: PlayerPersonaEnum): PlayerPersonaDefinition {
  const persona = PERSONA_MAP.get(id)
  if (!persona) throw new Error(`Unknown persona: ${id}`)
  return persona
}
