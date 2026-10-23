<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import AmountBoard from './components/AmountBoard.vue'
import GameDialogs from './components/GameDialogs.vue'
import GameStatusBar from './components/GameStatusBar.vue'
import HelpDrawer from './components/HelpDrawer.vue'
import ModeBanner from './components/ModeBanner.vue'
import GameTable from './components/GameTable.vue'
import PlayerCaseStage from './components/PlayerCaseStage.vue'
import RevealChip from './components/RevealChip.vue'
import RoundHistory from './components/RoundHistory.vue'
import SetupScene from './components/SetupScene.vue'
import { useGameSession } from './useGameSession'
import { SetupPhaseEnum } from './types'

const {
  setupPhase,
  bankerId,
  personaId,
  mode,
  modeLabel,
  persona,
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
  canReopenResult,
  tableShaking,
  bestPrize,
  flashGrade,
  flashTone,
  bankerLine,
  bankerName,
  bankerTrait,
  bankerExpression,
  bankerConfidence,
  rage,
  noDealCount,
  offerMeta,
  isConspirator,
  conspiratorAsking,
  conspiratorAskAvailable,
  conspiratorAskUsed,
  conspiratorHints,
  audienceMembers,
  audienceRecommendations,
  audienceReactions,
  recommendedCaseNos,
  handleModeConfirm,
  handlePersonaPick,
  handlePersonaConfirm,
  handleBankerPick,
  handleBankerConfirm,
  handlePick,
  beginGame,
  resetDraw,
  handleSelect,
  handleConspiratorAsk,
  handleDeal,
  handleNoDeal,
  handlePersonaAction,
  handleSideBet,
  handleSwap,
  dismissResult,
  handleOpenResult
} = useGameSession()

const playing = computed(() => setupPhase.value === SetupPhaseEnum.playing)
const helpVisible = ref<boolean>(false)
const helpDrawerProps = computed(() => ({
  visible: helpVisible.value,
  mode: mode.value!,
  persona: persona.value!,
  bankerId: bankerId.value,
  bankerName: bankerName.value,
  bankerTrait: bankerTrait.value,
  sideBet: snapshot.value.bankerState.sideBet,
  plan: offerMeta.value?.plan ?? null,
  adviceText: adviceText.value,
  round: snapshot.value.round,
  totalRounds: snapshot.value.totalRounds,
  k: snapshot.value.k,
  topPrize: snapshot.value.topPrize,
  remainingCases: snapshot.value.remainingCaseCount
}))

watch(playing, (value) => {
  if (!value) helpVisible.value = false
})

const flashStyle = computed(() => {
  const tone = flashTone.value
  if (!tone) return {}
  return {
    background: `radial-gradient(circle at 50% 50%, transparent 42%, ${tone.glow} 100%)`
  }
})

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
      :mode="mode"
      :persona-id="personaId" :banker-id="bankerId"
      :draw-candidates="drawCandidates"
      :picked-index="pickedIndex"
      :draw-lowest-amount="drawLowestAmount"
      :top-prize="topPrize"
      @mode-confirm="handleModeConfirm"
      @persona-pick="handlePersonaPick"
      @persona-confirm="handlePersonaConfirm" @banker-pick="handleBankerPick" @banker-confirm="handleBankerConfirm"
      @pick="handlePick" @start="beginGame"
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
        :can-reopen-result="canReopenResult"
        @restart="resetDraw"
        @reopen-result="handleOpenResult"
        @open-help="helpVisible = true"
      />
      <ModeBanner v-if="mode" :mode="mode" />
      <p class="game-page__hint">{{ hint }}</p>
      <p v-if="errorText" class="game-page__error">{{ errorText }}</p>
      <RevealChip v-if="revealVisible" :opened="lastOpened" />
      <main class="game-page__main">
        <aside class="game-page__side">
          <PlayerCaseStage :stats="playerCaseStats" />
          <AmountBoard :rows="snapshot.amountRows" :last-opened="snapshot.lastOpened" />
        </aside>
        <GameTable
          :snapshot="snapshot" :grid-cases="gridCases"
          :banker-expression="bankerExpression" :banker-confidence="bankerConfidence"
          :rage="rage" :no-deal-count="noDealCount"
          :banker-line="bankerLine" :banker-name="bankerName" :banker-trait="bankerTrait"
          :offer-visible="offerVisible" :offer-meta="offerMeta"
          :advice-text="adviceText"
          :recommended-case-nos="recommendedCaseNos"
          :audience-members="audienceMembers"
          :audience-recommendations="audienceRecommendations"
          :audience-reactions="audienceReactions"
          :table-shaking="tableShaking"
          :is-conspirator="isConspirator"
          :conspirator-ask-available="conspiratorAskAvailable"
          :conspirator-ask-used="conspiratorAskUsed"
          :conspirator-asking="conspiratorAsking"
          :conspirator-hints="conspiratorHints"
          @select="handleSelect" @conspirator-ask="handleConspiratorAsk"
          @deal="handleDeal"
          @no-deal="handleNoDeal"
          @persona-action="handlePersonaAction" @side-bet="handleSideBet"
        />
      </main>
      <RoundHistory :logs="snapshot.logs" />
      <GameDialogs
        v-bind="dialogState"
        @swap="handleSwap"
        @restart="resetDraw"
        @dismiss="dismissResult"
      />
      <HelpDrawer v-if="mode && persona" v-bind="helpDrawerProps" @close="helpVisible = false" />
    </template>
    <div
      v-if="flashGrade"
      class="game-page__flash"
      :style="flashStyle"
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
    will-change: opacity;
    animation: game-flash 0.7s ease-out forwards;
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
