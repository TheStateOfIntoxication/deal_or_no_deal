/**
 * Balance simulation (dev-only, not shipped).
 * Usage: npx vite-node scripts/simulate.ts [gamesPerCombo]
 */
import { BANKER_PROFILES, BankerProfileEnum } from '@/config/bankers'
import { createModeGameConfig } from '@/config/modes'
import { GameModeEnum, PlayerPersonaEnum } from '@/types/game'
import { createRandom } from '@/utils/random'
import { GameEngine } from '@/views/game/services/GameEngine'

type Strategy = 'first' | 'ratio-60' | 'ratio-80' | 'never'

const STRATEGIES: Strategy[] = ['first', 'ratio-60', 'ratio-80', 'never']
const PERSONAS = Object.values(PlayerPersonaEnum)
const MODES = [GameModeEnum.classic, GameModeEnum.jackpot]
const BANKERS = BANKER_PROFILES.map((profile) => profile.id)
const GAMES_PER_COMBO = Math.max(20, Number(process.argv[2] ?? 200))

interface Stat {
  games: number
  sumPrize: number
  sumBase: number
  deals: number
  topHits: number
  under100: number
  honors: number
}

function shouldDeal(strategy: Strategy, canDeal: boolean, offerRatio: number): boolean {
  if (!canDeal) return false
  if (strategy === 'first') return true
  if (strategy === 'ratio-60') return offerRatio >= 0.6
  if (strategy === 'ratio-80') return offerRatio >= 0.8
  return false
}

function runOne(
  mode: GameModeEnum,
  persona: PlayerPersonaEnum,
  banker: BankerProfileEnum,
  strategy: Strategy,
  seed: number
): Stat {
  const config = createModeGameConfig(mode, seed)
  const engine = new GameEngine(config, mode, banker)
  const random = createRandom(seed ^ 0x9e3779b9)
  const k = mode === GameModeEnum.classic ? 2 + Math.floor(random.next() * 5) : undefined

  const result = engine.start(k, persona)
  if (!result.ok) throw new Error(`start failed: ${mode}/${persona}/${banker}`)
  engine.selectPlayerCase(1 + Math.floor(random.next() * config.totalCases))

  let guard = 0
  while (engine.getSnapshot().phase !== 'settled' && guard < 100) {
    guard += 1
    const snapshot = engine.getSnapshot()
    if (snapshot.phase === 'opening') {
      const eligible = snapshot.cases.filter((item) => !item.opened && !item.isPlayerCase)
      const target = eligible[Math.floor(random.next() * eligible.length)]
      if (target) engine.openCase(target.no)
      continue
    }
    if (snapshot.phase === 'offerPending') {
      const offer = snapshot.currentOffer ?? 0
      const mean = snapshot.remainingAmounts.reduce((sum, amount) => sum + amount, 0) /
        Math.max(1, snapshot.remainingAmounts.length)
      const ratio = mean > 0 ? offer / mean : 0
      if (shouldDeal(strategy, snapshot.canDeal, ratio)) engine.deal()
      else engine.noDeal()
      continue
    }
    if (snapshot.phase === 'swapPending') {
      engine.swap(false)
      continue
    }
    break
  }

  const final = engine.getSnapshot()
  const outcome = final.result
  if (!outcome) throw new Error(`no result: ${mode}/${persona}/${banker}`)
  return {
    games: 1,
    sumPrize: outcome.prize,
    sumBase: outcome.basePrize,
    deals: outcome.decidedBy === 'deal' ? 1 : 0,
    topHits: outcome.basePrize === final.topPrize ? 1 : 0,
    under100: outcome.prize < 10_000 ? 1 : 0,
    honors: outcome.honorBonus > 0 ? 1 : 0
  }
}

function main(): void {
  const rows: string[] = []
  for (const mode of MODES) {
    for (const persona of PERSONAS) {
      for (const banker of BANKERS) {
        for (const strategy of STRATEGIES) {
          const stat: Stat = { games: 0, sumPrize: 0, sumBase: 0, deals: 0, topHits: 0, under100: 0, honors: 0 }
          for (let index = 0; index < GAMES_PER_COMBO; index += 1) {
            const one = runOne(mode, persona, banker, strategy, index + 1)
            stat.games += one.games
            stat.sumPrize += one.sumPrize
            stat.sumBase += one.sumBase
            stat.deals += one.deals
            stat.topHits += one.topHits
            stat.under100 += one.under100
            stat.honors += one.honors
          }
          rows.push([
            mode,
            persona,
            banker,
            strategy,
            (stat.sumPrize / stat.games / 100).toFixed(0),
            (stat.sumBase / stat.games / 100).toFixed(0),
            ((stat.deals / stat.games) * 100).toFixed(1),
            ((stat.topHits / stat.games) * 100).toFixed(1),
            ((stat.under100 / stat.games) * 100).toFixed(1),
            ((stat.honors / stat.games) * 100).toFixed(1)
          ].join(','))
        }
      }
    }
  }
  console.log('mode,persona,banker,strategy,avgPrize,avgBase,deal%,topHit%,under100$,honor%')
  console.log(rows.join('\n'))
}

main()
