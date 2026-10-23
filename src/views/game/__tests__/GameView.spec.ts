// @vitest-environment jsdom
import { DOMWrapper, mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it } from 'vitest'
import type { App } from 'vue'
import { FINAL_REVEAL_MS, REVEAL_HOLD_MS, RESULT_PANEL_DELAY_MS } from '@/config/presentation'
import { t } from '@/language'
import store from '@/store'
import GameView from '../index.vue'

beforeAll(() => {
  // Element Plus 弹窗依赖 ResizeObserver / 音频接口，jsdom 未实现
  if (!('ResizeObserver' in globalThis)) {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub })
  }
  if (!('AudioContext' in globalThis)) {
    class AudioContextStub {
      state = 'running'
      currentTime = 0
      destination = {}
      resume(): void {}
      createOscillator() {
        return {
          type: '',
          frequency: { value: 0 },
          connect(): void {},
          start(): void {},
          stop(): void {}
        }
      }
      createGain() {
        return {
          gain: { value: 0, exponentialRampToValueAtTime(): void {} },
          connect(): void {}
        }
      }
    }
    Object.defineProperty(globalThis, 'AudioContext', { value: AudioContextStub })
  }
})

function mountGame(): ReturnType<typeof mount> {
  const i18nPlugin = {
    install(app: App): void {
      app.config.globalProperties.$t = t
    }
  }

  return mount(GameView, {
    attachTo: document.body,
    global: { plugins: [store, i18nPlugin] }
  })
}

/** 开局：选稳重角色 → 确认随机玩法 → 经典摇 k / 巨奖直接开始，返回顶奖数量 */
async function passDraw(wrapper: ReturnType<typeof mount>): Promise<number> {
  const personaCard = wrapper.find('[data-persona="pragmatic"]')
  expect(personaCard.exists()).toBe(true)
  await personaCard.trigger('click')
  await wrapper.vm.$nextTick()

  const personaButton = wrapper
    .findAll('.setup__actions button')
    .find((item) => item.text().includes(t('PersonaConfirm')))
  expect(personaButton).toBeDefined()
  await personaButton?.trigger('click')
  await wrapper.vm.$nextTick()

  const modeCard = wrapper.find('[data-mode]')
  expect(modeCard.exists()).toBe(true)
  const modeId = modeCard.attributes('data-mode')

  const modeButton = wrapper
    .findAll('.setup__actions button')
    .find((item) => item.text().includes(t('ModeConfirm')))
  expect(modeButton).toBeDefined()
  await modeButton?.trigger('click')
  await wrapper.vm.$nextTick()

  if (modeId === 'jackpot') {
    const startButton = wrapper
      .findAll('.jackpot-intro button')
      .find((item) => item.text().includes(t('BtnStartGame')))
    expect(startButton).toBeDefined()
    await startButton?.trigger('click')
    await wrapper.vm.$nextTick()
    return 1
  }

  const balls = wrapper.findAll('.draw-panel__ball')
  expect(balls).toHaveLength(5)

  await balls[0]?.trigger('click')
  await wrapper.vm.$nextTick()
  expect(wrapper.find('.draw-panel__result').exists()).toBe(true)

  const drawnK = Number(
    (wrapper.find('.draw-panel__result-title').text().match(/×(\d+)/) ?? [])[1]
  )
  expect(drawnK).toBeGreaterThanOrEqual(1)

  const startButton = wrapper
    .findAll('.draw-panel button')
    .find((item) => item.text().includes(t('BtnStartGame')))
  expect(startButton).toBeDefined()
  await startButton?.trigger('click')
  await wrapper.vm.$nextTick()
  return drawnK
}

/** 选 1 号箱（选后从网格移除），随后开满第 1 轮的 6 个箱子 */
async function pickAndOpenFirstRound(wrapper: ReturnType<typeof mount>): Promise<void> {
  await passDraw(wrapper)

  const cases = wrapper.findAll('.case-grid__case')
  expect(cases).toHaveLength(26)

  await cases[0]?.trigger('click')
  expect(wrapper.findAll('.case-grid__case')).toHaveLength(25)
  expect(wrapper.find('.player-stage__no').text()).toBe('#1')

  for (const button of wrapper.findAll('.case-grid__case').slice(0, 6)) {
    await button.trigger('click')
  }
  await wrapper.vm.$nextTick()
}

const hold = (): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, REVEAL_HOLD_MS + 120))

describe('游戏页冒烟', () => {
  it('摇奖结果与开局奖池数量一致', async () => {
    const wrapper = mountGame()
    await wrapper.vm.$nextTick()

    const drawnK = await passDraw(wrapper)
    await wrapper.findAll('.case-grid__case')[0]?.trigger('click')
    await wrapper.vm.$nextTick()

    const millionRows = wrapper
      .findAll('.amount-board__row')
      .filter((row) => row.text().includes('$1,000,000'))
    expect(millionRows).toHaveLength(drawnK)
    expect(wrapper.findAll('.amount-board__row')).toHaveLength(26)
    expect(wrapper.findAll('.status-bar__stat')[2]?.text()).toContain(`×${drawnK}`)
    expect(wrapper.find('.player-stage__meta').text()).toContain(`剩余顶奖 ${drawnK} 个`)

    wrapper.unmount()
  })

  it('开局摇奖 → 选箱 → 开满 6 箱，先亮相再出报价', async () => {
    const wrapper = mountGame()
    await wrapper.vm.$nextTick()

    // 开局阶段：先选角色，再进入随机模式；此时还没有箱池
    expect(wrapper.find('.persona-carousel').exists()).toBe(true)
    expect(wrapper.findAll('.mode-card')).toHaveLength(0)
    expect(wrapper.find('.case-grid__case').exists()).toBe(false)

    await pickAndOpenFirstRound(wrapper)

    expect(wrapper.find('.draw-panel').exists()).toBe(false)

    // 金额先亮相：报价面板此时还不可见
    expect(wrapper.find('.offer-panel').isVisible()).toBe(false)
    expect(wrapper.findAll('.case-grid__case--opened')).toHaveLength(6)
    expect(wrapper.find('.reveal-chip').exists()).toBe(true)

    await hold()

    expect(wrapper.find('.offer-panel').isVisible()).toBe(true)
    expect(wrapper.find('.offer-panel__amount').text()).toMatch(/\$/)
    expect(wrapper.findAll('.offer-panel__chip')).toHaveLength(6)
    expect(wrapper.find('.player-stage__chance-value').text()).toMatch(/\d+\.\d%/)

    // 音效开关走 Vuex settings，并可持久化
    const soundButton = wrapper.findAll('.status-bar__actions button')[0]
    await soundButton?.trigger('click')
    await wrapper.vm.$nextTick()
    expect(store.state.settings.muted).toBe(true)
    await soundButton?.trigger('click')
    await wrapper.vm.$nextTick()
    expect(store.state.settings.muted).toBe(false)

    // 银行家常驻卡：初始怒气 0
    expect(wrapper.find('.banker-card').exists()).toBe(true)
    expect(wrapper.find('.banker-card__rage-value').text()).toBe('0')

    // 拒绝报价 → 怒气 +15、拒绝次数 +1
    const noDealButton = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.offer-panel button')
    ).find((item) => item.textContent?.includes(t('BtnNoDeal')))
    expect(noDealButton).toBeDefined()
    await new DOMWrapper(noDealButton as HTMLElement).trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.banker-card__rage-value').text()).toBe('15')
    expect(wrapper.find('.banker-card__refusals').text()).toContain('1')
    wrapper.unmount()
  })

  it('接受报价后先翻牌、再出结算面板，且不自动重开', async () => {
    const wrapper = mountGame()
    await wrapper.vm.$nextTick()
    await pickAndOpenFirstRound(wrapper)
    await hold()

    const buttons = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.offer-panel button')
    )
    const dealButton = buttons.find((item) => item.textContent?.includes(t('BtnDeal')))
    expect(dealButton).toBeDefined()

    await new DOMWrapper(dealButton as HTMLElement).trigger('click')
    await wrapper.vm.$nextTick()
    await Promise.resolve()

    // 结算瞬间：先进入翻牌悬念，结算面板与战绩都已落库，但面板延迟展示
    expect(wrapper.find('.player-stage__revealing').exists()).toBe(true)
    expect(document.body.textContent).not.toContain(t('ResultTitle'))

    await new Promise((resolve) =>
      window.setTimeout(resolve, FINAL_REVEAL_MS + RESULT_PANEL_DELAY_MS + 200)
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.player-stage__amount').exists()).toBe(true)
    expect(document.body.textContent).toContain(t('ResultDecidedByDeal'))
    expect(store.state.record.runs).toBe(1)
    expect(store.state.record.dealCount).toBe(1)
    expect(store.state.record.bestPrize).toBeGreaterThan(0)
    expect(window.localStorage.getItem('dond.record.v1')).not.toBeNull()

    // 不自动重开：台面仍在、玩家箱仍是原来那只
    expect(wrapper.findAll('.case-grid__case')).toHaveLength(25)
    expect(wrapper.find('.player-stage__no').text()).toBe('#1')

    // 点「完成」：只关闭结算面板，不重开
    const dismissButton = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.el-dialog button')
    ).find((item) => item.textContent?.includes(t('BtnDismissResult')))
    expect(dismissButton).toBeDefined()
    await new DOMWrapper(dismissButton as HTMLElement).trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.result-dialog__title').isVisible()).toBe(false)
    expect(wrapper.find('.draw-panel').exists()).toBe(false)
    expect(wrapper.findAll('.case-grid__case')).toHaveLength(25)

    // 再手动点顶部「再来一局」→ 回到摇奖
    const restartButton = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.status-bar button')
    ).find((item) => item.textContent?.includes(t('BtnRestart')))
    expect(restartButton).toBeDefined()
    await new DOMWrapper(restartButton as HTMLElement).trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.persona-carousel').exists()).toBe(true)
    expect(wrapper.find('.case-grid__case').exists()).toBe(false)

    wrapper.unmount()
  })
})
