/** Where the prize came from: accepted Deal offer, the final opened case, or an early-certainty settlement */
export type DecidedByType = 'deal' | 'case' | 'certainty'

/** Pre-game mode cards */
export enum GameModeEnum {
  classic = 'classic',
  jackpot = 'jackpot'
}

/** Player character chosen after the mode card */
export enum PlayerPersonaEnum {
  pragmatic = 'pragmatic',
  gambler = 'gambler',
  conformist = 'conformist',
  restorer = 'restorer',
  raiser = 'raiser',
  closer = 'closer',
  host = 'host',
  holdout = 'holdout',
  lucky = 'lucky',
  admin = 'admin'
}

/** One-off active ability shown during an offer */
export enum PersonaActionEnum {
  hostHype = 'hostHype',
  hostCalm = 'hostCalm'
}

/** Banker's per-round plan */
export enum BankerPlanEnum {
  steady = 'steady',
  lowball = 'lowball',
  rebate = 'rebate',
  generous = 'generous',
  finalPush = 'finalPush'
}

/** Audience member temperament (flavor only) */
export enum AudienceTraitEnum {
  hype = 'hype',
  cautious = 'cautious',
  gambler = 'gambler',
  superstitious = 'superstitious'
}

/** Audience reaction to the case they recommended */
export enum AudienceReactionEnum {
  happy = 'happy',
  guilty = 'guilty',
  neutral = 'neutral'
}

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
