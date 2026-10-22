<script lang="ts" setup>
import { computed } from 'vue'
import { formatMoney } from '@/utils/money'
import { formatPercent } from '@/utils/percent'
import type { BankerExpression } from '../types'

const props = defineProps<{
  expression: BankerExpression
  confidence: number
  rage: number
  noDealCount: number
  line: string
  topPrize: number
}>()

const confidenceText = computed(() => formatPercent(props.confidence, 0))
const rageBarWidth = computed(() => `${Math.min(100, Math.max(0, props.rage))}%`)
</script>

<template>
  <section class="banker-card" :class="`banker-card--${expression}`">
    <div class="banker-card__portrait" aria-hidden="true">
      <svg class="banker-card__face" viewBox="0 0 64 64">
        <rect class="hat" x="16" y="4" width="32" height="9" rx="2" />
        <rect class="brim" x="10" y="13" width="44" height="4" rx="2" />
        <circle class="head" cx="32" cy="38" r="16" />
        <circle class="monocle" cx="38" cy="34" r="5" />
        <path class="chain" d="M43 35 L50 41" />
        <g class="eyes">
          <circle cx="26" cy="34" r="1.6" />
          <circle cx="38" cy="34" r="1.6" />
        </g>
        <g class="brows">
          <path d="M21 28 L29 31" />
          <path d="M43 28 L35 31" />
        </g>
        <path class="moustache" d="M23 45 Q27.5 41.5 32 45 Q36.5 41.5 41 45 Q36.5 48.5 32 47.5 Q27.5 48.5 23 45 Z" />
        <g class="steam">
          <circle cx="14" cy="16" r="3" />
          <circle cx="50" cy="14" r="4" />
          <circle cx="17" cy="9" r="2" />
        </g>
        <path v-if="expression === 'furious'" class="crack" d="M34 30 L42 38" />
      </svg>
    </div>

    <div class="banker-card__body">
      <div class="banker-card__head">
        <span class="banker-card__name">{{ $t('BankerTitle') }}</span>
        <span class="banker-card__confidence">
          {{ $t('BankerConfidence') }} {{ confidenceText }}
        </span>
      </div>
      <p class="banker-card__bet">
        {{ $t('BankerBetHint', { prize: formatMoney(topPrize) }) }}
      </p>
      <div class="banker-card__rage">
        <span class="banker-card__rage-label">{{ $t('BankerRage') }}</span>
        <span class="banker-card__rage-track"><i :style="{ width: rageBarWidth }" /></span>
        <span class="banker-card__rage-value">{{ rage }}</span>
        <span class="banker-card__refusals">
          {{ $t('BankerNoDealCount', { count: noDealCount }) }}
        </span>
      </div>
      <p class="banker-card__line">“{{ line }}”</p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.banker-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid var(--dond-gold-soft);
  border-radius: var(--dond-radius);
  background: linear-gradient(90deg, #14293d 0%, #0b1b2a 100%);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;

  &--smug {
    border-color: var(--dond-gold-soft);
  }

  &--annoyed {
    border-color: #e08b3a80;
    box-shadow: 0 0 18px #e08b3a26;
  }

  &--angry {
    border-color: var(--dond-danger);
    box-shadow: 0 0 20px #e35d6a3d;
    animation: banker-shiver 0.4s ease-in-out;
  }

  &--furious {
    border-color: #ff6b6b;
    box-shadow: 0 0 30px #e35d6a66;
    animation: banker-shiver 0.28s ease-in-out infinite;
  }

  &__portrait {
    flex: 0 0 auto;
    width: 58px;
    height: 58px;
    padding: 3px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 30%, #2a4b6a 0%, #101f2e 100%);
    box-shadow: inset 0 0 0 1px #f2c14e33;
  }

  &__face {
    width: 100%;
    height: 100%;

    .hat,
    .brim {
      fill: #0d1a27;
    }

    .head {
      fill: #d9a06a;
      transition: fill 0.3s ease;
    }

    .monocle {
      fill: #ffffff14;
      stroke: var(--dond-gold);
      stroke-width: 1.4;
    }

    .chain {
      fill: none;
      stroke: var(--dond-gold);
      stroke-width: 1;
    }

    .eyes circle {
      fill: #101c2a;
    }

    .brows {
      transform-box: fill-box;
      transform-origin: center;
    }

    .brows path {
      fill: none;
      stroke: #33200f;
      stroke-width: 2;
      stroke-linecap: round;
    }

    .moustache {
      fill: #2a1a0e;
    }

    .steam {
      fill: var(--dond-danger);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .crack {
      stroke: #ffe9ec;
      stroke-width: 1.2;
      fill: none;
    }
  }

  &--smug &__face .brows {
    transform: rotate(-3deg) translateY(-1px);
  }

  &--annoyed &__face {
    .brows {
      transform: rotate(2deg) translateY(1px);
    }

    .head {
      fill: #cf8f5a;
    }
  }

  &--angry &__face {
    .brows {
      transform: rotate(8deg) translateY(1px);
    }

    .head {
      fill: #c9705a;
    }

    .steam {
      opacity: 0.55;
    }
  }

  &--furious &__face {
    .brows {
      transform: rotate(12deg) translateY(1px);
    }

    .head {
      fill: #b84a4a;
    }

    .steam {
      opacity: 0.9;
    }
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  &__head {
    display: flex;
    gap: 12px;
    align-items: baseline;
  }

  &__name {
    font-size: 14px;
    letter-spacing: 2px;
    color: var(--dond-gold);
  }

  &__confidence {
    font-size: 11px;
    color: var(--dond-text-dim);
  }

  &__bet {
    font-size: 11px;
    color: #8fa6bd;
  }

  &__rage {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 11px;
    color: var(--dond-text-dim);
  }

  &__rage-track {
    display: block;
    width: 108px;
    height: 6px;
    overflow: hidden;
    border-radius: 999px;
    background: #ffffff14;
  }

  &__rage-track i {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #e08b3a 0%, #e35d6a 100%);
    transition: width 0.4s ease;
  }

  &__rage-value {
    min-width: 22px;
    color: #f0b878;
    font-variant-numeric: tabular-nums;
  }

  &__refusals {
    color: #6f8aa3;
  }

  &__line {
    font-size: 12px;
    line-height: 1.5;
    color: var(--dond-text);
  }
}

@media (max-width: 640px) {
  .banker-card {
    padding: 8px 10px;

    &__portrait {
      width: 46px;
      height: 46px;
    }

    &__rage-track {
      width: 72px;
    }
  }
}

@keyframes banker-shiver {
  0%,
  100% {
    transform: translateX(0);
  }

  35% {
    transform: translateX(-2px);
  }

  70% {
    transform: translateX(2px);
  }
}
</style>
