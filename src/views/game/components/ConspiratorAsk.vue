<script lang="ts" setup>
const props = defineProps<{
  available: boolean
  used: boolean
  asking: boolean
}>()

const emit = defineEmits<{ (e: 'ask'): void }>()
</script>

<template>
  <section class="conspirator-ask" aria-live="polite">
    <button
      type="button"
      class="conspirator-ask__button"
      :disabled="!props.available"
      @click="emit('ask')"
    >
      <span aria-hidden="true">🔮</span>
      {{ props.used ? $t('ConspiratorAskUsed') : $t('ConspiratorAskAction') }}
    </button>
    <p v-if="props.asking" class="conspirator-ask__prompt">
      {{ $t('ConspiratorAskPrompt') }}
    </p>
    <p v-else class="conspirator-ask__hint">{{ $t('ConspiratorAskHint') }}</p>
  </section>
</template>

<style lang="scss" scoped>
.conspirator-ask {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #b79cff55;
  border-radius: 10px;
  background: #b79cff0f;

  &__button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid #b79cff;
    border-radius: 999px;
    font-size: 12px;
    color: #e7ddff;
    background: #241d3e;
    cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease;

    &:hover:not(:disabled) {
      background: #332a58;
      box-shadow: 0 0 18px #b79cff44;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  &__prompt {
    padding: 4px 10px;
    border: 1px solid #b79cff;
    border-radius: 9px 9px 9px 2px;
    font-size: 12px;
    color: #e7ddff;
    background: #111c31;
  }

  &__hint {
    font-size: 11px;
    color: #9f8fc4;
  }
}
</style>
