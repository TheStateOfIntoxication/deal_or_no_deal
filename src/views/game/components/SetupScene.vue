<script lang="ts" setup>
import { computed } from 'vue'
import { getGameMode } from '@/config/modes'
import type { BankerProfileEnum } from '@/config/bankers'
import type { GameModeDefinition } from '@/config/modes'
import { PLAYER_PERSONAS } from '@/config/personas'
import type { GameModeEnum, PlayerPersonaEnum } from '@/types/game'
import BankerPicker from './BankerPicker.vue'
import DrawPanel from './DrawPanel.vue'
import JackpotIntro from './JackpotIntro.vue'
import ModeCard from './ModeCard.vue'
import PersonaCarousel from './PersonaCarousel.vue'
import { SetupPhaseEnum } from '../types'
import type { ModeCardState } from '../services/ModeDeckBuilder'

const props = defineProps<{
  setupPhase: SetupPhaseEnum
  modeDeck: ModeCardState[]
  selectedMode: GameModeEnum | null
  mode: GameModeDefinition | null
  personaId: PlayerPersonaEnum | null
  bankerId: BankerProfileEnum | null
  modeFaceUp: boolean
  drawCandidates: number[]
  pickedIndex: number | null
  drawLowestAmount: number
  topPrize: number
}>()

const emit = defineEmits<{
  (e: 'mode-pick', index: number): void
  (e: 'mode-rethink'): void
  (e: 'mode-confirm'): void
  (e: 'persona-pick', id: PlayerPersonaEnum): void
  (e: 'persona-confirm'): void
  (e: 'banker-pick', id: BankerProfileEnum): void
  (e: 'banker-confirm'): void
  (e: 'pick', index: number): void
  (e: 'start'): void
}>()

const isBankerStep = computed(() => props.setupPhase === SetupPhaseEnum.bankerPick)
const isModeStep = computed(
  () =>
    props.setupPhase === SetupPhaseEnum.modeDraw ||
    props.setupPhase === SetupPhaseEnum.modeReveal
)
const title = computed(() => {
  if (isModeStep.value) return 'SetupModeTitle'
  if (props.setupPhase === SetupPhaseEnum.personaPick) return 'SetupPersonaTitle'
  if (isBankerStep.value) return 'SetupBankerTitle'
  return props.mode?.nameKey ?? 'SetupModeTitle'
})
const hint = computed(() => {
  if (isModeStep.value) return 'SetupModeHint'
  if (props.setupPhase === SetupPhaseEnum.personaPick) return 'SetupPersonaHint'
  if (isBankerStep.value) return 'SetupBankerHint'
  return props.mode?.descKey ?? 'SetupModeHint'
})
const modeOf = (modeId: GameModeEnum): GameModeDefinition => getGameMode(modeId)
</script>

<template>
  <section class="setup">
    <header class="setup__head">
      <p class="setup__eyebrow">{{ $t('GameSubtitle') }}</p>
      <h2 class="setup__title">{{ $t(title) }}</h2>
      <p class="setup__hint">{{ $t(hint) }}</p>
    </header>

    <div v-if="isModeStep" class="setup__modes">
      <ModeCard
        v-for="(card, index) in modeDeck"
        :key="card.modeId"
        :mode="modeOf(card.modeId)"
        :revealed="card.revealed || props.modeFaceUp"
        :selected="selectedMode === card.modeId"
        :disabled="!props.modeFaceUp && setupPhase === SetupPhaseEnum.modeReveal && !card.revealed"
        @pick="emit('mode-pick', index)"
      />
    </div>

    <div v-if="setupPhase === SetupPhaseEnum.modeReveal && mode" class="setup__detail">
      <strong>{{ $t(mode.nameKey) }}</strong>
      <span>{{ $t(mode.taglineKey) }}</span>
      <span class="setup__detail-stat">{{ $t(mode.statKey) }}</span>
    </div>

    <div v-if="setupPhase === SetupPhaseEnum.modeReveal" class="setup__actions">
      <el-button plain size="large" @click="emit('mode-rethink')">
        {{ $t('ModeRethink') }}
      </el-button>
      <el-button type="warning" size="large" @click="emit('mode-confirm')">
        {{ $t('ModeConfirm') }}
      </el-button>
    </div>

    <template v-if="setupPhase === SetupPhaseEnum.personaPick">
      <PersonaCarousel
        :personas="PLAYER_PERSONAS"
        :selected-id="personaId"
        @pick="emit('persona-pick', $event)"
        @confirm="emit('persona-confirm')"
      />
      <div class="setup__actions">
        <el-button
          type="warning"
          size="large"
          :disabled="!personaId"
          @click="emit('persona-confirm')"
        >
          {{ $t('PersonaConfirm') }}
        </el-button>
      </div>
    </template>

    <BankerPicker
      v-if="setupPhase === SetupPhaseEnum.bankerPick"
      :selected="bankerId"
      @pick="emit('banker-pick', $event)"
      @confirm="emit('banker-confirm')"
    />

    <template v-if="setupPhase === SetupPhaseEnum.modeSetup">
      <DrawPanel
        v-if="mode?.setup === 'k-draw'"
        :visible="true"
        :candidates="drawCandidates"
        :picked-index="pickedIndex"
        :lowest-amount="drawLowestAmount"
        :top-prize="topPrize"
        @pick="emit('pick', $event)"
        @start="emit('start')"
      />
      <JackpotIntro v-else :top-prize="topPrize" @start="emit('start')" />
    </template>
  </section>
</template>

<style lang="scss" scoped>
.setup {
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: center;
  width: min(820px, 100%);
  margin: 0 auto;
  padding: 24px clamp(14px, 3vw, 28px) 30px;

  &__head {
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: center;
    text-align: center;
  }

  &__eyebrow {
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--dond-text-dim);
  }

  &__title {
    font-size: 24px;
    letter-spacing: 2px;
    color: var(--dond-gold);
  }

  &__hint {
    max-width: 560px;
    font-size: 12px;
    line-height: 1.7;
    color: var(--dond-text-dim);
  }

  &__modes {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
    width: 100%;
  }

  &__detail {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    align-items: baseline;
    justify-content: center;
    max-width: 720px;
    padding: 10px 16px;
    border: 1px solid var(--dond-gold-soft);
    border-radius: 10px;
    font-size: 12px;
    color: var(--dond-text-dim);
    background: #0d2337;

    strong {
      color: var(--dond-gold);
    }
  }

  &__detail-stat {
    color: #a8bfd6;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
  }

}

</style>
