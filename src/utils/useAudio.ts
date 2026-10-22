import { ref } from 'vue'
import { AmountGradeEnum, PayoutGradeEnum } from '@/types/game'

const muted = ref<boolean>(false)
let audioContext: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}

/** Synthesized WebAudio tones: no external assets, no licensing risk */
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.06
): void {
  if (muted.value) return
  const context = getContext()
  if (!context) return
  if (context.state === 'suspended') void context.resume()
  const oscillator = context.createOscillator()
  const volume = context.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  volume.gain.value = gain
  volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
  oscillator.connect(volume)
  volume.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + duration)
}

function playSequence(frequencies: number[], gap: number, gain = 0.08): void {
  frequencies.forEach((frequency, index) => {
    window.setTimeout(() => playTone(frequency, 0.28, 'sine', gain), index * gap)
  })
}

/** Mute switch plus a few fixed cues */
export function useAudio(): {
  muted: typeof muted
  toggleMuted: () => void
  playOpen: () => void
  playOffer: () => void
  playGrade: (grade: AmountGradeEnum) => void
  playPayout: (grade: PayoutGradeEnum) => void
  playDraw: () => void
} {
  return {
    muted,
    toggleMuted: (): void => {
      muted.value = !muted.value
    },
    playOpen: (): void => playTone(520, 0.16),
    playDraw: (): void => {
      playTone(523, 0.12, 'sine', 0.06)
      window.setTimeout(() => playTone(659, 0.12, 'sine', 0.06), 90)
      window.setTimeout(() => playTone(880, 0.24, 'sine', 0.07), 180)
    },
    playOffer: (): void => {
      playTone(392, 0.18)
      window.setTimeout(() => playTone(523, 0.24), 140)
    },
    playGrade: (grade: AmountGradeEnum): void => {
      switch (grade) {
        case AmountGradeEnum.disaster:
          playTone(110, 0.55, 'sawtooth', 0.09)
          window.setTimeout(() => playTone(78, 0.6, 'sawtooth', 0.07), 90)
          break
        case AmountGradeEnum.bad:
          playTone(220, 0.3, 'triangle', 0.07)
          window.setTimeout(() => playTone(175, 0.35, 'triangle', 0.06), 120)
          break
        case AmountGradeEnum.neutral:
          playTone(330, 0.18, 'sine', 0.05)
          break
        case AmountGradeEnum.good:
          playTone(587, 0.14, 'sine', 0.06)
          window.setTimeout(() => playTone(784, 0.22, 'sine', 0.06), 110)
          break
      }
    },
    playPayout: (grade: PayoutGradeEnum): void => {
      switch (grade) {
        case PayoutGradeEnum.jackpot:
          playSequence([523, 659, 784, 1047, 1319], 120, 0.09)
          break
        case PayoutGradeEnum.big:
          playSequence([523, 659, 784], 130)
          break
        case PayoutGradeEnum.normal:
          playTone(440, 0.2, 'sine', 0.06)
          window.setTimeout(() => playTone(523, 0.26, 'sine', 0.06), 150)
          break
        case PayoutGradeEnum.small:
          playTone(330, 0.3, 'triangle', 0.05)
          window.setTimeout(() => playTone(262, 0.38, 'triangle', 0.05), 160)
          break
      }
    }
  }
}
