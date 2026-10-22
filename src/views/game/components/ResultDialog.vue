<script lang="ts" setup>
import { computed } from 'vue'
import { t } from '@/language'
import type { MessageKey } from '@/language'
import { PayoutGradeEnum } from '@/types/game'
import { formatMoney, formatSignedMoney } from '@/utils/money'
import type { GameResultState } from '../types'

const PAYOUT_KEYS: Record<PayoutGradeEnum, MessageKey> = {
  [PayoutGradeEnum.small]: 'PayoutSmall',
  [PayoutGradeEnum.normal]: 'PayoutNormal',
  [PayoutGradeEnum.big]: 'PayoutBig',
  [PayoutGradeEnum.jackpot]: 'PayoutJackpot'
}

const props = defineProps<{
  visible: boolean
  result: GameResultState | null
  bestPrize: number
  highestOffer: number
}>()

const emit = defineEmits<{ (e: 'restart'): void; (e: 'dismiss'): void }>()

const decidedByText = computed(() => {
  if (props.result?.decidedBy === 'deal') return t('ResultDecidedByDeal')
  if (props.result?.decidedBy === 'certainty') return t('ResultDecidedByCertainty')
  return t('ResultDecidedByCase')
})
const swappedText = computed(() =>
  props.result?.swapped ? t('ResultSwappedYes') : t('ResultSwappedNo')
)
const payoutText = computed(() =>
  props.result ? t(PAYOUT_KEYS[props.result.payoutGrade]) : ''
)
</script>

<template>
  <el-dialog
    :model-value="visible"
    width="520px"
    align-center
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <template #header>
      <h2 class="result-dialog__title">{{ $t('ResultTitle') }}</h2>
    </template>
    <template v-if="result">
      <p class="result-dialog__prize-label">{{ $t('ResultPrize') }}</p>
      <p class="result-dialog__prize">{{ formatMoney(result.prize) }}</p>
      <p class="result-dialog__badge" :class="`result-dialog__badge--${result.payoutGrade}`">
        {{ payoutText }}
      </p>
      <p class="result-dialog__decided">{{ decidedByText }}</p>
      <dl class="result-dialog__details">
        <div>
          <dt>{{ $t('LabelHeldCase') }}</dt>
          <dd>#{{ result.heldCaseNo }} · {{ formatMoney(result.heldCaseAmount) }}</dd>
        </div>
        <div>
          <dt>{{ $t('ResultKeeperCaseAmount') }}</dt>
          <dd>{{ formatMoney(result.playerCaseAmount) }}</dd>
        </div>
        <div v-if="result.otherCaseAmount !== null">
          <dt>{{ $t('ResultOtherCaseAmount') }}</dt>
          <dd>{{ formatMoney(result.otherCaseAmount) }}</dd>
        </div>
        <div v-if="result.personaBonus !== 0">
          <dt>{{ $t('ResultBasePrize') }}</dt>
          <dd>{{ formatMoney(result.basePrize) }}</dd>
        </div>
        <div v-if="result.personaBonus !== 0">
          <dt>{{ $t('ResultPersonaBonus') }}</dt>
          <dd>{{ formatSignedMoney(result.personaBonus) }}</dd>
        </div>
        <div>
          <dt>{{ $t('LabelSwap') }}</dt>
          <dd>{{ swappedText }}</dd>
        </div>
        <div v-if="highestOffer > 0">
          <dt>{{ $t('ResultHighestOffer') }}</dt>
          <dd>{{ formatMoney(highestOffer) }}</dd>
        </div>
        <div>
          <dt>{{ $t('ResultBestPrize') }}</dt>
          <dd>{{ formatMoney(bestPrize) }}</dd>
        </div>
      </dl>
      <p
        v-if="highestOffer > 0"
        class="result-dialog__duel"
        :class="{ 'result-dialog__duel--win': (result.prize ?? 0) > highestOffer }"
      >
        {{ (result.prize ?? 0) > highestOffer ? $t('ResultBeatBanker') : $t('ResultBankerWon') }}
      </p>
      <div class="result-dialog__actions">
        <el-button size="large" plain @click="emit('dismiss')">
          {{ $t('BtnDismissResult') }}
        </el-button>
        <el-button type="warning" size="large" @click="emit('restart')">
          {{ $t('BtnRestart') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.result-dialog {
  &__title {
    font-size: 18px;
    letter-spacing: 2px;
    color: var(--dond-gold);
  }

  &__prize-label {
    margin-top: 4px;
    font-size: 11px;
    letter-spacing: 2px;
    text-align: center;
    color: var(--dond-text-dim);
  }

  &__prize {
    margin: 4px 0 2px;
    font-size: 46px;
    font-weight: 700;
    text-align: center;
    color: var(--dond-gold);
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 26px #f2c14e55;
  }

  &__decided {
    margin-bottom: 18px;
    font-size: 13px;
    text-align: center;
    color: var(--dond-text-dim);
  }

  &__badge {
    margin-bottom: 4px;
    font-size: 13px;
    letter-spacing: 2px;
    text-align: center;
    color: var(--dond-text-dim);

    &--jackpot {
      font-size: 16px;
      font-weight: 700;
      color: var(--dond-gold);
      text-shadow: 0 0 18px #f2c14e66;
    }

    &--big {
      color: #7ee2b8;
    }

    &--normal {
      color: #a8bfd6;
    }

    &--small {
      color: #8fa6bd;
    }
  }

  &__details {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 22px;

    div {
      padding: 10px 12px;
      border-radius: 8px;
      background: #ffffff08;
    }

    dt {
      font-size: 11px;
      color: var(--dond-text-dim);
    }

    dd {
      margin-top: 4px;
      font-size: 15px;
      color: var(--dond-text);
      font-variant-numeric: tabular-nums;
    }
  }

  &__duel {
    margin: 0 0 16px;
    font-size: 12px;
    text-align: center;
    color: var(--dond-text-dim);

    &--win {
      color: var(--dond-gold);
      text-shadow: 0 0 16px #f2c14e44;
    }
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
