import type { DecidedByType, GameModeEnum, PlayerPersonaEnum } from '@/types/game'

/** A single finished run */
export interface RunRecordState {
  prize: number
  k: number
  decidedBy: DecidedByType
  swapped: boolean
  playedAt: number
  /** v1.5 fields; optional for old localStorage records */
  modeId?: GameModeEnum
  personaId?: PlayerPersonaEnum
  sessionSeed?: number
}

/** Aggregated player stats, persisted in localStorage */
export interface RecordStateTypes {
  runs: number
  bestPrize: number
  dealCount: number
  caseCount: number
  recent: RunRecordState[]
}
