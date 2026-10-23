import {
  CASINO_SIDE_BET_LOSS_FACTOR,
  CASINO_SIDE_BET_MAX_USES,
  CASINO_SIDE_BET_WIN_FACTOR,
  COLLECTOR_TOP_GONE_FACTOR,
  COLLECTOR_TOP_PRESENT_FACTOR,
  HOTHEAD_HIGH_CANDIDATE_COUNT,
  HOTHEAD_TRIGGER_CHANCE,
  HOTHEAD_TRIGGER_THRESHOLD
} from '@/config/banker'
import { BankerProfileEnum } from '@/config/bankers'
import type { BankerQuirkContext, BankerRuntimeState, BankerStrategy } from './types'

const COLLECTOR: BankerStrategy = {
  id: BankerProfileEnum.collector,
  getQuirk(ctx: BankerQuirkContext) {
    return ctx.topPrizeRemaining > 0
      ? { factor: COLLECTOR_TOP_PRESENT_FACTOR, labelKey: 'BankerAdjustCollector' }
      : { factor: COLLECTOR_TOP_GONE_FACTOR, labelKey: 'BankerAdjustCollector' }
  },
  getStatusKey(ctx: BankerQuirkContext) {
    return ctx.topPrizeRemaining > 0
      ? 'BankerCollectorTopPresent'
      : 'BankerCollectorTopGone'
  }
}

const CASINO: BankerStrategy = {
  id: BankerProfileEnum.casino,
  sideBet: {
    maxUses: CASINO_SIDE_BET_MAX_USES,
    winFactor: CASINO_SIDE_BET_WIN_FACTOR,
    lossFactor: CASINO_SIDE_BET_LOSS_FACTOR,
    labelKey: 'BankerCasinoSideBet',
    winLabelKey: 'BankerAdjustCasinoWin',
    lossLabelKey: 'BankerAdjustCasinoLose'
  },
  getQuirk(_ctx: BankerQuirkContext, state: BankerRuntimeState) {
    if (state.sideBetOutcome === 'win') {
      return { factor: CASINO_SIDE_BET_WIN_FACTOR, labelKey: 'BankerAdjustCasinoWin' }
    }
    if (state.sideBetOutcome === 'lose') {
      return { factor: CASINO_SIDE_BET_LOSS_FACTOR, labelKey: 'BankerAdjustCasinoLose' }
    }
    return null
  }
}

const HOTHEAD: BankerStrategy = {
  id: BankerProfileEnum.hothead,
  forcedOpen: {
    rageThreshold: HOTHEAD_TRIGGER_THRESHOLD,
    chance: HOTHEAD_TRIGGER_CHANCE,
    highCandidateCount: HOTHEAD_HIGH_CANDIDATE_COUNT,
    resetRage: true
  }
}

const BANKER_STRATEGIES: Record<BankerProfileEnum, BankerStrategy> = {
  [BankerProfileEnum.default]: { id: BankerProfileEnum.default },
  [BankerProfileEnum.charity]: { id: BankerProfileEnum.charity },
  [BankerProfileEnum.conspirator]: { id: BankerProfileEnum.conspirator },
  [BankerProfileEnum.collector]: COLLECTOR,
  [BankerProfileEnum.casino]: CASINO,
  [BankerProfileEnum.hothead]: HOTHEAD
}

export function getBankerStrategy(id: BankerProfileEnum): BankerStrategy {
  const strategy = BANKER_STRATEGIES[id]
  if (!strategy) throw new Error(`Unknown banker strategy: ${id}`)
  return strategy
}

export function createBankerRuntimeState(): BankerRuntimeState {
  return {
    sideBetUsed: 0,
    sideBetRound: 0,
    sideBetPending: false,
    sideBetOutcome: null
  }
}
