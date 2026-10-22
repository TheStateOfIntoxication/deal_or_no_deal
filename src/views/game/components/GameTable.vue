<script lang="ts" setup>
import { formatMoney } from '@/utils/money'
import type { AudienceMemberState, AudienceReactionState, AudienceRecommendationState, BankerExpression, BankerOfferMetaState, CaseState, GameSnapshot } from '../types'
import AudienceRow from './AudienceRow.vue'
import BankerCard from './BankerCard.vue'
import CaseGrid from './CaseGrid.vue'
import OfferPanel from './OfferPanel.vue'

const props = defineProps<{
  snapshot: GameSnapshot
  gridCases: CaseState[]
  bankerExpression: BankerExpression
  bankerConfidence: number
  rage: number
  noDealCount: number
  bankerLine: string
  bankerName: string
  bankerTrait: string
  offerVisible: boolean
  offerMeta: BankerOfferMetaState | null
  adviceText: string
  recommendedCaseNos: number[]
  audienceMembers: AudienceMemberState[]
  audienceRecommendations: AudienceRecommendationState[]
  audienceReactions: AudienceReactionState[]
  tableShaking: boolean
}>()

const emit = defineEmits<{
  (e: 'select', caseNo: number): void
  (e: 'deal'): void
  (e: 'no-deal'): void
}>()
</script>

<template>
  <section class="game-table" :class="{ 'game-table--shake': props.tableShaking }">
    <BankerCard
      :expression="props.bankerExpression"
      :confidence="props.bankerConfidence"
      :rage="props.rage"
      :no-deal-count="props.noDealCount"
      :line="props.bankerLine"
      :name="props.bankerName"
      :trait="props.bankerTrait"
      :top-prize="props.snapshot.topPrize"
      :plan="props.offerVisible ? (props.offerMeta?.plan ?? null) : null"
    />
    <p v-if="props.adviceText" class="game-table__advice">
      <strong>{{ $t('AdviceTitle') }}</strong>
      <span>{{ props.adviceText }}</span>
    </p>
    <p v-if="props.snapshot.passiveNotice" class="game-table__passive">
      {{ $t('PassiveRestorerNotice', {
        caseNo: props.snapshot.passiveNotice.caseNo,
        amount: formatMoney(props.snapshot.passiveNotice.amount)
      }) }}
    </p>
    <OfferPanel
      :visible="props.offerVisible"
      :round="props.snapshot.round"
      :offer="props.snapshot.currentOffer ?? 0"
      :remaining-amounts="props.snapshot.remainingAmounts"
      :round-opened="props.snapshot.roundOpened"
      :breakdown="props.offerMeta?.breakdown ?? null"
      :plan="props.offerMeta?.plan ?? null"
      :can-deal="props.snapshot.canDeal"
      @deal="emit('deal')"
      @no-deal="emit('no-deal')"
    />
    <CaseGrid
      :cases="props.gridCases"
      :phase="props.snapshot.phase"
      :remaining-to-open="props.snapshot.remainingToOpen"
      :recommended-case-nos="props.recommendedCaseNos"
      @select="emit('select', $event)"
    />
    <AudienceRow
      :members="props.audienceMembers"
      :recommendations="props.audienceRecommendations"
      :reactions="props.audienceReactions"
    />
  </section>
</template>

<style lang="scss" scoped>
.game-table {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--dond-gold-soft);
  border-radius: var(--dond-radius);
  background: linear-gradient(180deg, #123a2c 0%, #0a1c26 100%);

  &--shake {
    animation: game-table-shake 0.45s ease-in-out;
  }

  &__passive {
    padding: 6px 10px;
    border: 1px solid #b79cff66;
    border-radius: 8px;
    font-size: 12px;
    text-align: center;
    color: #d8c9ff;
    background: #b79cff1a;
  }

  &__advice {
    display: flex;
    gap: 8px;
    align-items: baseline;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 12px;
    color: var(--dond-text-dim);
    background: #ffffff08;

    strong {
      flex: 0 0 auto;
      color: var(--dond-gold);
    }
  }
}

@keyframes game-table-shake {
  0%,
  100% {
    transform: translateX(0);
  }

  20% {
    transform: translateX(-5px);
  }

  40% {
    transform: translateX(4px);
  }

  60% {
    transform: translateX(-3px);
  }

  80% {
    transform: translateX(2px);
  }
}
</style>
