import { BANKER_ROTATION_WEIGHTS, GAME_BANKER_IDS } from '@/config/bankers'
import type { BankerProfileEnum } from '@/config/bankers'
import { createRandom, shuffle } from '@/utils/random'
import type { RandomSource } from '@/utils/random'

/**
 * Shuffle the banker roster once per cycle, then reveal bankers in that order.
 * A new cycle reshuffles; the same banker is not repeated across the cycle boundary.
 */
export class BankerRotation {
  private readonly random: RandomSource
  private queue: BankerProfileEnum[] = []
  private last: BankerProfileEnum | null = null

  constructor(seed: number) {
    this.random = createRandom(seed)
  }

  next(): BankerProfileEnum {
    if (this.queue.length === 0) {
      const bag: BankerProfileEnum[] = []
      for (const id of GAME_BANKER_IDS) {
        const weight = BANKER_ROTATION_WEIGHTS[id] ?? 1
        for (let index = 0; index < weight; index += 1) bag.push(id)
      }
      this.queue = shuffle(bag, this.random)
      if (this.queue.length > 1 && this.queue[0] === this.last) {
        const first = this.queue.shift() as BankerProfileEnum
        this.queue.push(first)
      }
    }
    const id = this.queue.shift() as BankerProfileEnum
    this.last = id
    return id
  }
}
