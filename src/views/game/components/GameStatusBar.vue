<script lang="ts" setup>
import { computed } from 'vue'
import { t } from '@/language'
import { useAudio } from '@/utils/useAudio'

const props = defineProps<{
  round: number
  totalRounds: number
  millionCount: number
  remainingCases: number
  remainingToOpen: number
}>()

const emit = defineEmits<{ (e: 'restart'): void }>()

const { muted, toggleMuted } = useAudio()
const roundProgress = computed(() =>
  t('LabelRoundProgress', { round: props.round, total: props.totalRounds })
)
</script>

<template>
  <header class="status-bar">
    <div class="status-bar__brand">
      <h1 class="status-bar__title">{{ $t('GameTitle') }}</h1>
      <span class="status-bar__subtitle">{{ $t('GameSubtitle') }}</span>
    </div>
    <dl class="status-bar__stats">
      <div class="status-bar__stat">
        <dt>{{ $t('LabelRound') }}</dt>
        <dd>{{ roundProgress }}</dd>
      </div>
      <div class="status-bar__stat">
        <dt>{{ $t('LabelRemainingCases') }}</dt>
        <dd>{{ remainingCases }}</dd>
      </div>
      <div class="status-bar__stat">
        <dt>{{ $t('LabelMillionCases') }}</dt>
        <dd>×{{ millionCount }}</dd>
      </div>
    </dl>
    <div class="status-bar__actions">
      <span v-if="remainingToOpen > 0" class="status-bar__quota">
        {{ $t('HintOpenShort', { count: remainingToOpen }) }}
      </span>
      <el-button
        circle
        text
        :title="muted ? $t('SoundOff') : $t('SoundOn')"
        @click="toggleMuted"
      >
        {{ muted ? '🔇' : '🔊' }}
      </el-button>
      <el-button type="warning" plain size="small" @click="emit('restart')">
        {{ $t('BtnRestart') }}
      </el-button>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border: 1px solid var(--dond-gold-soft);
  border-radius: var(--dond-radius);
  background: linear-gradient(90deg, #122e47 0%, #0b1e30 100%);

  &__brand {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  &__title {
    font-size: 22px;
    letter-spacing: 4px;
    color: var(--dond-gold);
  }

  &__subtitle {
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--dond-text-dim);
  }

  &__stats {
    display: flex;
    gap: 22px;
  }

  &__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 62px;

    dt {
      font-size: 11px;
      color: var(--dond-text-dim);
    }

    dd {
      font-size: 17px;
      font-weight: 600;
      color: var(--dond-text);
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__quota {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    color: var(--dond-gold);
    background: var(--dond-gold-soft);
  }
}
</style>
