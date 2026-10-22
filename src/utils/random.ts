/** Deterministic pseudo-random source, used to reproduce a game (R-10 seed) */
export interface RandomSource {
  seed: number
  next: () => number
}

/** FNV-1a 32-bit hash: derive independent random streams from one session seed */
export function deriveSeed(seed: number, salt: string): number {
  let hash = (2166136261 ^ (seed >>> 0)) >>> 0
  for (let index = 0; index < salt.length; index += 1) {
    hash ^= salt.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** New session seed; crypto when available so decks do not repeat */
export function createSeed(): number {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.getRandomValues) {
    const buffer = new Uint32Array(1)
    cryptoApi.getRandomValues(buffer)
    return buffer[0] as number
  }
  return Math.floor(Math.random() * 0xffffffff)
}

/**
 * mulberry32: deterministic random source for a given seed
 * @param seed seed value; a random one is generated when omitted
 */
export function createRandom(seed?: number | null): RandomSource {
  const initial = seed ?? Math.floor(Math.random() * 0xffffffff)
  let state = initial >>> 0
  return {
    seed: initial,
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0
      let value = state
      value = Math.imul(value ^ (value >>> 15), value | 1)
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296
    }
  }
}

/** Fisher-Yates shuffle; returns a new array and never mutates the input (R-4.3.1) */
export function shuffle<T>(list: readonly T[], random: RandomSource): T[] {
  const result = [...list]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random.next() * (index + 1))
    const current = result[index] as T
    result[index] = result[target] as T
    result[target] = current
  }
  return result
}
