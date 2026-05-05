import { createRouter, createWebHistory } from 'vue-router'
import TalentPage from '../pages/TalentPage.vue'
import DocumentPage from '../pages/DocumentPage.vue'
import ResumeSearchPage from '../pages/ResumeSearchPage.vue'

const routes = [
  {
    path: '/',
    redirect: '/talent'
  },
  {
    path: '/talent',
    component: TalentPage
  },
  {
    path: '/documents',
    component: DocumentPage
  },
  {
    path: '/resume-search',
    component: ResumeSearchPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
