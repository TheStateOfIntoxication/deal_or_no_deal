import type { DecidedByType } from '@/types/game'

/** A single finished run */
export interface RunRecordState {
  prize: number
  k: number
  decidedBy: DecidedByType
  swapped: boolean
  playedAt: number
}

/** Aggregated player stats, persisted in localStorage */
export interface RecordStateTypes {
  runs: number
  bestPrize: number
  dealCount: number
  caseCount: number
  recent: RunRecordState[]
}
