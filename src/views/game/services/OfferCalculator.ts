import {
  FEAR_GAIN,
  FEAR_MAX,
  FEAR_PIVOT,
  OFFER_MULTIPLIER_MAX,
  OFFER_MULTIPLIER_MIN,
  RAGE_MAX_PENALTY
} from '@/config/presentation'
import type { GameConfig, OfferBaseMode } from '@/config/game'

/** 银行家修正参数（R-6.4 + v1.5 计划/角色/观众） */
export interface OfferBankerOptions {
  topPrize: number
  /** 当前怒气 0–100 */
  rage: number
  /** 本轮计划增量，可正可负 */
  plan?: number
  /** 角色增量，可正可负 */
  persona?: number
  /** 观众增量，可正可负 */
  audience?: number
  /** 最终报价的金额加成（如抬价师 8%） */
  raise?: number
  /** 覆盖本轮基础乘数（慈善家取曲线最高档） */
  baseMultiplier?: number
}

/** 逐项乘数修正，供界面明示 */
export interface OfferBreakdown {
  base: number
  fear: number
  rage: number
  plan: number
  persona: number
  audience: number
  raise: number
  effective: number
  clamped: boolean
}

/** 报价计算所需的参考值与最终结果 */
export interface OfferResult {
  /** 最终报价（分，整数） */
  amount: number
  /** 参考锚点值（分，可能含小数） */
  reference: number
  /** 本轮基础乘数（未含修正） */
  multiplier: number
  /** 修正后的实际乘数 */
  effectiveMultiplier: number
  /** 玩家箱为顶奖的概率 */
  probability: number
  /** 恐惧加价（乘数增量，非负） */
  fear: number
  /** 怒气压价幅度（非负） */
  ragePenalty: number
  /** 是否因边界约束被钳制（R-6.3.6） */
  clamped: boolean
  /** 各来源明细 */
  breakdown: OfferBreakdown
}

/** 银行家报价计算（第 6 章） */
export class OfferCalculator {
  /** 剩余金额算术平均值（R-6.1.2） */
  static arithmeticMean(amounts: readonly number[]): number {
    if (amounts.length === 0) return 0
    return amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
  }

  /** 剩余金额均方根值（R-6.1.2） */
  static rootMeanSquare(amounts: readonly number[]): number {
    if (amounts.length === 0) return 0
    const squared = amounts.reduce((sum, amount) => sum + amount * amount, 0)
    return Math.sqrt(squared / amounts.length)
  }

  /** 按配置的锚点模式取参考值（R-6.1.4） */
  static reference(amounts: readonly number[], mode: OfferBaseMode): number {
    return mode === 'rms'
      ? OfferCalculator.rootMeanSquare(amounts)
      : OfferCalculator.arithmeticMean(amounts)
  }

  /** 当前基础模式的最高档乘数（慈善家使用） */
  static maxMultiplier(config: GameConfig): number {
    const curve = config.offerBaseMode === 'rms' ? config.rmsMultipliers : config.offerMultipliers
    return Math.max(...curve)
  }

  /** 第 round 轮（1–9）的乘数（R-6.2.1、R-6.2.5） */
  static multiplier(config: GameConfig, round: number): number {
    const curve = config.offerBaseMode === 'rms' ? config.rmsMultipliers : config.offerMultipliers
    const index = Math.min(Math.max(round, 1), curve.length) - 1
    return curve[index]
  }

  /**
   * 计算一轮报价
   * 公式：最小值 + (参考锚点 − 最小值) × m_eff（R-6.1.5）
   * m_eff = clamp(基础乘数 + 恐惧加价 − 怒气压价, 0.10, 0.97)（R-6.4）
   * 后续：边界钳制 → 向下取整到分 → 再次边界校验（R-8.5、R-6.3.6）
   */
  static calculate(
    amounts: readonly number[],
    round: number,
    config: GameConfig,
    randomNext?: () => number,
    banker?: OfferBankerOptions
  ): OfferResult {
    if (amounts.length === 0) {
      return {
        amount: 0,
        reference: 0,
        multiplier: 0,
        effectiveMultiplier: 0,
        probability: 0,
        fear: 0,
        ragePenalty: 0,
        clamped: true,
        breakdown: {
          base: 0,
          fear: 0,
          rage: 0,
          plan: 0,
          persona: 0,
          audience: 0,
          raise: 0,
          effective: 0,
          clamped: true
        }
      }
    }

    const lower = Math.min(...amounts)
    const upper = Math.max(...amounts)
    const reference = OfferCalculator.reference(amounts, config.offerBaseMode)
    const multiplier = banker?.baseMultiplier ?? OfferCalculator.multiplier(config, round)

    // 银行家：你越可能中顶奖，他越怕（加价）；你越拒绝，他越扣（压价）
    const probability = banker
      ? amounts.filter((amount) => amount === banker.topPrize).length / amounts.length
      : 0
    const fear = banker
      ? Math.min(FEAR_MAX, Math.max(0, FEAR_GAIN * (probability - FEAR_PIVOT)))
      : 0
    const ragePenalty = banker ? RAGE_MAX_PENALTY * (banker.rage / 100) : 0
    const plan = banker?.plan ?? 0
    const persona = banker?.persona ?? 0
    const audience = banker?.audience ?? 0
    const raise = banker?.raise ?? 0
    const effectiveMultiplier = Math.min(
      OFFER_MULTIPLIER_MAX,
      Math.max(OFFER_MULTIPLIER_MIN, multiplier + fear - ragePenalty + plan + persona + audience)
    )

    // 最差结果不打折，只折上行部分；剩余金额整体偏高时报价就会接近均值
    const upside = Math.max(0, reference - lower)
    let discounted = effectiveMultiplier
    if (config.jitterRatio > 0 && randomNext) {
      discounted *= 1 + (randomNext() * 2 - 1) * config.jitterRatio
    }

    const raw = (lower + upside * discounted) * (1 + raise)
    const clampedRaw = Math.min(upper, Math.max(lower, raw))
    const floored = Math.max(0, Math.floor(clampedRaw))
    const amount = Math.min(upper, Math.max(lower, floored))

    return {
      amount,
      reference,
      multiplier,
      effectiveMultiplier,
      probability,
      fear: Math.max(0, fear),
      ragePenalty,
      clamped: amount !== raw,
      breakdown: {
        base: multiplier,
        fear: Math.max(0, fear),
        rage: ragePenalty,
        plan,
        persona,
        audience,
        raise,
        effective: effectiveMultiplier,
        clamped: amount !== raw
      }
    }
  }
}
