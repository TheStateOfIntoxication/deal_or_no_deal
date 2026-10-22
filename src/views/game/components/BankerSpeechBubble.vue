<script lang="ts" setup>
const props = defineProps<{
  text: string
  x: number
  y: number
}>()
</script>

<template>
  <aside
    class="banker-speech"
    role="status"
    :style="{ left: `${props.x}px`, top: `${props.y}px` }"
  >
    <span class="banker-speech__speaker">{{ $t('BankerConspiratorName') }}</span>
    <p class="banker-speech__line">{{ props.text }}</p>
    <span class="banker-speech__tail" aria-hidden="true" />
  </aside>
</template>

<style lang="scss" scoped>
.banker-speech {
  position: fixed;
  z-index: 70;
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: max-content;
  max-width: 250px;
  padding: 9px 12px 10px;
  border: 1px solid #b79cff;
  border-radius: 12px 12px 12px 3px;
  pointer-events: none;
  color: #e7ddff;
  background: linear-gradient(135deg, #241d3e 0%, #111c31 100%);
  box-shadow: 0 12px 30px #00000088, 0 0 22px #b79cff33;
  animation: speech-in 0.18s ease-out;

  &__speaker {
    font-size: 10px;
    letter-spacing: 1px;
    color: #b79cff;
  }

  &__line {
    font-size: 12px;
    line-height: 1.5;
    color: var(--dond-text);
  }

  &__tail {
    position: absolute;
    bottom: -8px;
    left: 14px;
    width: 0;
    height: 0;
    border-top: 9px solid #111c31;
    border-right: 9px solid transparent;
  }
}

@keyframes speech-in {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.97);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .banker-speech {
    animation: none;
  }
}
</style>
