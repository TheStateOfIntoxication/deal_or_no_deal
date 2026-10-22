import type { MessageKey, MessageParams } from '@/language'

declare module 'vue' {
  interface ComponentCustomProperties {
    /** Global translation helper, used as $t in templates */
    $t: (key: MessageKey, params?: MessageParams) => string
  }
}

export {}
