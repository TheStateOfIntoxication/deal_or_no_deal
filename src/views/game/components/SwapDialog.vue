<script lang="ts" setup>
import { computed } from 'vue'
import { PlayerPersonaEnum } from '@/types/game'
import { formatMoney } from '@/utils/money'
import { formatPercent } from '@/utils/percent'

const props = defineProps<{
  visible: boolean
  playerCaseNo: number
  otherCaseNo: number
  remainingAmounts: number[]
  topPrizeRemaining: number
  lastOffer: number
  bankerConfidence: number
  personaId: PlayerPersonaEnum
}>()

const emit = defineEmits<{ (e: 'decide', shouldSwap: boolean): void }>()

const amountsText = computed(() => props.remainingAmounts.map((amount) => formatMoney(amount)).join(' / '))
const mean = computed(() => {
  if (props.remainingAmounts.length === 0) return 0
  return props.remainingAmounts.reduce((sum, amount) => sum + amount, 0) / props.remainingAmounts.length
})
const offerRatioText = computed(() => formatPercent(mean.value > 0 ? props.lastOffer / mean.value : 0))
const confidenceText = computed(() => formatPercent(props.bankerConfidence, 0))
const topText = computed(() =>
  props.topPrizeRemaining > 0 ? 'SwapTopPrizeLeft' : 'SwapTopPrizeGone'
)
const hintKey = computed(() => {
  if (props.personaId === PlayerPersonaEnum.gambler) return 'SwapHintGambler'
  if (props.personaId === PlayerPersonaEnum.closer) return 'SwapHintInsurance'
  return 'SwapHintNeutral'
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    width="480px"
    align-center
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <template #header>
      <h2 class="swap-dialog__title">{{ $t('SwapTitle') }}</h2>
    </template>
    <p class="swap-dialog__desc">
      {{ $t('SwapDesc', { player: playerCaseNo, other: otherCaseNo }) }}
    </p>
    <div class="swap-dialog__info">
      <p>{{ $t('SwapRemaining', { amounts: amountsText }) }}</p>
      <p>{{ $t(topText) }}</p>
      <p>{{ $t('SwapLastOffer', { offer: formatMoney(lastOffer), percent: offerRatioText }) }}</p>
      <p>{{ $t('SwapBankerConfidence', { percent: confidenceText }) }}</p>
      <p class="swap-dialog__hint">{{ $t(hintKey) }}</p>
    </div>
    <div class="swap-dialog__actions">
      <el-button type="warning" size="large" @click="emit('decide', true)">
        {{ $t('BtnSwapCase') }}
      </el-button>
      <el-button type="primary" size="large" plain @click="emit('decide', false)">
        {{ $t('BtnKeepCase') }}
      </el-button>
    </div>
  </el-dialog>
</template>

<style lang="scss" scoped>
.swap-dialog {
  &__title {
    font-size: 18px;
    letter-spacing: 2px;
    color: var(--dond-gold);
  }

  &__desc {
    margin-bottom: 20px;
    font-size: 14px;
    text-align: center;
    color: var(--dond-text);
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0 auto 18px;
    padding: 10px 12px;
    border: 1px solid #2c5a7c;
    border-radius: 8px;
    font-size: 12px;
    text-align: center;
    color: var(--dond-text-dim);
    background: #ffffff08;
  }

  &__hint {
    margin-top: 4px;
    color: var(--dond-gold);
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    padding-bottom: 4px;

    :deep(.el-button) {
      min-width: 150px;
    }
  }
}
</style>
