<script lang="ts" setup>
import { computed } from 'vue'
import { t } from '@/language'
import type { MessageKey } from '@/language'
import { AmountGradeEnum } from '@/types/game'
import { formatMoney } from '@/utils/money'
import type { RoundOpenedState } from '../types'

const GRADE_KEYS: Record<AmountGradeEnum, MessageKey> = {
  [AmountGradeEnum.good]: 'GradeGood',
  [AmountGradeEnum.neutral]: 'GradeNeutral',
  [AmountGradeEnum.bad]: 'GradeBad',
  [AmountGradeEnum.disaster]: 'GradeDisaster'
}

const props = defineProps<{ opened: RoundOpenedState | null }>()

const gradeText = computed(() => (props.opened ? t(GRADE_KEYS[props.opened.grade]) : ''))
</script>

<template>
  <div v-if="opened" class="reveal-chip" :class="`reveal-chip--${opened.grade}`">
    <span class="reveal-chip__label">{{ $t('LabelJustOpened') }}</span>
    <span class="reveal-chip__case">#{{ opened.caseNo }}</span>
    <strong class="reveal-chip__amount">{{ formatMoney(opened.amount) }}</strong>
    <span class="reveal-chip__grade">{{ gradeText }}</span>
  </div>
</template>

<style lang="scss" scoped>
.reveal-chip {
  display: flex;
  gap: 10px;
  align-items: center;
  align-self: center;
  padding: 6px 14px;
  border: 1px solid #2c5a7c;
  border-radius: 999px;
  font-size: 13px;
  background: #0d2135;

  &--good {
    border-color: #35c48c;
    color: #7ee2b8;
  }

  &--neutral {
    color: #a8bfd6;
  }

  &--bad {
    border-color: #e08b3a;
    color: #f0b878;
  }

  &--disaster {
    border-color: var(--dond-danger);
    color: #ff9aa4;
    box-shadow: 0 0 18px #e35d6a44;
  }

  &__label {
    font-size: 11px;
    color: var(--dond-text-dim);
  }

  &__case {
    font-weight: 600;
  }

  &__amount {
    font-size: 15px;
    font-variant-numeric: tabular-nums;
  }

  &__grade {
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11px;
    background: #ffffff14;
  }
}
</style>
