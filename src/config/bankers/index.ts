import { BankerPlanEnum } from '@/types/game'
import { BankerProfileEnum } from './types'

export { BankerProfileEnum } from './types'
export type { BankerProfile } from './types'
import type { BankerProfile } from './types'

/** Current banker: sharp, punitive, lowball-friendly */
export const DEFAULT_BANKER_PROFILE: BankerProfile = {
  id: BankerProfileEnum.default,
  nameKey: 'BankerTitle',
  traitKey: 'BankerDefaultTrait',
  emoji: '🎩',
  tone: 'gold',
  planWeights: {},
  offerMode: 'curve',
  lineTone: 'sharp'
}

/** Charity banker: generous base multiplier and gentle lines */
export const CHARITY_BANKER_PROFILE: BankerProfile = {
  id: BankerProfileEnum.charity,
  nameKey: 'BankerCharityName',
  traitKey: 'BankerCharityTrait',
  emoji: '🤝',
  tone: 'green',
  planWeights: {
    [BankerPlanEnum.steady]: 2,
    [BankerPlanEnum.lowball]: 0,
    [BankerPlanEnum.rebate]: 4,
    [BankerPlanEnum.generous]: 6,
    [BankerPlanEnum.finalPush]: 2
  },
  offerMode: 'highest',
  lineTone: 'gentle'
}

export const CONSPIRATOR_BANKER_PROFILE: BankerProfile = {
  id: BankerProfileEnum.conspirator,
  nameKey: 'BankerConspiratorName',
  traitKey: 'BankerConspiratorTrait',
  emoji: '🕵️',
  tone: 'violet',
  planWeights: {},
  offerMode: 'curve',
  lineTone: 'sharp'
}

export const COLLECTOR_BANKER_PROFILE: BankerProfile = {
  id: BankerProfileEnum.collector,
  nameKey: 'BankerCollectorName',
  traitKey: 'BankerCollectorTrait',
  emoji: '🏺',
  tone: 'violet',
  planWeights: {},
  offerMode: 'curve',
  lineTone: 'sharp'
}

export const CASINO_BANKER_PROFILE: BankerProfile = {
  id: BankerProfileEnum.casino,
  nameKey: 'BankerCasinoName',
  traitKey: 'BankerCasinoTrait',
  emoji: '🎰',
  tone: 'gold',
  planWeights: {},
  offerMode: 'curve',
  lineTone: 'sharp'
}

export const BANKER_PROFILES = [
  DEFAULT_BANKER_PROFILE,
  CHARITY_BANKER_PROFILE,
  CONSPIRATOR_BANKER_PROFILE,
  COLLECTOR_BANKER_PROFILE,
  CASINO_BANKER_PROFILE
]
export const GAME_BANKER_IDS: BankerProfileEnum[] = BANKER_PROFILES.map((profile) => profile.id)

/** Rotation weights: default remains the most common banker */
export const BANKER_ROTATION_WEIGHTS: Record<BankerProfileEnum, number> = {
  [BankerProfileEnum.default]: 4,
  [BankerProfileEnum.charity]: 1,
  [BankerProfileEnum.conspirator]: 1,
  [BankerProfileEnum.collector]: 1,
  [BankerProfileEnum.casino]: 1
}
const BANKER_PROFILE_MAP = new Map(BANKER_PROFILES.map((profile) => [profile.id, profile]))

export function getBankerProfile(id: BankerProfileEnum): BankerProfile {
  const profile = BANKER_PROFILE_MAP.get(id)
  if (!profile) throw new Error(`Unknown banker profile: ${id}`)
  return profile
}
