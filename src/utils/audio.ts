let audioContext: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}

/** Play a synthesized tone; the caller decides whether sound is enabled */
export function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.06
): void {
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
