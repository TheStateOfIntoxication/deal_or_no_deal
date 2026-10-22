<script lang="ts" setup>
import DrawPanel from './DrawPanel.vue'

defineProps<{
  errorText: string
  candidates: number[]
  pickedIndex: number | null
  lowestAmount: number
  topPrize: number
}>()

const emit = defineEmits<{ (e: 'pick', index: number): void; (e: 'start'): void }>()
</script>

<template>
  <div class="draw-scene">
    <p v-if="errorText" class="draw-scene__error">{{ errorText }}</p>
    <DrawPanel
      :visible="true"
      :candidates="candidates"
      :picked-index="pickedIndex"
      :lowest-amount="lowestAmount"
      :top-prize="topPrize"
      @pick="emit('pick', $event)"
      @start="emit('start')"
    />
  </div>
</template>

<style lang="scss" scoped>
.draw-scene {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  width: 100%;

  &__error {
    font-size: 13px;
    text-align: center;
    color: var(--dond-danger);
  }
}
</style>
