<script lang="ts" setup>
import { BANKER_PROFILES } from '@/config/bankers'
import type { BankerProfileEnum } from '@/config/bankers'

const props = defineProps<{
  selected: BankerProfileEnum | null
}>()

const emit = defineEmits<{
  (e: 'pick', id: BankerProfileEnum): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <section class="banker-picker">
    <div class="banker-picker__list">
      <button
        v-for="profile in BANKER_PROFILES"
        :key="profile.id"
        type="button"
        class="banker-picker__card"
        :class="[`banker-picker__card--${profile.tone}`, { 'banker-picker__card--selected': props.selected === profile.id }]"
        :data-banker="profile.id"
        @click="emit('pick', profile.id)"
      >
        <span class="banker-picker__emoji" aria-hidden="true">{{ profile.emoji }}</span>
        <strong class="banker-picker__name">{{ $t(profile.nameKey) }}</strong>
        <span class="banker-picker__trait">{{ $t(profile.traitKey) }}</span>
      </button>
    </div>
    <div class="banker-picker__actions">
      <el-button type="warning" size="large" :disabled="!props.selected" @click="emit('confirm')">
        {{ $t('BankerConfirm') }}
      </el-button>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.banker-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;

  &__list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
    min-height: 128px;
    padding: 14px;
    border: 1px solid #2c5a7c;
    border-radius: 12px;
    text-align: left;
    background: linear-gradient(180deg, #142e47 0%, #0b1d2d 100%);
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;

    &:hover {
      transform: translateY(-3px);
      border-color: var(--banker-accent);
    }

    &--gold {
      --banker-accent: #f2c14e;
    }

    &--green {
      --banker-accent: #35c48c;
    }

    &--violet {
      --banker-accent: #b79cff;
    }

    &--selected {
      border-color: var(--banker-accent);
      box-shadow: 0 0 0 2px var(--banker-accent), 0 0 24px #00000055;
    }
  }

  &__emoji {
    font-size: 28px;
    line-height: 1;
  }

  &__name {
    font-size: 15px;
    color: var(--banker-accent);
  }

  &__trait {
    font-size: 11px;
    line-height: 1.5;
    color: var(--dond-text-dim);
  }

  &__actions {
    display: flex;
    justify-content: center;
  }
}

@media (max-width: 720px) {
  .banker-picker__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
