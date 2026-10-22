import { shuffle } from '@/utils/random'
import type { RandomSource } from '@/utils/random'
import type { GameModeEnum } from '@/types/game'

/** A face-down mode card; the face is only rendered after reveal */
export interface ModeCardState {
  modeId: GameModeEnum
  revealed: boolean
}

/**
 * Deal up to three distinct mode cards.
 * A future multi-select persona can reuse the returned cards and let the player keep several.
 */
export function buildModeDeck(
  modeIds: readonly GameModeEnum[],
  random: RandomSource,
  count = 3
): ModeCardState[] {
  const unique = [...new Set(modeIds)]
  const size = Math.min(count, unique.length)
  return shuffle(unique, random)
    .slice(0, size)
    .map((modeId) => ({ modeId, revealed: false }))
}
