<script lang="ts" setup>
import type { GameModeDefinition } from '@/config/modes'

const props = defineProps<{ mode: GameModeDefinition }>()
</script>

<template>
  <section class="mode-banner" :class="`mode-banner--${props.mode.tone}`">
    <div class="mode-banner__head">
      <span class="mode-banner__label">{{ $t('ModeLabel') }}</span>
      <strong class="mode-banner__name">{{ $t(props.mode.nameKey) }}</strong>
      <span class="mode-banner__tagline">{{ $t(props.mode.taglineKey) }}</span>
      <span class="mode-banner__stat">{{ $t(props.mode.statKey) }}</span>
    </div>
    <ul class="mode-banner__rules">
      <li v-for="key in props.mode.ruleKeys" :key="key">{{ $t(key) }}</li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.mode-banner {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  align-items: center;
  padding: 9px 14px;
  border: 1px solid var(--mode-accent, var(--dond-gold-soft));
  border-radius: 9px;
  background: #0d2337;

  &--gold {
    --mode-accent: #f2c14e;
  }

  &--violet {
    --mode-accent: #b79cff;
  }

  &__head {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    align-items: baseline;
  }

  &__label {
    font-size: 10px;
    letter-spacing: 2px;
    color: var(--dond-text-dim);
  }

  &__name {
    font-size: 14px;
    color: var(--mode-accent);
  }

  &__tagline {
    font-size: 11px;
    color: #a8bfd6;
  }

  &__stat {
    font-size: 10px;
    color: var(--dond-text-dim);
  }

  &__rules {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 14px;
    font-size: 11px;
    line-height: 1.5;
    color: #a8bfd6;

    li::before {
      content: '›';
      margin-right: 4px;
      color: var(--mode-accent);
    }
  }
}
@media (max-width: 640px) {
  .mode-banner {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 7px 10px;

    &__head {
      gap: 2px 8px;
    }

    &__tagline {
      display: none;
    }

    &__name {
      font-size: 13px;
    }

    &__stat {
      font-size: 9px;
    }

    &__rules {
      gap: 1px 10px;
      font-size: 10px;
    }
  }
}
</style>
