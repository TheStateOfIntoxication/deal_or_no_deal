<script lang="ts" setup>
import { computed } from 'vue'
import type { MessageKey } from '@/language'
import { formatMoney } from '@/utils/money'
import { formatPercent, formatSignedPercent } from '@/utils/percent'
import type { AmountGradeEnum, PersonaActionEnum } from '@/types/game'
import { BANKER_PLAN_LABEL_KEYS } from '../bankerLines'
import type {
  BankerPlanState,
  OfferBreakdownState,
  PersonaActionState,
  PersonaState,
  RoundOpenedState
} from '../types'

const props = defineProps<{
  visible: boolean
  round: number
  offer: number
  remainingAmounts: number[]
  roundOpened: RoundOpenedState[]
  breakdown: OfferBreakdownState | null
  plan: BankerPlanState | null
  quirkLabelKey: MessageKey | null
  canDeal: boolean
  personaState: PersonaState
  personaActions: PersonaActionState[]
}>()

const emit = defineEmits<{
  (e: 'deal'): void
  (e: 'noDeal'): void
  (e: 'persona-action', action: PersonaActionEnum): void
}>()

/** 剩余金额区间，辅助决策（R-9.5） */
const rangeText = computed(() => {
  if (props.remainingAmounts.length === 0) return ''
  const lower = Math.min(...props.remainingAmounts)
  const upper = Math.max(...props.remainingAmounts)
  return `${formatMoney(lower)} – ${formatMoney(upper)}`
})

/** 本轮已开箱按分级着色，让玩家一眼看到自己送走了什么 */
const chipClass = (grade: AmountGradeEnum): Record<string, boolean> => ({
  [`offer-panel__chip--${grade}`]: true
})

const fear = computed(() => props.breakdown?.fear ?? 0)
const ragePenalty = computed(() => props.breakdown?.rage ?? 0)
const fearText = computed(() => formatPercent(fear.value))
const ragePenaltyText = computed(() => formatPercent(ragePenalty.value))
const planText = computed(() => formatSignedPercent(props.plan?.delta ?? 0))
const personaText = computed(() => formatSignedPercent(props.breakdown?.persona ?? 0))
const audienceText = computed(() => formatSignedPercent(props.breakdown?.audience ?? 0))
const quirkText = computed(() => formatSignedPercent(props.breakdown?.quirk ?? 0))
const actionText = computed(() => formatSignedPercent(props.breakdown?.action ?? 0))
const raiseText = computed(() => formatPercent(props.breakdown?.raise ?? 0))
const offerRatioText = computed(() => {
  if (props.remainingAmounts.length === 0) return '0.0%'
  const mean = props.remainingAmounts.reduce((sum, amount) => sum + amount, 0) / props.remainingAmounts.length
  return formatPercent(mean > 0 ? props.offer / mean : 0)
})
</script>

<template>
  <section
    v-show="visible"
    class="offer-panel"
    :class="{ 'offer-panel--shown': visible }"
    role="status"
    aria-live="polite"
  >
    <div class="offer-panel__main">
      <span class="offer-panel__phone" aria-hidden="true">☎</span>
      <div class="offer-panel__offer">
        <span class="offer-panel__label">
          {{ $t('OfferTitle') }} · {{ $t('LabelRound') }} {{ round }}
        </span>
        <strong class="offer-panel__amount">{{ formatMoney(offer) }}</strong>
      </div>
      <div class="offer-panel__actions">
        <el-button v-if="canDeal" type="danger" size="large" @click="emit('deal')">
          {{ $t('BtnDeal') }}
        </el-button>
        <el-button type="primary" size="large" @click="emit('noDeal')">
          {{ $t(canDeal ? 'BtnNoDeal' : 'BtnContinue') }}
        </el-button>
      </div>
    </div>
    <div v-if="personaActions.length" class="offer-panel__persona">
      <span class="offer-panel__persona-label">{{ $t('PersonaActionTitle') }}</span>
      <el-button
        v-for="action in personaActions"
        :key="action.id"
        plain
        size="small"
        :disabled="!action.enabled"
        :title="$t(action.hintKey)"
        @click="emit('persona-action', action.id)"
      >
        {{ $t(action.labelKey) }}
      </el-button>
    </div>
    <div class="offer-panel__meta">
      <span>{{ $t('OfferRemainingCount', { count: remainingAmounts.length }) }}</span>
      <span>{{ $t('OfferRemainingHint') }} {{ rangeText }}</span>
      <span class="offer-panel__ratio">{{ $t('OfferRatio', { percent: offerRatioText }) }}</span>
      <span v-if="fear > 0" class="offer-panel__tag offer-panel__tag--fear">
        {{ $t('BankerAdjustFear', { percent: fearText }) }}
      </span>
      <span v-if="ragePenalty > 0" class="offer-panel__tag offer-panel__tag--rage">
        {{ $t('BankerAdjustRage', { percent: ragePenaltyText }) }}
      </span>
      <span v-if="plan && plan.delta !== 0" class="offer-panel__tag offer-panel__tag--plan">
        {{ $t(BANKER_PLAN_LABEL_KEYS[plan.id]) }} {{ planText }}
      </span>
      <span
        v-if="quirkLabelKey && breakdown && breakdown.quirk !== 0"
        class="offer-panel__tag offer-panel__tag--quirk"
      >
        {{ $t(quirkLabelKey) }} {{ quirkText }}
      </span>
      <span
        v-if="personaState.actionLabelKey"
        class="offer-panel__tag offer-panel__tag--action"
      >
        {{ $t(personaState.actionLabelKey) }} {{ actionText }}
      </span>
      <span
        v-if="breakdown && breakdown.persona !== 0"
        class="offer-panel__tag offer-panel__tag--persona"
      >
        {{ $t('BankerAdjustPersona', { percent: personaText }) }}
      </span>
      <span
        v-if="breakdown && breakdown.audience !== 0"
        class="offer-panel__tag offer-panel__tag--audience"
      >
        {{ $t('BankerAdjustAudience', { percent: audienceText }) }}
      </span>
      <span v-if="breakdown && breakdown.raise > 0" class="offer-panel__tag offer-panel__tag--raise">
        {{ $t('BankerAdjustRaiser', { percent: raiseText }) }}
      </span>
      <span v-if="roundOpened.length > 0" class="offer-panel__opened">
        <span class="offer-panel__opened-label">{{ $t('LabelRoundOpened') }}</span>
        <em
          v-for="item in roundOpened"
          :key="item.caseNo"
          class="offer-panel__chip"
          :class="chipClass(item.grade)"
        >
          #{{ item.caseNo }} {{ formatMoney(item.amount) }}
        </em>
      </span>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.offer-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 16px 12px;
  border: 1px solid var(--dond-gold);
  border-radius: var(--dond-radius);
  background: linear-gradient(90deg, #1d3d59 0%, #0f2438 100%);
  box-shadow: 0 0 26px #f2c14e22;

  &--shown {
    animation: offer-panel-in 0.32s ease-out;

    .offer-panel__amount {
      animation: offer-amount-pulse 1.1s ease-out;
    }
  }

  &__main {
    display: flex;
    gap: 14px;
    align-items: center;
  }

  &__phone {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    font-size: 16px;
    color: var(--dond-gold);
    background: #f2c14e1f;
    animation: offer-phone-ring 1.6s ease-in-out infinite;
  }

  &__offer {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__label {
    font-size: 11px;
    letter-spacing: 1px;
    color: var(--dond-text-dim);
  }

  &__amount {
    font-size: 26px;
    line-height: 1.05;
    color: var(--dond-gold);
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 20px #f2c14e44;
  }

  &__actions {
    display: flex;
    gap: 10px;
    margin-left: auto;

    :deep(.el-button) {
      min-width: 132px;
    }
  }

  &__persona {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  &__persona-label {
    font-size: 11px;
    color: var(--dond-text-dim);
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    align-items: center;
    font-size: 11px;
    color: var(--dond-text-dim);
  }

  &__opened {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 6px;
    align-items: center;
  }

  &__tag {
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 10px;

    &--fear {
      color: #08131f;
      background: var(--dond-gold);
    }

    &--rage {
      color: #ffd9dd;
      background: #e35d6a33;
      box-shadow: inset 0 0 0 1px #e35d6a66;
    }

    &--plan {
      color: #08131f;
      background: #e08b3a;
    }

    &--persona {
      color: #d8c9ff;
      background: #b79cff26;
      box-shadow: inset 0 0 0 1px #b79cff66;
    }

    &--quirk {
      color: #ffd9a8;
      background: #e08b3a26;
      box-shadow: inset 0 0 0 1px #e08b3a66;
    }

    &--action {
      color: #d8c9ff;
      background: #b79cff26;
      box-shadow: inset 0 0 0 1px #b79cff66;
    }

    &--audience {
      color: #7ee2b8;
      background: #35c48c22;
      box-shadow: inset 0 0 0 1px #35c48c66;
    }

    &--raise {
      color: #08131f;
      background: var(--dond-gold);
    }
  }

  &__opened-label {
    margin-right: 2px;
  }

  &__chip {
    padding: 1px 7px;
    border: 1px solid #2c5a7c;
    border-radius: 999px;
    font-style: normal;
    font-variant-numeric: tabular-nums;
    color: #a8bfd6;
    background: #ffffff08;

    &--good {
      border-color: #35c48c;
      color: #7ee2b8;
    }

    &--neutral {
      border-color: #4d7fa5;
    }

    &--bad {
      border-color: #e08b3a;
      color: #f0b878;
    }

    &--disaster {
      border-color: var(--dond-danger);
      color: #ff9aa4;
    }
  }
}

/* 窄屏：改为底部抽屉，台面保持可见，不遮罩不模糊 */
@media (max-width: 900px) {
  .offer-panel {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 40;
    max-height: 42vh;
    padding: 12px 14px calc(14px + env(safe-area-inset-bottom));
    overflow-y: auto;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -16px 44px #00000099;

    &--shown {
      animation: offer-panel-up 0.28s ease-out;
    }

    &__main {
      flex-wrap: wrap;
    }

    &__actions {
      width: 100%;
      margin-left: 0;

      :deep(.el-button) {
        flex: 1;
        min-width: 0;
      }
    }
  }
}

@media (max-width: 420px) {
  .offer-panel {
    max-height: 48vh;
    padding: 10px 10px calc(12px + env(safe-area-inset-bottom));

    &__amount {
      font-size: 22px;
    }

    &__phone {
      width: 28px;
      height: 28px;
      font-size: 14px;
    }

    &__label {
      font-size: 10px;
    }

    &__meta {
      font-size: 10px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .offer-panel--shown {
    animation: none;
  }
}

@keyframes offer-panel-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes offer-panel-up {
  from {
    transform: translateY(100%);
  }

  to {
    transform: none;
  }
}

@keyframes offer-phone-ring {
  0%,
  70%,
  100% {
    transform: rotate(0);
  }

  76% {
    transform: rotate(-12deg);
  }

  82% {
    transform: rotate(10deg);
  }

  88% {
    transform: rotate(-8deg);
  }

  94% {
    transform: rotate(6deg);
  }
}

@keyframes offer-amount-pulse {
  0% {
    opacity: 0.4;
    transform: scale(0.92);
  }

  45% {
    opacity: 1;
    transform: scale(1.05);
  }

  100% {
    transform: scale(1);
  }
}
</style>
