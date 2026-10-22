<script lang="ts" setup>
import type { GameModeDefinition } from '@/config/modes'

const props = defineProps<{
  mode: GameModeDefinition
  revealed: boolean
  selected: boolean
  disabled: boolean
}>()

const emit = defineEmits<{ (e: 'pick'): void }>()
</script>

<template>
  <button
    type="button"
    class="mode-card"
    :class="[
      `mode-card--${props.mode.tone}`,
      { 'mode-card--revealed': props.revealed, 'mode-card--selected': props.selected }
    ]"
    :data-mode="props.mode.id"
    :disabled="props.disabled || props.selected"
    @click="emit('pick')"
  >
    <span v-if="!props.revealed" class="mode-card__back" aria-hidden="true">
      <span class="mode-card__back-mark">?</span>
      <span class="mode-card__back-line" />
      <span class="mode-card__back-line" />
    </span>
    <span v-else class="mode-card__front">
      <span class="mode-card__icon" aria-hidden="true">{{ props.mode.icon }}</span>
      <span class="mode-card__tone">{{ $t('ModeLabel') }}</span>
      <strong class="mode-card__name">{{ $t(props.mode.nameKey) }}</strong>
      <span class="mode-card__tagline">{{ $t(props.mode.taglineKey) }}</span>
      <span class="mode-card__rules">
        <span v-for="key in props.mode.ruleKeys" :key="key" class="mode-card__rule">
          {{ $t(key) }}
        </span>
      </span>
      <span class="mode-card__stat">{{ $t(props.mode.statKey) }}</span>
    </span>
  </button>
</template>

<style lang="scss" scoped>
.mode-card {
  position: relative;
  display: flex;
  align-items: stretch;
  width: min(240px, 100%);
  min-height: 300px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--dond-gold-soft);
  border-radius: 16px;
  background: #0b1e30;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-6px);
    border-color: var(--dond-gold);
    box-shadow: 0 18px 40px #00000066, 0 0 26px #f2c14e33;
  }

  &:disabled {
    cursor: default;
  }

  &--gold {
    --mode-accent: #f2c14e;
  }

  &--violet {
    --mode-accent: #b79cff;
  }

  &--selected {
    border-color: var(--mode-accent);
    box-shadow: 0 0 0 2px var(--mode-accent), 0 0 34px #f2c14e44;
  }

  &__back {
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 100%;
    background:
      repeating-linear-gradient(45deg, #0d2a44 0 10px, #0a2137 10px 20px);
  }

  &__back-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 84px;
    height: 84px;
    border: 2px solid var(--dond-gold);
    border-radius: 50%;
    font-size: 42px;
    font-weight: 800;
    color: var(--dond-gold);
    background: radial-gradient(circle at 35% 28%, #244b6e 0%, #0b1e30 70%);
    box-shadow: inset 0 0 24px #f2c14e33, 0 0 24px #00000066;
  }

  &__back-line {
    width: 44%;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--dond-gold), transparent);
    opacity: 0.55;
  }

  &__front {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    padding: 22px 18px;
    text-align: left;
    animation: mode-card-flip 0.5s ease-out;
  }

  &__icon {
    font-size: 36px;
    line-height: 1;
  }

  &__tone {
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--dond-text-dim);
  }

  &__name {
    font-size: 21px;
    letter-spacing: 1px;
    color: var(--mode-accent);
  }

  &__tagline {
    font-size: 13px;
    color: var(--dond-text);
  }

  &__rules {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
  }

  &__rule {
    padding-left: 12px;
    font-size: 11px;
    line-height: 1.5;
    color: #a8bfd6;

    &::before {
      content: '›';
      margin-right: 6px;
      color: var(--mode-accent);
    }
  }

  &__stat {
    margin-top: auto;
    padding-top: 12px;
    font-size: 11px;
    color: var(--dond-text-dim);
  }
}

@keyframes mode-card-flip {
  from {
    opacity: 0;
    transform: rotateY(-80deg);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mode-card__front {
    animation: none;
  }
}
</style>
