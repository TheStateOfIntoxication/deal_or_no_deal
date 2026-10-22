/** Where the prize came from: accepted Deal offer, the final opened case, or an early-certainty settlement */
export type DecidedByType = 'deal' | 'case' | 'certainty'

/**
 * How good an opened amount is for the player, graded by its rank inside the pool.
 * `good` means a small amount left the game, `disaster` means a top amount did.
 */
export enum AmountGradeEnum {
  good = 'good',
  neutral = 'neutral',
  bad = 'bad',
  disaster = 'disaster'
}

/** Payout grade for the final prize: the higher the amount, the better (opposite of the opened-case grade) */
export enum PayoutGradeEnum {
  small = 'small',
  normal = 'normal',
  big = 'big',
  jackpot = 'jackpot'
}
