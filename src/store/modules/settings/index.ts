import type { Module } from 'vuex'
import { readJSON, writeJSON } from '@/utils/storage'
import type { RootStateTypes } from '../../types'
import type { SettingsStateTypes } from './types'

const SETTINGS_STORAGE_KEY = 'dond.settings.v1'

/** 界面偏好模块：音效开关，持久化到 localStorage */
const settingsModule: Module<SettingsStateTypes, RootStateTypes> = {
  namespaced: true,
  state: (): SettingsStateTypes => ({
    muted: readJSON<SettingsStateTypes>(SETTINGS_STORAGE_KEY)?.muted === true
  }),
  mutations: {
    setMuted(state: SettingsStateTypes, muted: boolean): void {
      state.muted = muted
    }
  },
  actions: {
    toggleMuted({ commit, state }): void {
      const muted = !state.muted
      commit('setMuted', muted)
      writeJSON(SETTINGS_STORAGE_KEY, { muted })
    }
  }
}

export default settingsModule
