import type { RecordStateTypes } from './modules/record/types'
import type { SettingsStateTypes } from './modules/settings/types'

export interface RootStateTypes {
  record: RecordStateTypes
  settings: SettingsStateTypes
}
