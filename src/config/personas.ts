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
  tone: 'blue' | 'red' | 'green'
  difficulty: number
}

/** Gambler cannot deal before this round; round 9 is the final offer */
export const GAMBLER_DEAL_LOCK_ROUNDS = 8
/** Gambler final prize bonus, floored to cents */
export const GAMBLER_BONUS_RATE = 0.15
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
    adviceDealKey: 'PersonaGamblerFinal',
    adviceHoldKey: 'PersonaGamblerLocked',
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
  }
]

const PERSONA_MAP = new Map(PLAYER_PERSONAS.map((persona) => [persona.id, persona]))

export function getPlayerPersona(id: PlayerPersonaEnum): PlayerPersonaDefinition {
  const persona = PERSONA_MAP.get(id)
  if (!persona) throw new Error(`Unknown persona: ${id}`)
  return persona
}
