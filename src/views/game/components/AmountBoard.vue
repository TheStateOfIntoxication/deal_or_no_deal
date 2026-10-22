<script lang="ts" setup>
import { computed } from 'vue'
import { formatMoney } from '@/utils/money'
import type { AmountRowState, RoundOpenedState } from '../types'

const props = defineProps<{
  rows: AmountRowState[]
  lastOpened: RoundOpenedState | null
}>()

/** 金额板按金额升序排列：左列低额、右列高额（R-9.6） */
const sortedRows = computed(() =>
  [...props.rows].sort((left, right) => left.amount - right.amount || left.id - right.id)
)
</script>

<template>
  <section class="amount-board">
    <h2 class="amount-board__title">{{ $t('AmountBoardTitle') }}</h2>
    <p v-if="lastOpened" class="amount-board__last">
      <span>{{ $t('LabelJustOpened') }}</span>
      <strong>#{{ lastOpened.caseNo }}</strong>
      <span>{{ formatMoney(lastOpened.amount) }}</span>
    </p>
    <ul class="amount-board__list">
      <li
        v-for="row in sortedRows"
        :key="row.id"
        class="amount-board__row"
        :class="{
          'amount-board__row--out': row.eliminated,
          'amount-board__row--just-opened': lastOpened?.poolIndex === row.id
        }"
      >
        {{ formatMoney(row.amount) }}
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.amount-board {
  padding: 12px;
  border: 1px solid var(--dond-gold-soft);
  border-radius: var(--dond-radius);
  background: #0d2135;

  &__title {
    margin-bottom: 8px;
    font-size: 13px;
    letter-spacing: 2px;
    text-align: center;
    color: var(--dond-text-dim);
  }

  &__list {
    display: grid;
    grid-template-rows: repeat(13, minmax(0, auto));
    grid-auto-flow: column;
    gap: 3px 8px;
  }

  &__last {
    display: flex;
    gap: 6px;
    align-items: baseline;
    justify-content: center;
    margin-bottom: 6px;
    padding: 3px 6px;
    border-radius: 6px;
    font-size: 11px;
    color: var(--dond-text-dim);
    background: #f2c14e1a;

    strong {
      color: var(--dond-gold);
    }
  }

  &__row {
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--dond-gold);
    background: #ffffff08;

    &--out {
      color: #4f6981;
      text-decoration: line-through;
      background: transparent;
    }

    &--just-opened {
      color: #08131f;
      background: var(--dond-gold);
      box-shadow: 0 0 0 2px #f2c14e66, 0 0 14px #f2c14e55;
      animation: amount-board-pop 0.45s ease-out;
      text-decoration: none;
    }
  }
}
</style>

@keyframes amount-board-pop {
  0% {
    transform: scale(1);
  }

  45% {
    transform: scale(1.06);
  }

  100% {
    transform: scale(1);
  }
}
