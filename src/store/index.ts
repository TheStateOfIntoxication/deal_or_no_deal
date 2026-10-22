import { createStore, useStore as useVuexStore } from 'vuex'
import type { Store } from 'vuex'
import recordModule from './modules/record'
import settingsModule from './modules/settings'
import type { RootStateTypes } from './types'

const store = createStore<RootStateTypes>({
  modules: {
    record: recordModule,
    settings: settingsModule
  }
})

export default store

/** Store instance with a typed root state */
export function useStore(): Store<RootStateTypes> {
  return useVuexStore() as unknown as Store<RootStateTypes>
}
