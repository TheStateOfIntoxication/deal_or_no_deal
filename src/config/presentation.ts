/** Presentation-layer tuning knobs (not game rules; rules live in game.ts) */

/** How long the just-opened case stays in focus before the Banker's call appears (ms) */
export const REVEAL_HOLD_MS = 900

/** Duration of the full-screen grade flash (ms) */
export const FLASH_MS = 700

/** Grade thresholds: cumulative share of pool amounts at or below the opened amount */
export const GRADE_DISASTER_SHARE = 0.75
export const GRADE_BAD_SHARE = 0.5
export const GRADE_NEUTRAL_SHARE = 0.3

/** Top-prize probability milestones shown as a badge on the player case */
export const MILESTONE_HIGH = 0.75
export const MILESTONE_HALF = 0.5
export const MILESTONE_LOW = 0.25

/** Suspense before the final held case flips, in ms */
export const FINAL_REVEAL_MS = 1200

/** Extra delay after the final flip before the result panel appears, in ms */
export const RESULT_PANEL_DELAY_MS = 1200

/** Payout grade thresholds: cumulative share of pool amounts at or below the prize */
export const PAYOUT_BIG_SHARE = 0.75
export const PAYOUT_NORMAL_SHARE = 0.4

/** Banker rage: +15 per No Deal, capped at 100, resets every game */
export const RAGE_PER_NO_DEAL = 15
export const RAGE_MAX = 100

/** Rage tiers for portrait / taunts */
export const RAGE_TIER_ANNOYED = 33
export const RAGE_TIER_ANGRY = 66
export const RAGE_TIER_FURIOUS = 100

/** Max discount the banker applies out of spite (6%) */
export const RAGE_MAX_PENALTY = 0.06

/** Fear adjustment: the higher the jackpot odds, the more he must pay (+8% at most) */
export const FEAR_GAIN = 0.1
export const FEAR_PIVOT = 0.1
export const FEAR_MAX = 0.08

/** Effective multiplier stays inside these bounds so the offer never beats the mean */
export const OFFER_MULTIPLIER_MIN = 0
export const OFFER_MULTIPLIER_MAX = 1

/** Banker confidence at or above which his offer line is the cocky variant */
export const OFFER_CONFIDENT_CONFIDENCE = 0.7

/** Audience reaction thresholds: cumulative share of pool amounts at or below the opened amount */
export const AUDIENCE_HAPPY_SHARE = 0.3
export const AUDIENCE_GUILT_SHARE = 0.9

/** Audience mood is a 0–5 scale, starting neutral */
export const AUDIENCE_MOOD_MIN = 0
export const AUDIENCE_MOOD_MAX = 5
export const AUDIENCE_MOOD_START = 3

