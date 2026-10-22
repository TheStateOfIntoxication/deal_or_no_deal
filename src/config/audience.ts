import type { MessageKey } from '@/language'
import { AudienceTraitEnum } from '@/types/game'

/** One audience member archetype; names are i18n keys, never real people */
export interface AudienceTemplate {
  nameKey: MessageKey
  emoji: string
  trait: AudienceTraitEnum
}

export const AUDIENCE_TEMPLATES: AudienceTemplate[] = [
  { nameKey: 'AudienceName1', emoji: '👩‍🦱', trait: AudienceTraitEnum.hype },
  { nameKey: 'AudienceName2', emoji: '🧑‍💼', trait: AudienceTraitEnum.cautious },
  { nameKey: 'AudienceName3', emoji: '👴', trait: AudienceTraitEnum.cautious },
  { nameKey: 'AudienceName4', emoji: '👧', trait: AudienceTraitEnum.hype },
  { nameKey: 'AudienceName5', emoji: '🧔', trait: AudienceTraitEnum.gambler },
  { nameKey: 'AudienceName6', emoji: '👩‍🎤', trait: AudienceTraitEnum.superstitious },
  { nameKey: 'AudienceName7', emoji: '🧓', trait: AudienceTraitEnum.cautious },
  { nameKey: 'AudienceName8', emoji: '🧑‍🎓', trait: AudienceTraitEnum.gambler }
]

/** Random audience count before the conformist bonus */
export const AUDIENCE_MIN_COUNT = 3
export const AUDIENCE_MAX_COUNT = 5
/** Conformist gets one extra audience member */
export const AUDIENCE_CONFORMIST_BONUS = 1
