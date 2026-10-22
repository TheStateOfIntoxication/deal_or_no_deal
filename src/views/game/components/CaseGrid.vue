<script lang="ts" setup>
import { ref, watch } from 'vue'
import { t } from '@/language'
import type { MessageKey } from '@/language'
import { formatMoney } from '@/utils/money'
import { AmountGradeEnum } from '@/types/game'
import { GamePhaseEnum } from '../types'
import type { CaseState } from '../types'

const props = defineProps<{
  cases: CaseState[]
  phase: GamePhaseEnum
  remainingToOpen: number
  recommendedCaseNos?: number[]
  hints?: Record<number, MessageKey>
}>()

const emit = defineEmits<{
  (e: 'select', caseNo: number): void
}>()

const hoveredCaseNo = ref<number | null>(null)

/** 当前阶段该箱子是否不可点击（R-5.2.1–R-5.2.3、R-11.3） */
const isDisabled = (item: CaseState): boolean => {
  if (props.phase === GamePhaseEnum.waitingPlayerCase) return false
  if (props.phase !== GamePhaseEnum.opening) return true
  return item.opened || props.remainingToOpen === 0
}

/** 管理员透视和阴谋家低语都只影响展示，不改箱子状态 */
const hintTextFor = (caseNo: number): string => {
  const key = props.hints?.[caseNo]
  return key ? t(key) : ''
}

const showHint = (caseNo: number): boolean =>
  hoveredCaseNo.value === caseNo && !!props.hints?.[caseNo]

// Make a newly selected hint visible once (important on touch, where there is no hover).
watch(
  () => props.hints,
  (next, previous) => {
    const added = Object.keys(next ?? {}).find((key) => !previous?.[Number(key)])
    if (added) hoveredCaseNo.value = Number(added)
  }
)

/** 开箱档位决定金额配色，让不同金额的反馈一眼可辨 */
const caseClass = (item: CaseState): Record<string, boolean> => {
  const classes: Record<string, boolean> = { 'case-grid__case--opened': item.opened }
  if (item.opened && item.grade) classes[`case-grid__case--${item.grade}`] = true
  if (!item.opened && props.recommendedCaseNos?.includes(item.no)) {
    classes['case-grid__case--recommended'] = true
  }
  if (!item.opened && props.hints?.[item.no]) {
    classes['case-grid__case--hinted'] = true
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
        @mouseenter="hoveredCaseNo = item.no"
        @mouseleave="hoveredCaseNo = null"
        @focus="hoveredCaseNo = item.no"
        @blur="hoveredCaseNo = null"
        @click="emit('select', item.no)"
      >
        <span class="case-grid__no">{{ item.no }}</span>
        <span v-if="item.revealedAmount !== null" class="case-grid__amount">
          {{ formatMoney(item.revealedAmount) }}
        </span>
        <span v-if="showHint(item.no)" class="case-grid__whisper">
          {{ hintTextFor(item.no) }}
          <small>{{ $t('BankerConspiratorTapAgain') }}</small>
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

    &--hinted {
      z-index: 4;
      border-color: #b79cff;
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

  &__whisper {
    position: absolute;
    bottom: calc(100% + 7px);
    left: 50%;
    z-index: 5;
    width: 156px;
    padding: 7px 8px;
    border: 1px solid #b79cff;
    border-radius: 10px 10px 10px 3px;
    font-size: 10px;
    line-height: 1.45;
    color: #e7ddff;
    text-align: left;
    white-space: normal;
    background: linear-gradient(135deg, #241d3e 0%, #111c31 100%);
    box-shadow: 0 8px 22px #00000088, 0 0 18px #b79cff33;
    pointer-events: none;
    transform: translateX(-50%);

    &::after {
      content: '';
      position: absolute;
      bottom: -7px;
      left: 14px;
      border-top: 8px solid #111c31;
      border-right: 8px solid transparent;
    }

    small {
      display: block;
      margin-top: 3px;
      color: #b79cff;
    }
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

</style>
