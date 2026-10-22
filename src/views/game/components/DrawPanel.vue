<script lang="ts" setup>
import { computed } from 'vue'
import { formatMoney } from '@/utils/money'

const props = defineProps<{
  visible: boolean
  candidates: number[]
  pickedIndex: number | null
  lowestAmount: number
  topPrize: number
}>()

const pickedKValue = computed(() =>
  props.pickedIndex === null ? null : (props.candidates[props.pickedIndex] ?? null)
)

const emit = defineEmits<{ (e: 'pick', index: number): void; (e: 'start'): void }>()

const rangeMin = computed(() => (props.candidates.length ? Math.min(...props.candidates) : 0))
const rangeMax = computed(() => (props.candidates.length ? Math.max(...props.candidates) : 0))

const ballClass = (index: number): Record<string, boolean> => ({
  'draw-panel__ball--picked': props.pickedIndex === index,
  'draw-panel__ball--muted': props.pickedIndex !== null && props.pickedIndex !== index
})
</script>

<template>
  <section v-show="visible" class="draw-panel">
    <header class="draw-panel__head">
      <p class="draw-panel__eyebrow">{{ $t('GameSubtitle') }}</p>
      <h2 class="draw-panel__title">{{ $t('DrawTitle') }}</h2>
      <p class="draw-panel__desc">
        {{ $t('DrawDesc', { min: rangeMin, max: rangeMax }) }}
      </p>
    </header>

    <ul class="draw-panel__balls">
      <li v-for="(item, index) in candidates" :key="index">
        <button
          type="button"
          class="draw-panel__ball"
          :class="ballClass(index)"
          :disabled="pickedIndex !== null"
          :aria-label="$t('DrawBallLabel', { index: index + 1 })"
          @click="emit('pick', index)"
        >
          <span v-if="pickedIndex === null" class="draw-panel__ball-mark">?</span>
          <span v-else class="draw-panel__ball-value">×{{ item }}</span>
          <span v-if="pickedIndex === index" class="draw-panel__ball-badge">
            {{ $t('DrawPickedBadge') }}
          </span>
        </button>
      </li>
    </ul>

    <p v-if="pickedIndex === null" class="draw-panel__hint">{{ $t('DrawPickHint') }}</p>

    <div v-else class="draw-panel__result">
      <p class="draw-panel__result-title">
        {{ $t('DrawResultTitle', { count: pickedKValue ?? 0 }) }}
      </p>
      <p class="draw-panel__result-pool">
        {{ $t('DrawPoolPreview', { count: pickedKValue ?? 0, prize: formatMoney(topPrize) }) }}
      </p>
      <p class="draw-panel__result-meta">
        {{ $t('DrawResultMeta', { min: formatMoney(lowestAmount) }) }}
      </p>
      <el-button type="warning" size="large" @click="emit('start')">
        {{ $t('BtnStartGame') }}
      </el-button>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.draw-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: center;
  width: min(760px, 100%);
  padding: 28px clamp(18px, 4vw, 40px) 30px;
  border: 1px solid var(--dond-gold);
  border-radius: 16px;
  background: radial-gradient(circle at 50% -10%, #1d4463 0%, #0b1e30 62%, #071523 100%);
  box-shadow: 0 26px 70px #00000066, inset 0 0 60px #f2c14e0f;
  animation: draw-in 0.4s ease-out;

  &__head {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    text-align: center;
  }

  &__eyebrow {
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--dond-text-dim);
  }

  &__title {
    font-size: 22px;
    letter-spacing: 2px;
    color: var(--dond-gold);
  }

  &__desc {
    max-width: 520px;
    font-size: 12px;
    line-height: 1.7;
    color: var(--dond-text-dim);
  }

  &__balls {
    display: flex;
    flex-wrap: wrap;
    gap: clamp(10px, 2.4vw, 20px);
    justify-content: center;
    padding: 6px 0;
  }

  &__ball {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: clamp(64px, 9vw, 88px);
    height: clamp(64px, 9vw, 88px);
    border: 2px solid #f9d97a;
    border-radius: 50%;
    background: radial-gradient(circle at 34% 28%, #fff6cf 0%, #f2c14e 40%, #b3831a 100%);
    box-shadow: 0 12px 24px #00000066, inset -8px -10px 20px #7a520633;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease;

    &:hover:not(:disabled) {
      transform: translateY(-6px) scale(1.04);
      box-shadow: 0 18px 30px #00000077, 0 0 24px #f2c14e66;
    }

    &:disabled {
      cursor: default;
    }

    &--picked {
      z-index: 2;
      animation: draw-ball-pop 0.5s ease-out;
      box-shadow: 0 0 0 3px var(--dond-gold), 0 0 44px #f2c14eaa, inset -8px -10px 20px #7a520633;
    }

    &--muted {
      opacity: 0.3;
      filter: grayscale(0.55);
      transform: scale(0.9);
    }
  }

  &__ball-mark {
    font-size: clamp(24px, 3.4vw, 32px);
    font-weight: 800;
    color: #6b4a09;
    text-shadow: 0 1px 0 #ffedb8;
  }

  &__ball-value {
    font-size: clamp(20px, 3vw, 28px);
    font-weight: 800;
    color: #3a2606;
    font-variant-numeric: tabular-nums;
  }

  &__ball-badge {
    position: absolute;
    top: -8px;
    right: -6px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    color: #08131f;
    background: var(--dond-gold);
    box-shadow: 0 2px 8px #00000066;
  }

  &__hint {
    font-size: 13px;
    letter-spacing: 2px;
    color: var(--dond-gold);
    animation: draw-hint-pulse 1.6s ease-in-out infinite;
  }

  &__result {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    animation: draw-in 0.35s ease-out;
  }

  &__result-title {
    font-size: 26px;
    font-weight: 700;
    color: var(--dond-gold);
    text-shadow: 0 0 26px #f2c14e55;
  }

  &__result-pool {
    font-size: 13px;
    color: var(--dond-text);
  }

  &__result-meta {
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--dond-text-dim);
  }
}

@keyframes draw-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes draw-ball-pop {
  0% {
    transform: scale(1);
  }

  45% {
    transform: scale(1.18);
  }

  100% {
    transform: scale(1.08);
  }
}

@keyframes draw-hint-pulse {
  0%,
  100% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }
}
</style>
