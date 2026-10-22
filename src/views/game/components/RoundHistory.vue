<script lang="ts" setup>
import { formatMoney } from '@/utils/money'
import type { RoundLogState } from '../types'

defineProps<{ logs: RoundLogState[] }>()
</script>

<template>
  <section class="round-history">
    <h2 class="round-history__title">{{ $t('HistoryTitle') }}</h2>
    <p v-if="logs.length === 0" class="round-history__empty">{{ $t('HistoryEmpty') }}</p>
    <ol class="round-history__list">
      <li v-for="log in logs" :key="log.round" class="round-history__item">
        <span class="round-history__round">{{ $t('LabelRound') }} {{ log.round }}</span>
        <span class="round-history__opened">
          <span
            v-for="(amount, index) in log.openedAmounts"
            :key="index"
            class="round-history__amount"
          >
            {{ formatMoney(amount) }}
          </span>
        </span>
        <span class="round-history__offer">{{ formatMoney(log.offer) }}</span>
      </li>
    </ol>
  </section>
</template>

<style lang="scss" scoped>
.round-history {
  padding: 12px 14px;
  border: 1px solid #1d3a52;
  border-radius: var(--dond-radius);
  background: #0a1a28;

  &__title {
    margin-bottom: 8px;
    font-size: 13px;
    letter-spacing: 2px;
    color: var(--dond-text-dim);
  }

  &__empty {
    font-size: 12px;
    color: #4f6981;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 168px;
    overflow-y: auto;
  }

  &__item {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr) 110px;
    gap: 10px;
    align-items: center;
    font-size: 12px;
  }

  &__round {
    color: var(--dond-text-dim);
  }

  &__opened {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
  }

  &__amount {
    color: #a8bfd6;
    font-variant-numeric: tabular-nums;
  }

  &__offer {
    text-align: right;
    color: var(--dond-gold);
    font-variant-numeric: tabular-nums;
  }
}
</style>
