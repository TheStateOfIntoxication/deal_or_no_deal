import type { MessageKey } from '@/language'

/** 银行家台词触发事件 */
export type BankerEvent =
  | 'greeting'
  | 'offerConfident'
  | 'offerNervous'
  | 'noDealCalm'
  | 'noDealAnnoyed'
  | 'noDealAngry'
  | 'noDealFurious'
  | 'deal'
  | 'gloat'
  | 'annoyedSmall'
  | 'meltdown'

/** 事件 → 文案 Key 池；同一事件随机取一条，且不连续重复 */
const LINE_POOLS: Record<BankerEvent, MessageKey[]> = {
  greeting: ['BankerLineGreeting1', 'BankerLineGreeting2'],
  offerConfident: [
    'BankerLineOfferConfident1',
    'BankerLineOfferConfident2',
    'BankerLineOfferConfident3'
  ],
  offerNervous: [
    'BankerLineOfferNervous1',
    'BankerLineOfferNervous2',
    'BankerLineOfferNervous3'
  ],
  noDealCalm: ['BankerLineNoDealCalm1', 'BankerLineNoDealCalm2'],
  noDealAnnoyed: ['BankerLineNoDealAnnoyed1', 'BankerLineNoDealAnnoyed2'],
  noDealAngry: ['BankerLineNoDealAngry1', 'BankerLineNoDealAngry2'],
  noDealFurious: ['BankerLineNoDealFurious1', 'BankerLineNoDealFurious2'],
  deal: ['BankerLineDeal1', 'BankerLineDeal2'],
  gloat: ['BankerLineGloat1', 'BankerLineGloat2'],
  annoyedSmall: ['BankerLineAnnoyed1', 'BankerLineAnnoyed2'],
  meltdown: ['BankerLineMeltdown1', 'BankerLineMeltdown2']
}

/** 创建一个台词选择器：同一事件内随机、且避免与上一条重复 */
export function createBankerLinePicker(): (event: BankerEvent) => MessageKey {
  let lastKey: MessageKey | null = null

  return (event: BankerEvent): MessageKey => {
    const pool = LINE_POOLS[event]
    if (pool.length === 1) return pool[0]

    const candidates = pool.filter((key) => key !== lastKey)
    const key = candidates[Math.floor(Math.random() * candidates.length)]
    lastKey = key
    return key
  }
}
