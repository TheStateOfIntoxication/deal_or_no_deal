<script lang="ts" setup>
import type { GameResultState } from '../types'
import ResultDialog from './ResultDialog.vue'
import SwapDialog from './SwapDialog.vue'

defineProps<{
  swapVisible: boolean
  resultVisible: boolean
  result: GameResultState | null
  bestPrize: number
  playerCaseNo: number
  otherCaseNo: number
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
    @decide="emit('swap', $event)"
  />
  <ResultDialog
    :visible="resultVisible"
    :result="result"
    :best-prize="bestPrize"
    @restart="emit('restart')"
    @dismiss="emit('dismiss')"
  />
</template>
