import { createGameConfig } from '@/config/game'
import type { GameConfig } from '@/config/game'
import { GameModeEnum, PlayerPersonaEnum } from '@/types/game'
import { CLASSIC_MODE } from './classic'
import { JACKPOT_MODE, LUCKY_JACKPOT_BASE_AMOUNTS_CENTS } from './jackpot'
import type { GameModeDefinition } from './types'

export type { GameModeDefinition, ModeConfigOverrides, ModeSetupKind } from './types'

/** All mode cards; add a definition here and it appears in the deck automatically */
export const GAME_MODES: GameModeDefinition[] = [CLASSIC_MODE, JACKPOT_MODE]

const GAME_MODE_MAP = new Map(GAME_MODES.map((mode) => [mode.id, mode]))

export function getGameMode(modeId: GameModeEnum): GameModeDefinition {
  const mode = GAME_MODE_MAP.get(modeId)
  if (!mode) throw new Error(`Unknown game mode: ${modeId}`)
  return mode
}

/**
 * Build the engine config for one mode.
 * Multi-mode selection is intentionally reserved: the current UI passes one id,
 * and a future persona passive can pass several ids to a ModeComposer.
 */
export function createModeGameConfig(modeId: GameModeEnum, seed: number | null = null): GameConfig {
  return createGameConfig({ ...getGameMode(modeId).overrides, seed })
}

/** Lucky's jackpot pool: 12 × $1M plus the 13 highest classic amounts, with the unique $5M on top. */
export function createPersonaModeGameConfig(
  modeId: GameModeEnum,
  personaId: PlayerPersonaEnum,
  seed: number | null = null
): GameConfig {
  const config = createModeGameConfig(modeId, seed)
  if (personaId === PlayerPersonaEnum.lucky && modeId === GameModeEnum.jackpot) {
    return { ...config, baseAmounts: [...LUCKY_JACKPOT_BASE_AMOUNTS_CENTS] }
  }
  return config
}
