import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '@/pages/DashboardPage.vue'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardPage,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
