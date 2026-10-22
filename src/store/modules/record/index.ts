import type { ActionContext, Module } from 'vuex'
import { readJSON, writeJSON } from '@/utils/storage'
import type { RootStateTypes } from '../../types'
import type { RecordStateTypes, RunRecordState } from './types'

const RECORD_STORAGE_KEY = 'dond.record.v1'
const RECENT_LIMIT = 10

function createEmptyState(): RecordStateTypes {
  return { runs: 0, bestPrize: 0, dealCount: 0, caseCount: 0, recent: [] }
}

/** Record module: aggregate stats only, never involved in core gameplay */
const recordModule: Module<RecordStateTypes, RootStateTypes> = {
  namespaced: true,
  state: (): RecordStateTypes => createEmptyState(),
  mutations: {
    hydrate(state: RecordStateTypes, payload: RecordStateTypes): void {
      state.runs = Math.max(0, Math.floor(payload.runs ?? 0))
      state.bestPrize = Math.max(0, Math.floor(payload.bestPrize ?? 0))
      state.dealCount = Math.max(0, Math.floor(payload.dealCount ?? 0))
      state.caseCount = Math.max(0, Math.floor(payload.caseCount ?? 0))
      state.recent = Array.isArray(payload.recent) ? payload.recent.slice(0, RECENT_LIMIT) : []
    },
    addOutcome(state: RecordStateTypes, record: RunRecordState): void {
      state.runs += 1
      state.bestPrize = Math.max(state.bestPrize, Math.floor(record.prize))
      if (record.decidedBy === 'deal') state.dealCount += 1
      else state.caseCount += 1
      state.recent = [record, ...state.recent].slice(0, RECENT_LIMIT)
    }
  },
  actions: {
    hydrate({ commit }: ActionContext<RecordStateTypes, RootStateTypes>): void {
      const stored = readJSON<RecordStateTypes>(RECORD_STORAGE_KEY)
      if (stored) commit('hydrate', stored)
    },
    recordOutcome(
      { commit, state }: ActionContext<RecordStateTypes, RootStateTypes>,
      record: RunRecordState
    ): void {
      commit('addOutcome', record)
      writeJSON(RECORD_STORAGE_KEY, {
        runs: state.runs,
        bestPrize: state.bestPrize,
        dealCount: state.dealCount,
        caseCount: state.caseCount,
        recent: state.recent
      })
    }
  }
}

export default recordModule
