import { ref } from 'vue'
import en from './en/en'
import zh from './zh/zh'

/** Locale identifiers */
export enum LocaleEnum {
  zh = 'zh',
  en = 'en'
}

/** Message keys are taken from the Chinese dictionary; parity is enforced by satisfies */
export type MessageKey = keyof typeof zh

/** Placeholder params, e.g. { count: 3 } fills "{count}" */
export type MessageParams = Record<string, string | number>

const MESSAGES: Record<LocaleEnum, Record<MessageKey, string>> = {
  [LocaleEnum.zh]: zh,
  [LocaleEnum.en]: en
}

export const currentLocale = ref<LocaleEnum>(LocaleEnum.zh)

/** Resolve a message for the current locale, replacing {name} placeholders */
export function t(key: MessageKey, params?: MessageParams): string {
  const template: string = MESSAGES[currentLocale.value][key]
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (matched: string, name: string) =>
    name in params ? String(params[name]) : matched
  )
}

/** Switch locale (v1 UI stays in Chinese; kept for future use) */
export function setLocale(locale: LocaleEnum): void {
  currentLocale.value = locale
}
