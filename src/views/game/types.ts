import type { MessageKey } from '@/language'
import { BankerProfileEnum } from '@/config/bankers'
import {
  AudienceReactionEnum,
  AudienceTraitEnum,
  BankerPlanEnum,
  GameModeEnum,
  PlayerPersonaEnum
} from '@/types/game'
import type { AmountGradeEnum, DecidedByType, PayoutGradeEnum } from '@/types/game'

/** 开局准备阶段 */
export enum SetupPhaseEnum {
  modeDraw = 'modeDraw',
  modeReveal = 'modeReveal',
  personaPick = 'personaPick',
  modeSetup = 'modeSetup',
  playing = 'playing'
}

/** 游戏阶段（R-5、R-7） */
export enum GamePhaseEnum {
  idle = 'idle', // 未开局
  waitingPlayerCase = 'waitingPlayerCase', // 等待玩家选箱
  opening = 'opening', // 本轮开箱中
  offerPending = 'offerPending', // 已报价，待 Deal / No Deal
  swapPending = 'swapPending', // 终局，待决定是否交换
  settled = 'settled' // 已结算
}

/** 操作被拒绝的原因（R-11.3、R-11.5、R-11.6） */
export enum EngineErrorEnum {
  configInvalid = 'configInvalid',
  invalidDraw = 'invalidDraw',
  wrongPhase = 'wrongPhase',
  unknownCase = 'unknownCase',
  caseAlreadyOpened = 'caseAlreadyOpened',
  playerCaseForbidden = 'playerCaseForbidden',
  openQuotaReached = 'openQuotaReached',
  personaLocked = 'personaLocked',
  gameOver = 'gameOver'
}

/** 界面可见的单个箱子状态 */
export interface CaseState {
  no: number
  isPlayerCase: boolean
  opened: boolean
  /** 未揭示时为 null（R-9.1、R-9.4） */
  revealedAmount: number | null
  /** 金额对玩家好坏的展示分级；未揭示时为 null */
  grade: AmountGradeEnum | null
}

/** 一次开箱的展示数据 */
export interface RoundOpenedState {
  caseNo: number
  amount: number
  grade: AmountGradeEnum
  /** 对应金额板的行 id，用于“刚刚开出”高亮 */
  poolIndex: number
}

/** 金额板的一行：多重集中的一项（R-9.5、R-9.6） */
export interface AmountRowState {
  id: number
  amount: number
  eliminated: boolean
}

/** 单轮开箱与报价记录 */
export interface RoundLogState {
  round: number
  openedAmounts: number[]
  offer: number
}

/** 结算结果 */
export interface GameResultState {
  /** 箱内金额 / 报价原始金额（未含角色加成） */
  basePrize: number
  /** 角色修正（赌徒终局可正可负；其他角色 0） */
  personaBonus: number
  /** 打脸银行家的荣誉奖金（赌徒终局且奖金超过最高报价） */
  honorBonus: number
  /** 到手奖金 = basePrize + personaBonus */
  prize: number
  /** 到手奖金的展示档位 */
  payoutGrade: PayoutGradeEnum
  decidedBy: DecidedByType
  swapped: boolean
  /** 最终持有的箱号（交换后为原非玩家箱） */
  heldCaseNo: number
  /** 最终持有箱的金额 */
  heldCaseAmount: number
  playerCaseAmount: number
  otherCaseAmount: number | null
}

/** 玩家箱舞台卡的数据（顶奖概率 HUD） */
export interface PlayerCaseStats {
  caseNo: number | null
  revealedAmount: number | null
  revealedGrade: PayoutGradeEnum | null
  /** 结算揭晓中（标记未翻牌），用于显示“正在打开”状态 */
  revealing: boolean
  /** 本局顶奖金额（分） */
  topPrize: number
  /** 玩家箱为顶奖的概率，0–1 */
  probability: number
  topPrizeRemaining: number
  remainingCaseCount: number
  /** 剩余金额区间，如 "$1.00 – $1,000,000.00" */
  rangeText: string
  /** 概率里程碑文案，空串表示未达任一档 */
  milestoneText: string
}

/** 银行家表情档位 */
export type BankerExpression = 'smug' | 'annoyed' | 'angry' | 'furious'

/** 报价时各来源的乘数修正，供界面逐项展示 */
export interface OfferBreakdownState {
  /** 本轮基础乘数 */
  base: number
  /** 恐惧加价（正数） */
  fear: number
  /** 怒气压价幅度（正数） */
  rage: number
  /** 银行家计划增量（可正可负） */
  plan: number
  /** 角色增量（可正可负） */
  persona: number
  /** 观众增量（可正可负） */
  audience: number
  /** 最终报价金额加成（关系户） */
  raise: number
  /** 最终生效乘数 */
  effective: number
  /** 是否因边界被钳制 */
  clamped: boolean
}

/** 银行家本轮计划 */
export interface BankerPlanState {
  id: BankerPlanEnum
  delta: number
}

/** 报价时的银行家修正（均以乘数增量表示，可正可负） */
export interface BankerOfferMetaState {
  /** 因顶奖概率高而加价（正数） */
  fear: number
  /** 因怒气而压价（负数或 0，此处存正数幅度） */
  ragePenalty: number
  /** 报价时的银行家信心 = 1 − p */
  confidence: number
  /** 逐项修正明细 */
  breakdown: OfferBreakdownState
  /** 本轮计划，无计划时为 null */
  plan: BankerPlanState | null
}

/** 观众成员 */
export interface AudienceMemberState {
  id: number
  nameKey: MessageKey
  emoji: string
  trait: AudienceTraitEnum
  /** 0–5 */
  mood: number
}

/** 本轮观众推荐 */
export interface AudienceRecommendationState {
  memberId: number
  caseNo: number
}

/** 开箱后观众反应 */
export interface AudienceReactionState {
  memberId: number
  caseNo: number
  kind: AudienceReactionEnum
  lineKey: MessageKey
}

/** 捡漏王被动触发提示 */
export interface PassiveNoticeState {
  personaId: PlayerPersonaEnum
  caseNo: number
  amount: number
}

/** 供界面渲染的只读快照 */
export interface GameSnapshot {
  phase: GamePhaseEnum
  /** 本局玩法 */
  modeId: GameModeEnum
  /** 本局角色 */
  personaId: PlayerPersonaEnum
  /** 本局银行家档案 */
  bankerId: BankerProfileEnum
  /** 顶奖数量（经典 = k，巨奖 = 1） */
  k: number
  /** 顶奖数量别名，新代码优先使用 */
  topPrizeCount: number
  round: number
  totalRounds: number
  remainingToOpen: number
  playerCaseNo: number | null
  cases: CaseState[]
  amountRows: AmountRowState[]
  currentOffer: number | null
  /** 是否显示 Deal 按钮；赌徒没有回头路，隐藏 Deal */
  canDeal: boolean
  /** 角色被动触发提示；无则为 null */
  passiveNotice: PassiveNoticeState | null
  /** 本局银行家最高报价（用于结算复盘） */
  highestOffer: number
  /** 未打开箱子对应的金额多重集，含玩家箱（R-6.1.1、R-9.5） */
  remainingAmounts: number[]
  /** 未打开的箱子数（含玩家箱） */
  remainingCaseCount: number
  /** 顶奖金额（分） */
  topPrize: number
  /** 仍在场的顶奖金额项数 */
  topPrizeRemaining: number
  /** 银行家怒气 0–100 */
  rage: number
  /** 本局玩家拒绝报价的次数 */
  noDealCount: number
  /** 银行家信心 = 1 − P(玩家箱是顶奖) */
  bankerConfidence: number
  /** 当前报价的银行家修正，无报价时为 null */
  offerMeta: BankerOfferMetaState | null
  /** 本轮已开箱记录 */
  roundOpened: RoundOpenedState[]
  /** 最近一次开箱，用于"刚刚开出"提示 */
  lastOpened: RoundOpenedState | null
  logs: RoundLogState[]
  result: GameResultState | null
}

/** 引擎操作的统一返回：失败时不改变状态 */
export type EngineResult = { ok: true } | { ok: false; error: EngineErrorEnum }
