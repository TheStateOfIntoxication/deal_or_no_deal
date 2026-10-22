<script lang="ts" setup>
import { computed } from 'vue'
import { formatSignedPercent } from '@/utils/percent'
import type { BankerSideBetState } from '../types'

const props = defineProps<{ sideBet: BankerSideBetState | null }>()
const emit = defineEmits<{ (e: 'bet'): void }>()

const winText = computed(() =>
  formatSignedPercent((props.sideBet?.winFactor ?? 1) - 1)
)
const lossText = computed(() =>
  formatSignedPercent((props.sideBet?.lossFactor ?? 1) - 1)
)
</script>

<template>
  <section
    v-if="sideBet && (sideBet.available || sideBet.pending || sideBet.outcome || sideBet.used > 0)"
    class="side-bet"
    :class="{
      'side-bet--pending': sideBet.pending,
      'side-bet--win': sideBet.outcome === 'win',
      'side-bet--lose': sideBet.outcome === 'lose'
    }"
  >
    <span class="side-bet__title">{{ $t(sideBet.labelKey) }}</span>
    <span v-if="sideBet.pending" class="side-bet__state">
      {{ $t('BankerCasinoBetPending') }}
    </span>
    <span v-else-if="sideBet.outcome" class="side-bet__state">
      {{ $t(sideBet.outcome === 'win' ? sideBet.winLabelKey : sideBet.lossLabelKey) }}
    </span>
    <el-button
      v-else-if="sideBet.available"
      type="warning"
      plain
      size="small"
      @click="emit('bet')"
    >
      {{ $t('BankerCasinoBetPlace') }}
    </el-button>
    <span v-else class="side-bet__state">
      {{
        sideBet.used >= sideBet.maxUses
          ? $t('BankerCasinoBetUsed', { used: sideBet.used, max: sideBet.maxUses })
          : $t('BankerCasinoBetClosed')
      }}
    </span>
    <span class="side-bet__terms">
      {{ $t('BankerCasinoBetTerms', { win: winText, loss: lossText }) }}
    </span>
  </section>
</template>

<style lang="scss" scoped>
.side-bet {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: center;
  padding: 7px 12px;
  border: 1px solid #e08b3a66;
  border-radius: 8px;
  font-size: 11px;
  color: #f0b878;
  background: #e08b3a12;

  &--pending {
    border-color: var(--dond-gold);
  }

  &--win {
    border-color: #35c48c;
    color: #7ee2b8;
    background: #35c48c12;
  }

  &--lose {
    border-color: var(--dond-danger);
    color: #ff9aa4;
    background: #e35d6a12;
  }

  &__title {
    font-weight: 700;
    color: var(--dond-gold);
  }

  &__state {
    font-variant-numeric: tabular-nums;
  }

  &__terms {
    color: var(--dond-text-dim);
  }
}
</style>
