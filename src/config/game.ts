/** Offer reference anchor mode (R-6.1.4) */
export type OfferBaseMode = 'mean' | 'rms'

/** Full per-game configuration. All money values are integer cents (R-8.1, §10) */
export interface GameConfig {
  /** Total cases: v1 supports fixed 26 cases only (R-4.2.7) */
  totalCases: number
  /** Base amount table excluding the top prize, in cents, ascending (R-4.2.1) */
  baseAmounts: number[]
  /** Top prize amount in cents (R-4.2.2) */
  topPrize: number
  /** Lower bound of k, inclusive, default 2 (R-4.1.2) */
  kMin: number
  /** Upper bound of k, inclusive, default 6 (fun-first range, hard limit 13) */
  kMax: number
  /** Weights for drawing k, index 0 maps to kMin; null means uniform (R-4.1.3) */
  kWeights: number[] | null
  /** Whether k is drawn randomly (R-4.1.6) */
  randomKEnabled: boolean
  /** Fixed k used when randomKEnabled is false (R-4.1.6) */
  fixedK: number
  /** Cases opened per round, length must be 9 (R-5.1.2) */
  openSequence: number[]
  /** Offer reference anchor (R-6.1.4) */
  offerBaseMode: OfferBaseMode
  /** Mean-mode multiplier curve (R-6.2.3) */
  offerMultipliers: number[]
  /** RMS-mode multiplier curve (R-6.2.3) */
  rmsMultipliers: number[]
  /** Offer random jitter ratio, 0 disables it (R-6.2.4) */
  jitterRatio: number
  /** Reserved switch for a random top prize; v1 refuses to start when true (R-10.1) */
  randomTopPrizeEnabled: boolean
  /** Whether the final swap chance is offered (R-7.3.2) */
  swapEnabled: boolean
  /** Random seed, null means a new game every time (R-10) */
  seed: number | null
}

/** Number of rounds (R-5.1.1) */
export const TOTAL_ROUNDS = 9

/** Absolute k range (R-4.1.2) */
export const K_ABSOLUTE_MIN = 2
export const K_ABSOLUTE_MAX = 13

/** Base amount table, 25 items in cents (R-4.2.1) */
export const BASE_AMOUNTS_CENTS: number[] = [
  1,
  100,
  500,
  1_000,
  2_500,
  5_000,
  7_500,
  10_000,
  20_000,
  30_000,
  40_000,
  50_000,
  75_000,
  100_000,
  500_000,
  1_000_000,
  2_500_000,
  5_000_000,
  7_500_000,
  10_000_000,
  20_000_000,
  30_000_000,
  40_000_000,
  50_000_000,
  75_000_000
]

/** Default top prize: $1,000,000 (R-4.2.2) */
export const TOP_PRIZE_CENTS = 100_000_000

/** Default open sequence 6/5/4/3/2/1/1/1/1 (R-5.1.2) */
export const DEFAULT_OPEN_SEQUENCE: number[] = [6, 5, 4, 3, 2, 1, 1, 1, 1]

/** Default mean-mode multiplier curve (R-6.2.3) */
export const DEFAULT_MEAN_MULTIPLIERS: number[] = [0.15, 0.21, 0.28, 0.37, 0.48, 0.6, 0.72, 0.83, 0.92]

/** Default RMS-mode multiplier curve (R-6.2.3) */
export const DEFAULT_RMS_MULTIPLIERS: number[] = [0.1, 0.14, 0.19, 0.25, 0.33, 0.42, 0.52, 0.63, 0.74]

/** Build a config with defaults, optionally overridden; arrays are copied */
export function createGameConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    totalCases: 26,
    baseAmounts: [...BASE_AMOUNTS_CENTS],
    topPrize: TOP_PRIZE_CENTS,
    kMin: 2,
    kMax: 6,
    kWeights: null,
    randomKEnabled: true,
    fixedK: 2,
    openSequence: [...DEFAULT_OPEN_SEQUENCE],
    offerBaseMode: 'mean',
    offerMultipliers: [...DEFAULT_MEAN_MULTIPLIERS],
    rmsMultipliers: [...DEFAULT_RMS_MULTIPLIERS],
    jitterRatio: 0,
    randomTopPrizeEnabled: false,
    swapEnabled: true,
    seed: null,
    ...overrides
  }
}
