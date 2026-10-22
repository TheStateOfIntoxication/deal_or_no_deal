<script lang="ts" setup>
import { formatMoney } from '@/utils/money'

const props = defineProps<{
  topPrize: number
}>()

const emit = defineEmits<{ (e: 'start'): void }>()
</script>

<template>
  <section class="jackpot-intro">
    <span class="jackpot-intro__crown" aria-hidden="true">👑</span>
    <p class="jackpot-intro__eyebrow">{{ $t('GameSubtitle') }}</p>
    <h2 class="jackpot-intro__title">{{ $t('JackpotIntroTitle') }}</h2>
    <p class="jackpot-intro__desc">{{ $t('JackpotIntroDesc') }}</p>
    <strong class="jackpot-intro__amount">{{ formatMoney(props.topPrize) }}</strong>
    <p class="jackpot-intro__odds">{{ $t('JackpotIntroOdds') }}</p>
    <el-button type="warning" size="large" @click="emit('start')">
      {{ $t('BtnStartGame') }}
    </el-button>
  </section>
</template>

<style lang="scss" scoped>
.jackpot-intro {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  width: min(620px, 100%);
  padding: 30px 24px;
  border: 1px solid #b79cff;
  border-radius: 16px;
  text-align: center;
  background: radial-gradient(circle at 50% -10%, #2b2350 0%, #0b1e30 64%, #071523 100%);
  box-shadow: 0 26px 70px #00000066, inset 0 0 60px #b79cff1f;
  animation: jackpot-in 0.4s ease-out;

  &__crown {
    font-size: 48px;
    line-height: 1;
    filter: drop-shadow(0 0 18px #b79cff66);
  }

  &__eyebrow {
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--dond-text-dim);
  }

  &__title {
    font-size: 24px;
    letter-spacing: 2px;
    color: #d8c9ff;
  }

  &__desc {
    max-width: 480px;
    font-size: 13px;
    line-height: 1.7;
    color: var(--dond-text-dim);
  }

  &__amount {
    font-size: clamp(34px, 7vw, 56px);
    color: #d8c9ff;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 28px #b79cff66;
  }

  &__odds {
    margin-bottom: 10px;
    font-size: 12px;
    color: #a8bfd6;
  }
}

@keyframes jackpot-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: none;
  }
}
</style>
