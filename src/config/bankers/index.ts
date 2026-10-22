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

/** Placeholder for the future charity banker; not selectable yet */
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

const BANKER_PROFILES = [DEFAULT_BANKER_PROFILE, CHARITY_BANKER_PROFILE]
const BANKER_PROFILE_MAP = new Map(BANKER_PROFILES.map((profile) => [profile.id, profile]))

export function getBankerProfile(id: BankerProfileEnum): BankerProfile {
  const profile = BANKER_PROFILE_MAP.get(id)
  if (!profile) throw new Error(`Unknown banker profile: ${id}`)
  return profile
}
