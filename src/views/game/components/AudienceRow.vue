<script lang="ts" setup>
import { computed } from 'vue'
import type {
  AudienceMemberState,
  AudienceReactionState,
  AudienceRecommendationState
} from '../types'

const props = defineProps<{
  members: AudienceMemberState[]
  recommendations: AudienceRecommendationState[]
  reactions: AudienceReactionState[]
}>()

const recommendationByMember = computed(
  () => new Map(props.recommendations.map((item) => [item.memberId, item]))
)
const reactionByMember = computed(
  () => new Map(props.reactions.map((item) => [item.memberId, item]))
)
const displayMembers = computed(() =>
  props.members.map((member) => ({
    ...member,
    recommendation: recommendationByMember.value.get(member.id) ?? null,
    reaction: reactionByMember.value.get(member.id) ?? null
  }))
)
</script>

<template>
  <section v-if="members.length > 0" class="audience-row">
    <header class="audience-row__head">
      <span>{{ $t('AudienceTitle') }}</span>
      <span class="audience-row__mood-label">{{ $t('AudienceMoodLabel') }}</span>
    </header>
    <ul class="audience-row__list">
      <li v-for="member in displayMembers" :key="member.id" class="audience-row__member">
        <span
          v-if="member.reaction"
          class="audience-row__bubble"
          :class="`audience-row__bubble--${member.reaction.kind}`"
        >
          {{ $t(member.reaction.lineKey) }}
        </span>
        <span v-else-if="member.recommendation" class="audience-row__bubble">
          {{ $t('AudienceRecommend', { caseNo: member.recommendation.caseNo }) }}
        </span>
        <span class="audience-row__avatar" aria-hidden="true">{{ member.emoji }}</span>
        <span class="audience-row__name">{{ $t(member.nameKey) }}</span>
        <span
          class="audience-row__mood"
          :aria-label="$t('AudienceMoodValue', { mood: member.mood })"
        >
          <i v-for="n in 5" :key="n" :class="{ filled: n <= member.mood }" />
        </span>
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.audience-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;

  &__head {
    display: flex;
    gap: 12px;
    align-items: baseline;
    font-size: 11px;
    letter-spacing: 1px;
    color: var(--dond-text-dim);
  }

  &__mood-label {
    color: #6f8aa3;
  }

  &__list {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding: 2px 0 4px;
  }

  &__member {
    position: relative;
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    min-width: 56px;
  }

  &__bubble {
    position: absolute;
    bottom: calc(100% + 2px);
    z-index: 3;
    width: max-content;
    max-width: 150px;
    padding: 3px 7px;
    border: 1px solid #2c5a7c;
    border-radius: 8px;
    font-size: 10px;
    line-height: 1.35;
    color: var(--dond-text);
    background: #10283d;
    box-shadow: 0 4px 12px #00000055;

    &--happy {
      border-color: #35c48c;
      color: #7ee2b8;
    }

    &--guilty {
      border-color: var(--dond-danger);
      color: #ff9aa4;
    }
  }

  &__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid #2c5a7c;
    border-radius: 50%;
    font-size: 18px;
    background: #0d2337;
  }

  &__name {
    max-width: 64px;
    overflow: hidden;
    font-size: 9px;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--dond-text-dim);
  }

  &__mood {
    display: flex;
    gap: 1px;

    i {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #2c4054;
    }

    i.filled {
      background: var(--dond-gold);
    }
  }
}
</style>
