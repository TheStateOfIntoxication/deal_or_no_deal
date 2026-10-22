<script lang="ts" setup>
import type { PlayerPersonaDefinition } from '@/config/personas'

const props = defineProps<{
  persona: PlayerPersonaDefinition
  selected: boolean
}>()

const emit = defineEmits<{ (e: 'pick'): void }>()
</script>

<template>
  <button
    type="button"
    class="persona-card"
    :class="[`persona-card--${props.persona.tone}`, { 'persona-card--selected': props.selected }]"
    :data-persona="props.persona.id"
    @click="emit('pick')"
  >
    <span class="persona-card__emoji" aria-hidden="true">{{ props.persona.emoji }}</span>
    <span class="persona-card__name">{{ $t(props.persona.nameKey) }}</span>
    <span class="persona-card__trait">{{ $t(props.persona.traitKey) }}</span>
    <span class="persona-card__stars" :aria-label="`${props.persona.difficulty}/3`">
      <i v-for="n in 3" :key="n" :class="{ filled: n <= props.persona.difficulty }">★</i>
    </span>
  </button>
</template>

<style lang="scss" scoped>
.persona-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  width: 100%;
  min-height: 170px;
  padding: 18px;
  border: 1px solid #2c5a7c;
  border-radius: 14px;
  text-align: left;
  background: linear-gradient(180deg, #142e47 0%, #0b1d2d 100%);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: var(--persona-accent);
  }

  &--blue {
    --persona-accent: #7ea8cc;
  }

  &--red {
    --persona-accent: #e35d6a;
  }

  &--green {
    --persona-accent: #35c48c;
  }

  &--selected {
    border-color: var(--persona-accent);
    box-shadow: 0 0 0 2px var(--persona-accent), 0 0 28px #00000055;
  }

  &__emoji {
    font-size: 30px;
    line-height: 1;
  }

  &__name {
    font-size: 17px;
    font-weight: 700;
    color: var(--persona-accent);
  }

  &__trait {
    font-size: 12px;
    line-height: 1.6;
    color: var(--dond-text-dim);
  }

  &__stars {
    display: flex;
    gap: 2px;
    margin-top: auto;
    font-size: 12px;
    font-style: normal;

    i {
      color: #3b5670;
      font-style: normal;
    }

    i.filled {
      color: var(--dond-gold);
    }
  }
}
</style>
