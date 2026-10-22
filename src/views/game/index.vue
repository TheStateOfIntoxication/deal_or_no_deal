<script lang="ts" setup>
import AmountBoard from './components/AmountBoard.vue'
import BankerCard from './components/BankerCard.vue'
import CaseGrid from './components/CaseGrid.vue'
import DrawPanel from './components/DrawPanel.vue'
import GameStatusBar from './components/GameStatusBar.vue'
import OfferPanel from './components/OfferPanel.vue'
import PlayerCaseStage from './components/PlayerCaseStage.vue'
import ResultDialog from './components/ResultDialog.vue'
import RevealChip from './components/RevealChip.vue'
import RoundHistory from './components/RoundHistory.vue'
import SwapDialog from './components/SwapDialog.vue'
import { useGameSession } from './useGameSession'

const {
  drawing,
  drawCandidates,
  pickedIndex,
  drawLowestAmount,
  topPrize,
  snapshot,
  errorText,
  hint,
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
  bankerExpression,
  bankerConfidence,
  rage,
  noDealCount,
  offerMeta,
  handlePick,
  beginGame,
  resetDraw,
  handleSelect,
  handleDeal,
  handleNoDeal,
  handleSwap,
  dismissResult
} = useGameSession()
</script>

<template>
  <div class="game-page" :class="{ 'game-page--drawing': drawing }">
    <template v-if="drawing">
      <p v-if="errorText" class="game-page__error">{{ errorText }}</p>
      <DrawPanel
        :visible="true"
        :candidates="drawCandidates"
        :picked-index="pickedIndex"
        :lowest-amount="drawLowestAmount"
        :top-prize="topPrize"
        @pick="handlePick"
        @start="beginGame"
      />
    </template>

    <template v-else>
      <GameStatusBar
        :round="snapshot.round"
        :total-rounds="snapshot.totalRounds"
        :million-count="snapshot.k"
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
          <AmountBoard :rows="snapshot.amountRows" />
        </aside>
        <section class="game-page__table" :class="{ 'game-page__table--shake': tableShaking }">
          <BankerCard
            :expression="bankerExpression"
            :confidence="bankerConfidence"
            :rage="rage"
            :no-deal-count="noDealCount"
            :line="bankerLine"
            :top-prize="snapshot.topPrize"
          />
          <OfferPanel
            :visible="offerVisible"
            :round="snapshot.round"
            :offer="snapshot.currentOffer ?? 0"
            :remaining-amounts="snapshot.remainingAmounts"
            :round-opened="snapshot.roundOpened"
            :fear="offerMeta?.fear ?? 0"
            :rage-penalty="offerMeta?.ragePenalty ?? 0"
            @deal="handleDeal"
            @no-deal="handleNoDeal"
          />
          <CaseGrid
            :cases="gridCases"
            :phase="snapshot.phase"
            :remaining-to-open="snapshot.remainingToOpen"
            @select="handleSelect"
          />
        </section>
      </main>
      <RoundHistory :logs="snapshot.logs" />
      <SwapDialog
        :visible="swapVisible"
        :player-case-no="playerCaseStats.caseNo ?? 0"
        :other-case-no="gridCases[0]?.no ?? 0"
        @decide="handleSwap"
      />
      <ResultDialog
        :visible="resultVisible"
        :result="snapshot.result"
        :best-prize="bestPrize"
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

  &--drawing {
    align-items: center;
    justify-content: center;
    padding-top: 28px;
    padding-bottom: 28px;
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

  &__table {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
    border: 1px solid var(--dond-gold-soft);
    border-radius: var(--dond-radius);
    background: linear-gradient(180deg, #123a2c 0%, #0a1c26 100%);

    &--shake {
      animation: game-table-shake 0.45s ease-in-out;
    }
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

@keyframes game-table-shake {
  0%,
  100% {
    transform: translateX(0);
  }

  20% {
    transform: translateX(-5px);
  }

  40% {
    transform: translateX(4px);
  }

  60% {
    transform: translateX(-3px);
  }

  80% {
    transform: translateX(2px);
  }
}
</style>
