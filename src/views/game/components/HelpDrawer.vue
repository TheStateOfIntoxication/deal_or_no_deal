<script lang="ts" setup>
import { computed } from 'vue'
import { BankerProfileEnum } from '@/config/bankers'
import type { GameModeDefinition } from '@/config/modes'
import type { PlayerPersonaDefinition } from '@/config/personas'
import { t } from '@/language'
import { formatMoney } from '@/utils/money'
import { formatSignedPercent } from '@/utils/percent'
import { BANKER_PLAN_LABEL_KEYS } from '../bankerLines'
import type { BankerPlanState, BankerSideBetState } from '../types'

const props = defineProps<{
  visible: boolean
  mode: GameModeDefinition
  persona: PlayerPersonaDefinition
  bankerId: BankerProfileEnum
  bankerName: string
  bankerTrait: string
  sideBet: BankerSideBetState | null
  plan: BankerPlanState | null
  adviceText: string
  round: number
  totalRounds: number
  k: number
  topPrize: number
  remainingCases: number
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const personaAdvice = computed(
  () => props.adviceText || t(props.persona.adviceHoldKey)
)

const planText = computed(() => {
  if (!props.plan) return t('HelpPlanNone')
  return `${t(BANKER_PLAN_LABEL_KEYS[props.plan.id])} ${formatSignedPercent(props.plan.delta)}`
})

const sideBetText = computed(() => {
  if (!props.sideBet) return t('HelpSideBetNone')
  return `${t(props.sideBet.labelKey)} · ${t('BankerCasinoBetTerms', {
    win: formatSignedPercent(props.sideBet.winFactor - 1),
    loss: formatSignedPercent(props.sideBet.lossFactor - 1)
  })}`
})

const isConspirator = computed(() => props.bankerId === BankerProfileEnum.conspirator)
</script>

<template>
  <el-drawer
    class="help-drawer"
    :model-value="props.visible"
    direction="rtl"
    size="min(440px, 94vw)"
    :with-header="false"
    :append-to-body="true"
    @close="emit('close')"
  >
    <div class="help">
      <header class="help__head">
        <div>
          <p class="help__eyebrow">{{ $t('GameSubtitle') }}</p>
          <h2 class="help__title">{{ $t('HelpTitle') }}</h2>
          <p class="help__hint">{{ $t('HelpHint') }}</p>
        </div>
        <button
          type="button"
          class="help__close"
          :aria-label="$t('HelpTitle')"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <div class="help__stats">
        <span>
          <em>{{ $t('HelpLabelRound') }}</em>
          {{ round }} / {{ totalRounds }}
        </span>
        <span>
          <em>{{ $t('HelpLabelK') }}</em>
          {{ k }}
        </span>
        <span>
          <em>{{ $t('HelpLabelTopPrize') }}</em>
          {{ formatMoney(topPrize) }}
        </span>
        <span>
          <em>{{ $t('HelpLabelRemaining') }}</em>
          {{ remainingCases }}
        </span>
      </div>

      <section class="help__section">
        <h3>{{ $t('HelpModeSection') }}</h3>
        <div class="help__heading">
          <strong>{{ $t(mode.nameKey) }}</strong>
          <span>{{ $t(mode.taglineKey) }}</span>
        </div>
        <p class="help__muted">{{ $t(mode.statKey) }}</p>
        <ul class="help__list">
          <li v-for="key in mode.ruleKeys" :key="key">{{ $t(key) }}</li>
        </ul>
      </section>

      <section class="help__section">
        <h3>{{ $t('HelpPersonaSection') }}</h3>
        <div class="help__heading">
          <strong>{{ $t(persona.nameKey) }}</strong>
        </div>
        <p class="help__trait">
          <span class="help__label">{{ $t('HelpLabelTrait') }}</span>
          {{ $t(persona.traitKey) }}
        </p>
        <p class="help__advice">
          <span class="help__label">{{ $t('HelpLabelAdvice') }}</span>
          {{ personaAdvice }}
        </p>
      </section>

      <section class="help__section">
        <h3>{{ $t('HelpBankerSection') }}</h3>
        <div class="help__heading">
          <strong>{{ bankerName }}</strong>
          <span>{{ bankerTrait }}</span>
        </div>
        <dl class="help__pairs">
          <div>
            <dt>{{ $t('HelpLabelPlan') }}</dt>
            <dd>{{ planText }}</dd>
          </div>
          <div>
            <dt>{{ $t('HelpLabelSideBet') }}</dt>
            <dd>{{ sideBetText }}</dd>
          </div>
        </dl>
        <p class="help__rule">{{ $t('HelpPlanRule') }}</p>
        <p v-if="isConspirator" class="help__tip">{{ $t('HelpConspiratorTip') }}</p>
      </section>

      <section class="help__section">
        <h3>{{ $t('HelpTermsSection') }}</h3>
        <dl class="help__terms">
          <div>
            <dt>{{ $t('HelpTermDealName') }}</dt>
            <dd>{{ $t('HelpTermDealDesc') }}</dd>
          </div>
          <div>
            <dt>{{ $t('HelpTermNoDealName') }}</dt>
            <dd>{{ $t('HelpTermNoDealDesc') }}</dd>
          </div>
          <div>
            <dt>{{ $t('HelpTermEvName') }}</dt>
            <dd>{{ $t('HelpTermEvDesc') }}</dd>
          </div>
          <div>
            <dt>{{ $t('HelpTermTopPrizeName') }}</dt>
            <dd>{{ $t('HelpTermTopPrizeDesc') }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </el-drawer>
</template>

<style lang="scss" scoped>
.help-drawer {
  :deep(.el-drawer__body) {
    padding: 0;
  }
}

.help {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding: 22px 20px 30px;
  color: var(--dond-text);
  background:
    radial-gradient(circle at 100% 0%, #1d3d5933 0%, transparent 42%),
    #0b1e30;

  &__head {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    justify-content: space-between;
  }

  &__eyebrow {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--dond-text-dim);
  }

  &__title {
    margin: 2px 0 4px;
    font-size: 24px;
    letter-spacing: 2px;
    color: var(--dond-gold);
  }

  &__hint {
    font-size: 11px;
    line-height: 1.5;
    color: var(--dond-text-dim);
  }

  &__close {
    flex: 0 0 auto;
    width: 30px;
    height: 30px;
    border: 1px solid var(--dond-gold-soft);
    border-radius: 50%;
    font-size: 20px;
    line-height: 1;
    color: var(--dond-gold);
    background: #ffffff08;
    cursor: pointer;

    &:hover {
      background: var(--dond-gold-soft);
    }
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    span {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 8px 10px;
      border: 1px solid #ffffff12;
      border-radius: 8px;
      font-size: 13px;
      color: #d7e4f0;
      background: #ffffff06;
    }

    em {
      font-size: 10px;
      font-style: normal;
      color: var(--dond-text-dim);
    }
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 12px;
    border: 1px solid var(--dond-gold-soft);
    border-radius: 10px;
    background: #ffffff05;

    h3 {
      font-size: 13px;
      letter-spacing: 1px;
      color: var(--dond-gold);
    }
  }

  &__heading {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    align-items: baseline;

    strong {
      font-size: 15px;
      color: #d8c9ff;
    }

    span {
      font-size: 11px;
      line-height: 1.5;
      color: var(--dond-text-dim);
    }
  }

  &__muted {
    font-size: 11px;
    color: #a8bfd6;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-left: 16px;
    font-size: 12px;
    line-height: 1.6;
    color: #c2d1df;
    list-style: disc;

    li::marker {
      color: var(--dond-gold);
    }
  }

  &__label {
    display: block;
    margin-bottom: 2px;
    font-size: 10px;
    letter-spacing: 1px;
    color: var(--dond-text-dim);
  }

  &__trait,
  &__advice,
  &__tip {
    font-size: 12px;
    line-height: 1.65;
    color: #c2d1df;
  }

  &__advice {
    color: #f0c878;
  }

  &__pairs {
    display: flex;
    flex-direction: column;
    gap: 7px;

    div {
      display: grid;
      grid-template-columns: 76px minmax(0, 1fr);
      gap: 8px;
      align-items: baseline;
    }

    dt {
      font-size: 10px;
      color: var(--dond-text-dim);
    }

    dd {
      font-size: 11px;
      line-height: 1.6;
      color: #c2d1df;
    }
  }

  &__rule {
    font-size: 11px;
    line-height: 1.6;
    color: #a8bfd6;
  }

  &__tip {
    padding: 7px 9px;
    border: 1px solid #b79cff4d;
    border-radius: 7px;
    color: #d8c9ff;
    background: #b79cff12;
  }

  &__terms {
    display: flex;
    flex-direction: column;
    gap: 9px;

    div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    dt {
      font-size: 11px;
      color: #f0c878;
    }

    dd {
      font-size: 11px;
      line-height: 1.6;
      color: #a8bfd6;
    }
  }
}

@media (max-width: 480px) {
  .help {
    padding: 18px 14px 24px;

    &__stats {
      grid-template-columns: 1fr;
    }

    &__pairs div {
      grid-template-columns: 64px minmax(0, 1fr);
    }
  }
}
</style>
