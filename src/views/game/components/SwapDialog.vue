<script lang="ts" setup>
defineProps<{
  visible: boolean
  playerCaseNo: number
  otherCaseNo: number
}>()

const emit = defineEmits<{ (e: 'decide', shouldSwap: boolean): void }>()
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
