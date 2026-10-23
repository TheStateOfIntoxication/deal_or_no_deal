import type { MessageKey } from '@/language'
import type { BankerPlanEnum } from '@/types/game'

/** Banker character identities */
export enum BankerProfileEnum {
  default = 'default',
  charity = 'charity',
  conspirator = 'conspirator',
  collector = 'collector',
  casino = 'casino',
  hothead = 'hothead'
}

/** One banker personality: plan bias, line tone, and future offer mode */
export interface BankerProfile {
  id: BankerProfileEnum
  nameKey: MessageKey
  traitKey: MessageKey
  emoji: string
  tone: 'gold' | 'violet' | 'green'
  /** Overrides merged over the default plan weights */
  planWeights: Partial<Record<BankerPlanEnum, number>>
  /** curve = current formula, highest = charity-style top ratio */
  offerMode: 'curve' | 'highest'
  /** sharp / gentle line pools */
  lineTone: 'sharp' | 'gentle'
}
