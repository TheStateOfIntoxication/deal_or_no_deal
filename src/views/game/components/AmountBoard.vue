<script lang="ts" setup>
import { computed } from 'vue'
import { formatMoney } from '@/utils/money'
import type { AmountRowState } from '../types'

const props = defineProps<{ rows: AmountRowState[] }>()

/** 金额板按金额升序排列：左列低额、右列高额（R-9.6） */
const sortedRows = computed(() =>
  [...props.rows].sort((left, right) => left.amount - right.amount || left.id - right.id)
)
</script>

<template>
  <section class="amount-board">
    <h2 class="amount-board__title">{{ $t('AmountBoardTitle') }}</h2>
    <ul class="amount-board__list">
      <li
        v-for="row in sortedRows"
        :key="row.id"
        class="amount-board__row"
        :class="{ 'amount-board__row--out': row.eliminated }"
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
  }
}
</style>
