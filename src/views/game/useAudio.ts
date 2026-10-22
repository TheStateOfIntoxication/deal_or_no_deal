import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useStore } from '@/store'
import { AmountGradeEnum, PayoutGradeEnum } from '@/types/game'
import { playTone } from '@/utils/audio'

/** 音效开关（Vuex settings）与各类提示音 */
export interface AudioApi {
  muted: ComputedRef<boolean>
  toggleMuted: () => void
  playOpen: () => void
  playOffer: () => void
  playGrade: (grade: AmountGradeEnum) => void
  playPayout: (grade: PayoutGradeEnum) => void
  playDraw: () => void
}

/** 合成音效：零外部素材；开关状态由 Vuex settings 统一管理（R-6.4 之外的表现层） */
export function useAudio(): AudioApi {
  const store = useStore()
  const muted = computed(() => store.state.settings.muted)

  const tone = (
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.06
  ): void => {
    if (!muted.value) playTone(frequency, duration, type, gain)
  }

  const later = (
    delay: number,
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.06
  ): void => {
    window.setTimeout(() => {
      if (!muted.value) playTone(frequency, duration, type, gain)
    }, delay)
  }

  return {
    muted,
    toggleMuted: (): void => {
      void store.dispatch('settings/toggleMuted')
    },
    playOpen: (): void => tone(520, 0.16),
    playOffer: (): void => {
      tone(392, 0.18)
      later(140, 523, 0.24)
    },
    playGrade: (grade: AmountGradeEnum): void => {
      switch (grade) {
        case AmountGradeEnum.disaster:
          tone(110, 0.55, 'sawtooth', 0.09)
          later(90, 78, 0.6, 'sawtooth', 0.07)
          break
        case AmountGradeEnum.bad:
          tone(220, 0.3, 'triangle', 0.07)
          later(120, 175, 0.35, 'triangle', 0.06)
          break
        case AmountGradeEnum.neutral:
          tone(330, 0.18, 'sine', 0.05)
          break
        case AmountGradeEnum.good:
          tone(587, 0.14, 'sine', 0.06)
          later(110, 784, 0.22, 'sine', 0.06)
          break
      }
    },
    playPayout: (grade: PayoutGradeEnum): void => {
      switch (grade) {
        case PayoutGradeEnum.jackpot:
          ;[523, 659, 784, 1047, 1319].forEach((frequency, index) => {
            later(index * 120, frequency, 0.28, 'sine', 0.09)
          })
          break
        case PayoutGradeEnum.big:
          ;[523, 659, 784].forEach((frequency, index) => {
            later(index * 130, frequency, 0.28, 'sine', 0.08)
          })
          break
        case PayoutGradeEnum.normal:
          tone(440, 0.2, 'sine', 0.06)
          later(150, 523, 0.26, 'sine', 0.06)
          break
        case PayoutGradeEnum.small:
          tone(330, 0.3, 'triangle', 0.05)
          later(160, 262, 0.38, 'triangle', 0.05)
          break
      }
    },
    playDraw: (): void => {
      tone(523, 0.12, 'sine', 0.06)
      later(90, 659, 0.12, 'sine', 0.06)
      later(180, 880, 0.24, 'sine', 0.07)
    }
  }
}
