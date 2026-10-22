<script lang="ts" setup>
import { formatMoney } from '@/utils/money'
import { AmountGradeEnum } from '@/types/game'
import { GamePhaseEnum } from '../types'
import type { CaseState } from '../types'

const props = defineProps<{
  cases: CaseState[]
  phase: GamePhaseEnum
  remainingToOpen: number
  recommendedCaseNos?: number[]
  hintCaseNo?: number | null
}>()

const emit = defineEmits<{
  (e: 'select', caseNo: number, event?: MouseEvent): void
  (e: 'hover', caseNo: number, event?: MouseEvent): void
  (e: 'leave'): void
}>()

/** 当前阶段该箱子是否不可点击（R-5.2.1–R-5.2.3、R-11.3） */
const isDisabled = (item: CaseState): boolean => {
  if (props.phase === GamePhaseEnum.waitingPlayerCase) return false
  if (props.phase !== GamePhaseEnum.opening) return true
  return item.opened || props.remainingToOpen === 0
}

/** 开箱档位决定金额配色，让不同金额的反馈一眼可辨 */
const caseClass = (item: CaseState): Record<string, boolean> => {
  const classes: Record<string, boolean> = { 'case-grid__case--opened': item.opened }
  if (item.opened && item.grade) classes[`case-grid__case--${item.grade}`] = true
  if (!item.opened && props.recommendedCaseNos?.includes(item.no)) {
    classes['case-grid__case--recommended'] = true
  }
  if (!item.opened && props.hintCaseNo === item.no) {
    classes['case-grid__case--whisper'] = true
  }
  return classes
}
</script>

<template>
  <ul class="case-grid">
    <li v-for="item in cases" :key="item.no">
      <button
        type="button"
        class="case-grid__case"
        :class="caseClass(item)"
        :disabled="isDisabled(item)"
        @mouseenter="emit('hover', item.no, $event)"
        @mouseleave="emit('leave')"
        @focus="emit('hover', item.no)"
        @click="emit('select', item.no, $event)"
      >
        <span class="case-grid__no">{{ item.no }}</span>
        <span v-if="item.revealedAmount !== null" class="case-grid__amount">
          {{ formatMoney(item.revealedAmount) }}
        </span>
        <span
          v-if="item.opened && item.grade === AmountGradeEnum.disaster"
          class="case-grid__flag"
        >
          !
        </span>
        <span
          v-if="!item.opened && recommendedCaseNos?.includes(item.no)"
          class="case-grid__recommend"
        >
          {{ $t('AudienceRecommendedCase') }}
        </span>
      </button>
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.case-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;

  &__case {
    aspect-ratio: 1.3;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 68px;
    padding: 8px 4px;
    border: 1px solid #2c5a7c;
    border-radius: 8px;
    background: linear-gradient(180deg, #1c4467 0%, #12324c 100%);
    cursor: pointer;
    transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      border-color: var(--dond-gold);
      box-shadow: 0 6px 18px #00000055;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }

    &--opened {
      background: #0d1c2a;
      border-color: #23425c;
    }

    &--recommended {
      border-color: var(--dond-gold);
      box-shadow: 0 0 0 2px #f2c14e55, 0 0 20px #f2c14e33;
    }

    &--whisper {
      border-color: #b79cff;
      box-shadow: 0 0 0 1px #b79cff55, 0 0 18px #b79cff33;

      &::after {
        content: '';
        position: absolute;
        top: 6px;
        right: 6px;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #b79cff;
        box-shadow: 0 0 8px #b79cff;
        animation: whisper-pulse 1.4s ease-in-out infinite;
      }
    }

    &--good {
      border-color: #35c48c;
      background: #0d2a22;

      .case-grid__amount {
        color: #7ee2b8;
      }
    }

    &--neutral {
      border-color: #4d7fa5;

      .case-grid__amount {
        color: #a8bfd6;
      }
    }

    &--bad {
      border-color: #e08b3a;
      background: #2a2114;

      .case-grid__amount {
        color: #f0b878;
      }
    }

    &--disaster {
      border-color: var(--dond-danger);
      background: #2c141c;
      box-shadow: 0 0 16px #e35d6a55;

      .case-grid__amount {
        color: #ff9aa4;
      }
    }
  }

  &__no {
    font-size: 16px;
    font-weight: 700;
    color: var(--dond-text);
  }

  &__amount {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  &__flag {
    position: absolute;
    top: 2px;
    right: 4px;
    font-size: 12px;
    font-weight: 700;
    color: var(--dond-danger);
  }

  &__recommend {
    position: absolute;
    bottom: -7px;
    left: 50%;
    z-index: 2;
    width: max-content;
    padding: 1px 5px;
    border-radius: 999px;
    font-size: 9px;
    color: #08131f;
    background: var(--dond-gold);
    transform: translateX(-50%);
  }

  @media (prefers-reduced-motion: reduce) {
    .case-grid__case--whisper::after {
      animation: none;
    }
  }

  @media (max-width: 1200px) {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@keyframes whisper-pulse {
  0%,
  100% {
    opacity: 0.45;
  }

  50% {
    opacity: 1;
  }
}
</style>
