/**
 * Balance simulation (dev-only, not shipped).
 * Usage: npx vite-node scripts/simulate.ts [gamesPerCombo]
 *
 * Coverage:
 * - 12 personas × 2 modes × 6 bankers × 4 deal strategies
 * - host active action (hype when offer/EV < 0.65)
 * - casino side bet (always place when available)
 * - audience director + conformist mood delta
 * - alternate final swap / keep by seed
 * - lucky's persona-specific jackpot pool
 */
import { BANKER_PROFILES, BankerProfileEnum } from '@/config/bankers'
import { createPersonaModeGameConfig } from '@/config/modes'
import { GameModeEnum, PersonaActionEnum, PlayerPersonaEnum } from '@/types/game'
import { createRandom, deriveSeed } from '@/utils/random'
import { AudienceDirector } from '@/views/game/services/AudienceDirector'
import { GameEngine } from '@/views/game/services/GameEngine'
import { getPersonaStrategy } from '@/views/game/services/personas'

type Strategy = 'first' | 'ratio-60' | 'ratio-80' | 'never'

const STRATEGIES: Strategy[] = ['first', 'ratio-60', 'ratio-80', 'never']
const PERSONAS = Object.values(PlayerPersonaEnum)
const MODES = [GameModeEnum.classic, GameModeEnum.jackpot]
const BANKERS = BANKER_PROFILES.map((profile) => profile.id)
const GAMES_PER_COMBO = Math.max(20, Number(process.argv[2] ?? 200))

interface Stat {
  games: number
  sumPrize: number
  sumSqPrize: number
  prizes: number[]
  sumBase: number
  deals: number
  topHits: number
  under100: number
  honors: number
}

function emptyStat(): Stat {
  return {
    games: 0,
    sumPrize: 0,
    sumSqPrize: 0,
    prizes: [],
    sumBase: 0,
    deals: 0,
    topHits: 0,
    under100: 0,
    honors: 0
  }
}

function addStat(target: Stat, one: Stat): void {
  target.games += one.games
  target.sumPrize += one.sumPrize
  target.sumSqPrize += one.sumSqPrize
  target.prizes.push(...one.prizes)
  target.sumBase += one.sumBase
  target.deals += one.deals
  target.topHits += one.topHits
  target.under100 += one.under100
  target.honors += one.honors
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[middle] as number
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
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
  strategyName: Strategy,
  seed: number
): Stat {
  const config = createPersonaModeGameConfig(mode, persona, seed)
  const engine = new GameEngine(config, mode, banker)
  const strategy = getPersonaStrategy(persona)
  const random = createRandom(seed ^ 0x9e3779b9)
  const audience = new AudienceDirector(
    deriveSeed(seed, 'audience'),
    strategy.audienceExtraMembers,
    strategy.audienceRecommendationCount ?? 1
  )
  const syncAudience = (): void => {
    engine.setAudienceDelta(strategy.getAudienceDelta?.(audience.getAverageMood()) ?? 0)
  }

  const k = mode === GameModeEnum.classic ? 2 + Math.floor(random.next() * 5) : undefined
  const result = engine.start(k, persona)
  if (!result.ok) throw new Error(`start failed: ${mode}/${persona}/${banker}`)
  engine.selectPlayerCase(1 + Math.floor(random.next() * config.totalCases))
  let snapshot = engine.getSnapshot()
  audience.beginRound(snapshot.cases, snapshot.playerCaseNo)
  syncAudience()

  let guard = 0
  while (snapshot.phase !== 'settled' && guard < 100) {
    guard += 1

    if (snapshot.phase === 'opening') {
      if (snapshot.bankerState.sideBet?.available) {
        const bet = engine.placeSideBet()
        if (bet.ok) snapshot = engine.getSnapshot()
      }
      const eligible = snapshot.cases.filter((item) => !item.opened && !item.isPlayerCase)
      const target = eligible[Math.floor(random.next() * eligible.length)]
      if (target) {
        engine.openCase(target.no)
        snapshot = engine.getSnapshot()
        const opened = snapshot.lastOpened
        if (opened) {
          audience.react(opened, snapshot.amountRows.map((row) => row.amount))
          syncAudience()
        }
      }
      continue
    }

    if (snapshot.phase === 'offerPending') {
      let offer = snapshot.currentOffer ?? 0
      let mean = snapshot.remainingAmounts.reduce((sum, amount) => sum + amount, 0) /
        Math.max(1, snapshot.remainingAmounts.length)
      let ratio = mean > 0 ? offer / mean : 0

      // Host uses hype only when the current offer is below the reference ratio.
      const hype = snapshot.personaActions.find(
        (item) => item.id === PersonaActionEnum.hostHype && item.enabled
      )
      if (hype && ratio < 0.65) {
        const action = engine.usePersonaAction(PersonaActionEnum.hostHype)
        if (action.ok) {
          audience.adjustMood(action.audienceMoodDelta)
          syncAudience()
          snapshot = engine.getSnapshot()
          offer = snapshot.currentOffer ?? 0
          mean = snapshot.remainingAmounts.reduce((sum, amount) => sum + amount, 0) /
            Math.max(1, snapshot.remainingAmounts.length)
          ratio = mean > 0 ? offer / mean : 0
        }
      }

      if (shouldDeal(strategyName, snapshot.canDeal, ratio)) {
        engine.deal()
      } else {
        engine.noDeal()
        snapshot = engine.getSnapshot()
        if (snapshot.phase === 'opening') {
          audience.beginRound(snapshot.cases, snapshot.playerCaseNo)
          syncAudience()
        }
        continue
      }
      snapshot = engine.getSnapshot()
      continue
    }

    if (snapshot.phase === 'swapPending') {
      // Swap and keep have equal expectation; alternate by seed to exercise both paths.
      engine.swap(seed % 2 === 0)
      snapshot = engine.getSnapshot()
      continue
    }
    break
  }

  const outcome = snapshot.result
  if (!outcome) throw new Error(`no result: ${mode}/${persona}/${banker}`)
  return {
    games: 1,
    sumPrize: outcome.prize,
    sumSqPrize: outcome.prize * outcome.prize,
    prizes: [outcome.prize],
    sumBase: outcome.basePrize,
    deals: outcome.decidedBy === 'deal' ? 1 : 0,
    topHits: outcome.basePrize === snapshot.topPrize ? 1 : 0,
    under100: outcome.prize < 10_000 ? 1 : 0,
    honors: outcome.honorBonus > 0 ? 1 : 0
  }
}

function average(stat: Stat, field: 'prize' | 'base' | 'deals' | 'topHits' | 'under100' | 'honors'): number {
  if (stat.games === 0) return 0
  const total = field === 'prize'
    ? stat.sumPrize / stat.games
    : field === 'base'
      ? stat.sumBase / stat.games
      : field === 'deals'
        ? stat.deals / stat.games
        : field === 'topHits'
          ? stat.topHits / stat.games
          : field === 'under100'
            ? stat.under100 / stat.games
            : stat.honors / stat.games
  return total
}

function stdDev(stat: Stat): number {
  if (stat.games === 0) return 0
  const mean = stat.sumPrize / stat.games
  return Math.sqrt(Math.max(0, stat.sumSqPrize / stat.games - mean * mean))
}

function main(): void {
  const rows: string[] = []
  const summary = new Map<string, Stat>()

  for (const mode of MODES) {
    for (const persona of PERSONAS) {
      for (const banker of BANKERS) {
        for (const strategyName of STRATEGIES) {
          const stat = emptyStat()
          for (let index = 0; index < GAMES_PER_COMBO; index += 1) {
            addStat(stat, runOne(mode, persona, banker, strategyName, index + 1))
          }
          const key = `${mode}:${persona}`
          const aggregate = summary.get(key) ?? emptyStat()
          addStat(aggregate, stat)
          summary.set(key, aggregate)
          rows.push([
            mode,
            persona,
            banker,
            strategyName,
            (average(stat, 'prize') / 100).toFixed(0),
            (stdDev(stat) / 100).toFixed(0),
            (median(stat.prizes) / 100).toFixed(0),
            (average(stat, 'base') / 100).toFixed(0),
            (average(stat, 'deals') * 100).toFixed(1),
            (average(stat, 'topHits') * 100).toFixed(1),
            (average(stat, 'under100') * 100).toFixed(1),
            (average(stat, 'honors') * 100).toFixed(1)
          ].join(','))
        }
      }
    }
  }

  console.log('mode,persona,banker,strategy,avgPrize,stdPrize,medianPrize,avgBase,deal%,topHit%,under100$,honor%')
  console.log(rows.join('\n'))

  // Keep CSV on stdout and print a compact role baseline to stderr.
  console.error('SUMMARY mode,persona,games,avgPrize,stdPrize,medianPrize,deal%,topHit%')
  for (const [key, stat] of [...summary].sort()) {
    console.error([
      key,
      stat.games,
      (average(stat, 'prize') / 100).toFixed(0),
      (stdDev(stat) / 100).toFixed(0),
      (median(stat.prizes) / 100).toFixed(0),
      (average(stat, 'deals') * 100).toFixed(1),
      (average(stat, 'topHits') * 100).toFixed(1)
    ].join(','))
  }
}

main()
