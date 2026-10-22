<script lang="ts" setup>
import { computed } from 'vue'
import { formatMoney } from '@/utils/money'
import { formatPercent } from '@/utils/percent'
import type { PlayerCaseStats } from '../types'

const props = defineProps<{ stats: PlayerCaseStats }>()

const percentText = computed(() => formatPercent(props.stats.probability))
const caseClass = computed(() => {
  const grade = props.stats.revealedGrade
  const classes: Record<string, boolean> = {
    'player-stage__case--revealed': props.stats.revealedAmount !== null,
    'player-stage__case--revealing': props.stats.revealing
  }
  if (grade) classes[`player-stage__case--${grade}`] = true
  return classes
})
</script>

<template>
  <section class="player-stage">
    <h2 class="player-stage__title">{{ $t('LabelPlayerCase') }}</h2>
    <div class="player-stage__case" :class="caseClass">
      <span class="player-stage__no">#{{ stats.caseNo ?? '—' }}</span>
      <span v-if="stats.revealedAmount !== null" class="player-stage__amount">
        {{ formatMoney(stats.revealedAmount) }}
      </span>
      <span v-else-if="stats.adminAmount !== null" class="player-stage__admin-amount">
        {{ formatMoney(stats.adminAmount) }}
      </span>
      <span v-else class="player-stage__unknown">?</span>
    </div>

    <p v-if="stats.caseNo === null" class="player-stage__placeholder">
      {{ $t('HintChoosePlayerCase') }}
    </p>

    <p v-else-if="stats.revealing" class="player-stage__revealing">
      {{ $t('HintFinalReveal') }}
    </p>

    <template v-else-if="stats.revealedAmount === null">
      <p class="player-stage__chance-label">
        {{ $t('LabelTopPrizeChance', { prize: formatMoney(stats.topPrize) }) }}
      </p>
      <strong class="player-stage__chance-value">{{ percentText }}</strong>
      <div class="player-stage__bar">
        <i class="player-stage__bar-fill" :style="{ width: percentText }" />
      </div>
      <p class="player-stage__meta">
        {{ $t('LabelTopPrizePool', { remain: stats.topPrizeRemaining, cases: stats.remainingCaseCount }) }}
      </p>
      <p class="player-stage__meta">{{ $t('LabelRemainingRange') }} {{ stats.rangeText }}</p>
      <p v-if="stats.milestoneText" class="player-stage__milestone">{{ stats.milestoneText }}</p>
    </template>
  </section>
</template>

<style lang="scss" scoped>
.player-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 14px 14px;
  border: 1px solid var(--dond-gold-soft);
  border-radius: var(--dond-radius);
  background: linear-gradient(180deg, #16324b 0%, #0b1e30 100%);

  &__title {
    font-size: 12px;
    letter-spacing: 2px;
    color: var(--dond-text-dim);
  }

  &__case {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 108px;
    min-height: 76px;
    margin: 4px 0 6px;
    border: 1px solid var(--dond-gold);
    border-radius: 10px;
    background: linear-gradient(180deg, #2a5b83 0%, #173a56 100%);
    box-shadow: 0 10px 24px #00000055, inset 0 0 0 1px #f2c14e33;
    animation: player-stage-in 0.45s ease-out;

    &::before {
      content: '';
      position: absolute;
      top: 8px;
      width: 26px;
      height: 5px;
      border-radius: 3px;
      background: #0b1a2b;
      box-shadow: inset 0 0 0 1px #f2c14e66;
    }

    &--revealed {
      animation: player-stage-reveal 0.55s ease-out;
    }

    &--revealing {
      animation: player-stage-revealing 1.1s ease-in-out infinite;
    }

    &--jackpot {
      border-color: var(--dond-gold);
      box-shadow: 0 0 30px #f2c14e88;
    }

    &--big {
      border-color: #35c48c;
      box-shadow: 0 0 22px #35c48c55;
    }

    &--normal {
      border-color: #4d7fa5;
    }

    &--small {
      border-color: #3a5470;
      opacity: 0.9;
    }
  }

  &__no {
    margin-top: 10px;
    font-size: 20px;
    font-weight: 700;
    color: var(--dond-gold);
    font-variant-numeric: tabular-nums;
  }

  &__unknown {
    margin-top: 4px;
    font-size: 18px;
    color: #7b93aa;
  }

  &__admin-amount {
    margin-top: 2px;
    font-size: 12px;
    font-weight: 700;
    color: #d8c9ff;
    font-variant-numeric: tabular-nums;
  }

  &__amount {
    margin-top: 2px;
    font-size: 15px;
    font-weight: 700;
    color: var(--dond-gold);
    font-variant-numeric: tabular-nums;
  }

  &__placeholder {
    font-size: 12px;
    line-height: 1.5;
    text-align: center;
    color: var(--dond-text-dim);
  }

  &__chance-label {
    font-size: 11px;
    text-align: center;
    color: var(--dond-text-dim);
  }

  &__chance-value {
    font-size: 30px;
    line-height: 1.1;
    color: var(--dond-gold);
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 18px #f2c14e44;
  }

  &__bar {
    width: 100%;
    height: 6px;
    overflow: hidden;
    border-radius: 999px;
    background: #ffffff14;
  }

  &__bar-fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #8a6a1f 0%, var(--dond-gold) 100%);
    transition: width 0.4s ease;
  }

  &__meta {
    font-size: 11px;
    text-align: center;
    color: var(--dond-text-dim);
  }

  &__milestone {
    margin-top: 2px;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 11px;
    color: #08131f;
    background: var(--dond-gold);
  }

  &__revealing {
    font-size: 12px;
    letter-spacing: 1px;
    text-align: center;
    color: var(--dond-gold);
    animation: player-stage-text-pulse 1.2s ease-in-out infinite;
  }
}

@keyframes player-stage-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.92);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes player-stage-reveal {
  0% {
    transform: scale(1);
  }

  45% {
    transform: scale(1.08);
  }

  100% {
    transform: scale(1);
  }
}

@keyframes player-stage-revealing {
  0%,
  100% {
    box-shadow: 0 10px 24px #00000055, 0 0 0 #f2c14e00;
  }

  50% {
    box-shadow: 0 10px 24px #00000055, 0 0 26px #f2c14e66;
  }
}

@keyframes player-stage-text-pulse {
  0%,
  100% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }
}
</style>
