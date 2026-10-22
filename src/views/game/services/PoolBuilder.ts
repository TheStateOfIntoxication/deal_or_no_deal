import { K_ABSOLUTE_MAX, K_ABSOLUTE_MIN, TOTAL_ROUNDS } from '@/config/game'
import type { GameConfig } from '@/config/game'
import type { RandomSource } from '@/utils/random'

/** 配置校验错误码（R-11.7、R-10.2） */
export type ConfigErrorCode =
  | 'totalCases'
  | 'baseAmounts'
  | 'topPrize'
  | 'kRange'
  | 'kWeights'
  | 'fixedK'
  | 'openSequence'
  | 'multipliers'
  | 'jitterRatio'
  | 'randomTopPrize'

/** 金额池构建：抽取 k、移除最低金额、追加顶奖（R-4.1、R-4.2） */
export class PoolBuilder {
  /** 校验配置是否可开局，返回全部错误码；空数组表示合法 */
  static validate(config: GameConfig): ConfigErrorCode[] {
    const errors: ConfigErrorCode[] = []
    const base = config.baseAmounts
    const ascending = base.every((value, index) => index === 0 || base[index - 1] <= value)

    if (config.totalCases !== 26) errors.push('totalCases')
    if (base.length !== config.totalCases - 1 || !ascending || base.some((value) => value <= 0)) {
      errors.push('baseAmounts')
    }
    if (base.length > 0 && config.topPrize < Math.max(...base)) errors.push('topPrize')
    if (config.kMin < K_ABSOLUTE_MIN || config.kMax > K_ABSOLUTE_MAX || config.kMin > config.kMax) {
      errors.push('kRange')
    }

    const span = config.kMax - config.kMin + 1
    if (config.kWeights) {
      const sum = config.kWeights.reduce((total, weight) => total + weight, 0)
      const invalid = config.kWeights.length !== span || config.kWeights.some((weight) => weight < 0)
      if (invalid || sum <= 0) errors.push('kWeights')
    }

    if (
      config.fixedK < config.kMin ||
      config.fixedK > config.kMax ||
      config.fixedK < K_ABSOLUTE_MIN ||
      config.fixedK > K_ABSOLUTE_MAX
    ) {
      errors.push('fixedK')
    }

    const sequence = config.openSequence
    const opened = sequence.reduce((total, count) => total + count, 0)
    if (sequence.length !== TOTAL_ROUNDS || sequence.some((count) => count < 1)) {
      errors.push('openSequence')
    }
    // R-11.7：第 9 轮结束必须恰好剩余 2 箱
    if (opened !== config.totalCases - 2) errors.push('openSequence')

    if (!PoolBuilder.isValidCurve(config.offerMultipliers)) errors.push('multipliers')
    if (!PoolBuilder.isValidCurve(config.rmsMultipliers)) errors.push('multipliers')
    if (config.jitterRatio < 0 || config.jitterRatio >= 1) errors.push('jitterRatio')
    // R-10.1: random top prize is reserved for a later version
    if (config.randomTopPrizeEnabled) errors.push('randomTopPrize')

    return errors
  }

  /** 抽取本局 k：关闭随机时取 fixedK，否则按权重或均匀分布抽取（R-4.1.1–R-4.1.3） */
  static resolveK(config: GameConfig, random: RandomSource): number {
    if (!config.randomKEnabled) return config.fixedK

    const span = config.kMax - config.kMin + 1
    const weights = config.kWeights
    if (!weights) return config.kMin + Math.floor(random.next() * span)

    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let cursor = random.next() * total
    for (let index = 0; index < span; index += 1) {
      cursor -= weights[index]
      if (cursor < 0) return config.kMin + index
    }
    return config.kMax
  }

  /** 构建金额池：移除基础表最低 (k−1) 项，再追加 k 个顶奖（R-4.2.3–R-4.2.6） */
  static build(config: GameConfig, k: number): number[] {
    const sorted = [...config.baseAmounts].sort((left, right) => left - right)
    const kept = sorted.slice(k - 1)
    const pool = [...kept]
    for (let index = 0; index < k; index += 1) pool.push(config.topPrize)
    return pool
  }

  /** 乘数曲线必须为 9 项、全为正、单调不减（R-6.2.1、R-6.2.3） */
  private static isValidCurve(curve: number[]): boolean {
    if (curve.length !== TOTAL_ROUNDS) return false
    return curve.every(
      (value, index) => value > 0 && (index === 0 || curve[index - 1] <= value)
    )
  }
}
