import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { t } from '@/language'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/game' },
  {
    path: '/game',
    name: 'game',
    component: () => import('@/views/game/index.vue'),
    meta: { title: t('GameTitle') }
  },
  { path: '/:pathMatch(.*)*', redirect: '/game' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : t('GameTitle')
  document.title = `${title} · ${t('GameSubtitle')}`
})

export default router
