import {
  AUDIENCE_CONFORMIST_BONUS,
  AUDIENCE_MAX_COUNT,
  AUDIENCE_MIN_COUNT,
  AUDIENCE_TEMPLATES
} from '@/config/audience'
import {
  CONFORMIST_AUDIENCE_CAP,
  CONFORMIST_AUDIENCE_SCALE
} from '@/config/personas'
import {
  AUDIENCE_GUILT_SHARE,
  AUDIENCE_HAPPY_SHARE,
  AUDIENCE_MOOD_MAX,
  AUDIENCE_MOOD_MIN,
  AUDIENCE_MOOD_START
} from '@/config/presentation'
import {
  AudienceReactionEnum,
  PlayerPersonaEnum
} from '@/types/game'
import { createRandom, shuffle } from '@/utils/random'
import type { RandomSource } from '@/utils/random'
import type {
  AudienceMemberState,
  AudienceRecommendationState,
  AudienceReactionState,
  CaseState
} from '../types'

/**
 * Audience simulation. Recommendations are chosen from case NUMBERS only;
 * the director must never read case amounts, otherwise it would leak information.
 */
export class AudienceDirector {
  private readonly random: RandomSource
  private readonly members: AudienceMemberState[]
  private readonly persona: PlayerPersonaEnum
  private recommendations: AudienceRecommendationState[] = []

  constructor(seed: number, persona: PlayerPersonaEnum) {
    this.random = createRandom(seed)
    this.persona = persona

    const baseCount =
      AUDIENCE_MIN_COUNT +
      Math.floor(this.random.next() * (AUDIENCE_MAX_COUNT - AUDIENCE_MIN_COUNT + 1))
    const count = baseCount + (persona === PlayerPersonaEnum.conformist ? AUDIENCE_CONFORMIST_BONUS : 0)
    const templates = shuffle(AUDIENCE_TEMPLATES, this.random).slice(0, count)
    this.members = templates.map((template, index) => ({
      id: index + 1,
      nameKey: template.nameKey,
      emoji: template.emoji,
      trait: template.trait,
      mood: AUDIENCE_MOOD_START
    }))
  }

  getMembers(): AudienceMemberState[] {
    return this.members.map((member) => ({ ...member }))
  }

  getAverageMood(): number {
    if (this.members.length === 0) return AUDIENCE_MOOD_START
    return this.members.reduce((sum, member) => sum + member.mood, 0) / this.members.length
  }

  /** Conformist offer delta; 0 for every other persona */
  getOfferDelta(): number {
    if (this.persona !== PlayerPersonaEnum.conformist) return 0
    const raw = (this.getAverageMood() - AUDIENCE_MOOD_START) * CONFORMIST_AUDIENCE_SCALE
    return Math.min(CONFORMIST_AUDIENCE_CAP, Math.max(-CONFORMIST_AUDIENCE_CAP, raw))
  }

  /**
   * One recommendation per round (two for the conformist).
   * Only eligibility (opened / player case) and case numbers are used.
   */
  beginRound(cases: readonly CaseState[], playerCaseNo: number | null): AudienceRecommendationState[] {
    const eligibleCases = cases
      .filter((item) => !item.opened && item.no !== playerCaseNo)
      .map((item) => item.no)
    if (eligibleCases.length === 0) {
      this.recommendations = []
      return []
    }

    const desired = this.persona === PlayerPersonaEnum.conformist ? 2 : 1
    const count = Math.min(desired, eligibleCases.length, this.members.length)
    const speakers = shuffle(this.members, this.random).slice(0, count)
    const caseNumbers = shuffle(eligibleCases, this.random)

    this.recommendations = speakers.map((member, index) => ({
      memberId: member.id,
      caseNo: caseNumbers[index] as number
    }))
    return this.recommendations.map((item) => ({ ...item }))
  }

  /** React only when the opened case was recommended by that member */
  react(opened: { caseNo: number; amount: number }, pool: readonly number[]): AudienceReactionState[] {
    const matched = this.recommendations.filter((item) => item.caseNo === opened.caseNo)
    if (matched.length === 0 || pool.length === 0) return []

    const share = pool.filter((amount) => amount <= opened.amount).length / pool.length
    let kind: AudienceReactionEnum
    let lineKey: 'AudienceHappy' | 'AudienceGuilty' | 'AudienceNeutral'
    if (share <= AUDIENCE_HAPPY_SHARE) {
      kind = AudienceReactionEnum.happy
      lineKey = 'AudienceHappy'
    } else if (share >= AUDIENCE_GUILT_SHARE) {
      kind = AudienceReactionEnum.guilty
      lineKey = 'AudienceGuilty'
    } else {
      kind = AudienceReactionEnum.neutral
      lineKey = 'AudienceNeutral'
    }

    return matched.map((recommendation) => {
      const member = this.members.find((item) => item.id === recommendation.memberId)
      if (member) {
        if (kind === AudienceReactionEnum.happy) member.mood = Math.min(AUDIENCE_MOOD_MAX, member.mood + 1)
        if (kind === AudienceReactionEnum.guilty) member.mood = Math.max(AUDIENCE_MOOD_MIN, member.mood - 1)
      }
      return {
        memberId: recommendation.memberId,
        caseNo: opened.caseNo,
        kind,
        lineKey
      }
    })
  }

  clearRecommendations(): void {
    this.recommendations = []
  }
}
