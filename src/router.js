import { createRouter, createWebHashHistory } from 'vue-router'
import { session } from './api.js'
import Layout from './views/Layout.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: () => import('./views/Login.vue'), meta: { public: true } },
    {
      path: '/', component: Layout, redirect: '/home',
      children: [
        { path: 'home', component: () => import('./views/Home.vue') },
        { path: 'o/:object', component: () => import('./views/ListView.vue') },
        { path: 'r/:object/:id', component: () => import('./views/RecordPage.vue') },
        { path: 'setup', component: () => import('./views/Setup.vue') },
        { path: 'psid/:psid', component: () => import('./views/PsidRedirect.vue') }
      ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/home' }
  ]
})
router.beforeEach((to) => {
  if (!to.meta.public && !session.token) return { path: '/login', query: { redirect: to.fullPath } }
})
export default router
