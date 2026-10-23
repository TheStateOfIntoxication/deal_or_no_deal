<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PlayerPersonaDefinition } from '@/config/personas'
import type { PlayerPersonaEnum } from '@/types/game'

const props = defineProps<{
  personas: PlayerPersonaDefinition[]
  selectedId: PlayerPersonaEnum | null
}>()

const emit = defineEmits<{
  (e: 'pick', id: PlayerPersonaEnum): void
  (e: 'confirm'): void
}>()

const activeIndex = ref(0)
const detailOpen = ref(false)
const touchStartX = ref<number | null>(null)
const suppressClick = ref(false)
let suppressTimer: number | undefined

const active = computed<PlayerPersonaDefinition>(
  () => props.personas[activeIndex.value] ?? props.personas[0] as PlayerPersonaDefinition
)
const previous = computed<PlayerPersonaDefinition | null>(() => {
  if (props.personas.length < 2) return null
  return props.personas[(activeIndex.value - 1 + props.personas.length) % props.personas.length] ?? null
})
const next = computed<PlayerPersonaDefinition | null>(() => {
  if (props.personas.length < 2) return null
  return props.personas[(activeIndex.value + 1) % props.personas.length] ?? null
})

const emitPick = (): void => {
  if (active.value) emit('pick', active.value.id)
}

const focusRelative = (step: number): void => {
  if (suppressClick.value) return
  moveRelative(step)
}

const moveRelative = (step: number): void => {
  if (props.personas.length === 0) return
  activeIndex.value =
    (activeIndex.value + step + props.personas.length) % props.personas.length
  detailOpen.value = false
  emitPick()
}

const showDetail = (): void => {
  if (suppressClick.value) return
  detailOpen.value = true
  emitPick()
}

const choose = (): void => {
  if (suppressClick.value) return
  emitPick()
  emit('confirm')
}

const handleTouchStart = (event: TouchEvent): void => {
  touchStartX.value = event.touches.length === 1 ? (event.touches[0]?.clientX ?? null) : null
}

const handleTouchEnd = (event: TouchEvent): void => {
  const start = touchStartX.value
  touchStartX.value = null
  if (start === null) return
  const end = event.changedTouches[0]?.clientX
  if (end === undefined) return
  const distance = end - start
  if (Math.abs(distance) < 40) return
  suppressClick.value = true
  moveRelative(distance < 0 ? 1 : -1)
  window.clearTimeout(suppressTimer)
  suppressTimer = window.setTimeout(() => {
    suppressClick.value = false
  }, 300)
}

const handleTouchCancel = (): void => {
  touchStartX.value = null
}

const starLabel = computed(() => `${active.value.difficulty}/3`)

watch(
  () => props.selectedId,
  (id) => {
    if (!id) return
    const index = props.personas.findIndex((item) => item.id === id)
    if (index >= 0 && index !== activeIndex.value) {
      activeIndex.value = index
      detailOpen.value = false
    }
  }
)

onMounted(() => {
  if (props.selectedId) {
    const index = props.personas.findIndex((item) => item.id === props.selectedId)
    if (index >= 0) activeIndex.value = index
  }
  emitPick()
})

onBeforeUnmount(() => {
  window.clearTimeout(suppressTimer)
})
</script>

<template>
  <section class="persona-carousel" aria-live="polite">
    <div
      class="persona-carousel__stage"
      @touchstart.passive="handleTouchStart"
      @touchend.passive="handleTouchEnd"
      @touchcancel="handleTouchCancel"
    >
      <button
        type="button"
        class="persona-carousel__arrow"
        :aria-label="$t('PersonaPrev')"
        @click="focusRelative(-1)"
      >
        ‹
      </button>

      <button
        v-if="previous"
        type="button"
        class="persona-carousel__peek persona-carousel__peek--left"
        :aria-label="$t(previous.nameKey)"
        @click="focusRelative(-1)"
      >
        <span class="persona-carousel__peek-emoji" aria-hidden="true">{{ previous.emoji }}</span>
        <span class="persona-carousel__peek-name">{{ $t(previous.nameKey) }}</span>
      </button>

      <button
        type="button"
        class="persona-carousel__card"
        :data-persona="active.id"
        :aria-label="$t(active.nameKey)"
        @click="showDetail"
        @dblclick="choose"
        @keydown.enter="choose"
      >
        <span class="persona-carousel__glow" aria-hidden="true" />
        <span class="persona-carousel__badge">{{ $t('PersonaSelected') }}</span>
        <span class="persona-carousel__emoji" aria-hidden="true">{{ active.emoji }}</span>
        <strong class="persona-carousel__name">{{ $t(active.nameKey) }}</strong>
        <span class="persona-carousel__tagline">{{ $t(active.adviceHoldKey) }}</span>
        <span class="persona-carousel__stars" :aria-label="starLabel">
          <i v-for="n in 3" :key="n" :class="{ filled: n <= active.difficulty }">★</i>
        </span>
      </button>

      <button
        v-if="next"
        type="button"
        class="persona-carousel__peek persona-carousel__peek--right"
        :aria-label="$t(next.nameKey)"
        @click="focusRelative(1)"
      >
        <span class="persona-carousel__peek-emoji" aria-hidden="true">{{ next.emoji }}</span>
        <span class="persona-carousel__peek-name">{{ $t(next.nameKey) }}</span>
      </button>

      <button
        type="button"
        class="persona-carousel__arrow"
        :aria-label="$t('PersonaNext')"
        @click="focusRelative(1)"
      >
        ›
      </button>
    </div>

    <div class="persona-carousel__detail" :class="{ 'persona-carousel__detail--open': detailOpen }">
      <p v-if="detailOpen" class="persona-carousel__trait">{{ $t(active.traitKey) }}</p>
      <p v-else class="persona-carousel__hint">{{ $t('PersonaDetailHint') }}</p>
      <p v-if="!detailOpen" class="persona-carousel__touch-hint">
        {{ $t('PersonaTouchHint') }}
      </p>
      <span class="persona-carousel__difficulty">
        {{ $t('PersonaDifficulty') }} {{ starLabel }}
      </span>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.persona-carousel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 16px 0 4px;

  &__stage {
    display: grid;
    grid-template-columns: 36px 108px minmax(220px, 300px) 108px 36px;
    gap: 12px;
    align-items: center;
    justify-content: center;
    width: 100%;
    touch-action: pan-y;
  }

  &__arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 54px;
    border: 1px solid #2c5a7c;
    border-radius: 999px;
    font-size: 28px;
    line-height: 1;
    color: var(--dond-gold);
    background: #0d2337;
    cursor: pointer;
    transition: border-color 0.15s ease, transform 0.15s ease;

    &:hover {
      border-color: var(--dond-gold);
      transform: scale(1.08);
    }
  }

  &__card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    min-height: 330px;
    padding: 24px 20px 18px;
    overflow: hidden;
    border: 1px solid var(--dond-gold);
    border-radius: 22px;
    text-align: center;
    background:
      radial-gradient(circle at 50% 0%, #2d4f70 0%, #102a42 45%, #091a2a 100%);
    box-shadow: 0 18px 42px #00000066, 0 0 34px #f2c14e22;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 22px 48px #00000077, 0 0 40px #f2c14e44;
    }

    &:active {
      transform: translateY(-1px) scale(0.99);
    }
  }

  &__glow {
    position: absolute;
    top: -80px;
    left: 50%;
    width: 240px;
    height: 240px;
    border-radius: 50%;
    background: radial-gradient(circle, #f2c14e44 0%, transparent 68%);
    transform: translateX(-50%);
    pointer-events: none;
  }

  &__badge {
    padding: 2px 9px;
    border-radius: 999px;
    font-size: 10px;
    letter-spacing: 1px;
    color: #08131f;
    background: var(--dond-gold);
  }

  &__emoji {
    position: relative;
    z-index: 1;
    margin-top: 6px;
    font-size: 68px;
    line-height: 1;
    filter: drop-shadow(0 8px 16px #00000055);
  }

  &__name {
    position: relative;
    z-index: 1;
    font-size: 24px;
    letter-spacing: 2px;
    color: var(--dond-gold);
  }

  &__tagline {
    min-height: 34px;
    font-size: 12px;
    line-height: 1.5;
    color: #a8bfd6;
  }

  &__stars {
    display: flex;
    gap: 4px;
    margin-top: auto;
    font-size: 15px;

    i {
      color: #3b5670;
      font-style: normal;
    }

    i.filled {
      color: var(--dond-gold);
      text-shadow: 0 0 10px #f2c14e88;
    }
  }

  &__peek {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 170px;
    padding: 12px 6px;
    border: 1px solid #2c5a7c;
    border-radius: 16px;
    background: linear-gradient(180deg, #142e47 0%, #0b1d2d 100%);
    cursor: pointer;
    opacity: 0.62;
    transform: scale(0.86);
    transition: opacity 0.18s ease, transform 0.18s ease, border-color 0.18s ease;

    &:hover {
      border-color: var(--dond-gold);
      opacity: 0.92;
      transform: scale(0.94);
    }
  }

  &__peek-emoji {
    font-size: 36px;
    line-height: 1;
  }

  &__peek-name {
    max-width: 100%;
    overflow: hidden;
    font-size: 11px;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--dond-text-dim);
  }

  &__detail {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    min-height: 50px;
    max-width: 560px;
    padding: 8px 16px;
    border-radius: 10px;
    text-align: center;
    background: #ffffff08;
    transition: background 0.18s ease;

    &--open {
      background: #f2c14e12;
    }
  }

  &__hint {
    font-size: 11px;
    color: var(--dond-text-dim);
  }

  &__touch-hint {
    display: none;
    font-size: 11px;
    color: var(--dond-text-dim);
  }

  &__trait {
    font-size: 12px;
    line-height: 1.6;
    color: var(--dond-text);
  }

  &__difficulty {
    font-size: 10px;
    color: #6f8aa3;
  }
}

@media (max-width: 760px) {
  .persona-carousel__stage {
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    gap: 8px;
  }

  .persona-carousel__peek {
    display: none;
  }

  .persona-carousel__arrow {
    width: 44px;
    height: 56px;
    font-size: 24px;
  }

  .persona-carousel__card {
    min-height: 290px;
    padding: 20px 16px 16px;
  }

  .persona-carousel__emoji {
    font-size: 58px;
  }

  .persona-carousel__hint {
    display: none;
  }

  .persona-carousel__touch-hint {
    display: block;
  }
}

@media (max-width: 420px) {
  .persona-carousel__stage {
    gap: 6px;
  }

  .persona-carousel__card {
    min-height: 260px;
    padding: 16px 12px 14px;
  }

  .persona-carousel__emoji {
    font-size: 52px;
  }

  .persona-carousel__name {
    font-size: 21px;
  }

  .persona-carousel__tagline {
    font-size: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .persona-carousel__card,
  .persona-carousel__peek,
  .persona-carousel__arrow {
    transition: none;
  }
}
</style>
