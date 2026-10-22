<script lang="ts" setup>
import { computed } from 'vue'
import AmountBoard from './components/AmountBoard.vue'
import GameDialogs from './components/GameDialogs.vue'
import GameStatusBar from './components/GameStatusBar.vue'
import GameTable from './components/GameTable.vue'
import PlayerCaseStage from './components/PlayerCaseStage.vue'
import RevealChip from './components/RevealChip.vue'
import RoundHistory from './components/RoundHistory.vue'
import SetupScene from './components/SetupScene.vue'
import { useGameSession } from './useGameSession'
import { SetupPhaseEnum } from './types'

const {
  setupPhase,
  modeDeck,
  selectedMode,
  personaId,
  mode,
  modeLabel,
  personaLabel,
  topPrizeLabel,
  drawCandidates,
  pickedIndex,
  drawLowestAmount,
  topPrize,
  snapshot,
  errorText,
  hint,
  adviceText,
  gridCases,
  playerCaseStats,
  revealVisible,
  lastOpened,
  offerVisible,
  swapVisible,
  resultVisible,
  tableShaking,
  bestPrize,
  flashGrade,
  bankerLine,
  bankerName,
  bankerTrait,
  bankerExpression,
  bankerConfidence,
  rage,
  noDealCount,
  offerMeta,
  audienceMembers,
  audienceRecommendations,
  audienceReactions,
  recommendedCaseNos,
  handleModePick,
  handleModeRethink,
  handleModeConfirm,
  handlePersonaPick,
  handlePersonaConfirm,
  handlePick,
  beginGame,
  resetDraw,
  handleSelect,
  handleDeal,
  handleNoDeal,
  handleSwap,
  dismissResult
} = useGameSession()

const playing = computed(() => setupPhase.value === SetupPhaseEnum.playing)

const dialogState = computed(() => ({
  swapVisible: swapVisible.value,
  resultVisible: resultVisible.value,
  result: snapshot.value.result,
  bestPrize: bestPrize.value,
  highestOffer: snapshot.value.highestOffer,
  playerCaseNo: playerCaseStats.value.caseNo ?? 0,
  otherCaseNo: gridCases.value[0]?.no ?? 0,
  remainingAmounts: snapshot.value.remainingAmounts,
  topPrizeRemaining: snapshot.value.topPrizeRemaining,
  lastOffer: snapshot.value.logs.at(-1)?.offer ?? 0,
  bankerConfidence: snapshot.value.bankerConfidence,
  personaId: snapshot.value.personaId
}))
</script>

<template>
  <div class="game-page" :class="{ 'game-page--setup': !playing }">
    <p v-if="errorText && !playing" class="game-page__error">{{ errorText }}</p>
    <SetupScene
      v-if="!playing"
      :setup-phase="setupPhase"
      :mode-deck="modeDeck"
      :selected-mode="selectedMode"
      :mode="mode"
      :persona-id="personaId"
      :draw-candidates="drawCandidates"
      :picked-index="pickedIndex"
      :draw-lowest-amount="drawLowestAmount"
      :top-prize="topPrize"
      @mode-pick="handleModePick"
      @mode-rethink="handleModeRethink"
      @mode-confirm="handleModeConfirm"
      @persona-pick="handlePersonaPick"
      @persona-confirm="handlePersonaConfirm"
      @pick="handlePick"
      @start="beginGame"
    />

    <template v-else>
      <GameStatusBar
        :round="snapshot.round"
        :total-rounds="snapshot.totalRounds"
        :top-prize-label="topPrizeLabel"
        :mode-label="modeLabel"
        :persona-label="personaLabel"
        :remaining-cases="snapshot.remainingCaseCount"
        :remaining-to-open="snapshot.remainingToOpen"
        @restart="resetDraw"
      />
      <p class="game-page__hint">{{ hint }}</p>
      <p v-if="errorText" class="game-page__error">{{ errorText }}</p>
      <RevealChip v-if="revealVisible" :opened="lastOpened" />
      <main class="game-page__main">
        <aside class="game-page__side">
          <PlayerCaseStage :stats="playerCaseStats" />
          <AmountBoard :rows="snapshot.amountRows" :last-opened="snapshot.lastOpened" />
        </aside>
        <GameTable
          :snapshot="snapshot"
          :grid-cases="gridCases"
          :banker-expression="bankerExpression"
          :banker-confidence="bankerConfidence"
          :rage="rage"
          :no-deal-count="noDealCount"
          :banker-line="bankerLine"
          :banker-name="bankerName"
          :banker-trait="bankerTrait"
          :offer-visible="offerVisible"
          :offer-meta="offerMeta"
          :advice-text="adviceText"
          :recommended-case-nos="recommendedCaseNos"
          :audience-members="audienceMembers"
          :audience-recommendations="audienceRecommendations"
          :audience-reactions="audienceReactions"
          :table-shaking="tableShaking"
          @select="handleSelect"
          @deal="handleDeal"
          @no-deal="handleNoDeal"
        />
      </main>
      <RoundHistory :logs="snapshot.logs" />
      <GameDialogs
        v-bind="dialogState"
        @swap="handleSwap"
        @restart="resetDraw"
        @dismiss="dismissResult"
      />
    </template>

    <div
      v-if="flashGrade"
      class="game-page__flash"
      :class="`game-page__flash--${flashGrade}`"
    />
  </div>
</template>

<style lang="scss" scoped>
.game-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100vh;
  padding: 16px clamp(14px, 3vw, 40px) 28px;

  &--setup {
    justify-content: center;
    padding-top: 24px;
    padding-bottom: 24px;
  }

  &__hint {
    font-size: 15px;
    letter-spacing: 0.5px;
    text-align: center;
    color: var(--dond-text-dim);
  }

  &__error {
    font-size: 13px;
    text-align: center;
    color: var(--dond-danger);
  }

  &__main {
    display: grid;
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }

  &__side {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__flash {
    position: fixed;
    inset: 0;
    z-index: 60;
    pointer-events: none;
    animation: game-flash 0.7s ease-out forwards;

    &--good {
      box-shadow: inset 0 0 140px 36px #35c48c66;
    }

    &--neutral,
    &--normal {
      box-shadow: inset 0 0 110px 26px #7ea8cc44;
    }

    &--bad {
      box-shadow: inset 0 0 130px 32px #e08b3a66;
    }

    &--disaster {
      box-shadow: inset 0 0 160px 44px #e35d6a88;
    }

    &--small {
      box-shadow: inset 0 0 110px 24px #4d6f8f44;
    }

    &--big {
      box-shadow: inset 0 0 150px 40px #35c48c77;
    }

    &--jackpot {
      box-shadow: inset 0 0 190px 56px #f2c14e88;
    }
  }
}

@media (max-width: 900px) {
  .game-page__main {
    grid-template-columns: minmax(0, 1fr);
  }
}

@keyframes game-flash {
  0% {
    opacity: 0;
  }

  18% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}
</style>
