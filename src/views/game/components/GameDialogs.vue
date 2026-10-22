<script lang="ts" setup>
import type { PlayerPersonaEnum } from '@/types/game'
import type { GameResultState } from '../types'
import ResultDialog from './ResultDialog.vue'
import SwapDialog from './SwapDialog.vue'

defineProps<{
  swapVisible: boolean
  resultVisible: boolean
  result: GameResultState | null
  bestPrize: number
  highestOffer: number
  playerCaseNo: number
  otherCaseNo: number
  remainingAmounts: number[]
  topPrizeRemaining: number
  lastOffer: number
  bankerConfidence: number
  personaId: PlayerPersonaEnum
}>()

const emit = defineEmits<{
  (e: 'swap', shouldSwap: boolean): void
  (e: 'restart'): void
  (e: 'dismiss'): void
}>()
</script>

<template>
  <SwapDialog
    :visible="swapVisible"
    :player-case-no="playerCaseNo"
    :other-case-no="otherCaseNo"
    :remaining-amounts="remainingAmounts"
    :top-prize-remaining="topPrizeRemaining"
    :last-offer="lastOffer"
    :banker-confidence="bankerConfidence"
    :persona-id="personaId"
    @decide="emit('swap', $event)"
  />
  <ResultDialog
    :visible="resultVisible"
    :result="result"
    :best-prize="bestPrize"
    :highest-offer="highestOffer"
    @restart="emit('restart')"
    @dismiss="emit('dismiss')"
  />
</template>
