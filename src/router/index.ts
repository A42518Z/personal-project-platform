import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/index.vue'
import { isLoggedIn } from '@/utils/auth'

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'Login', component: () => import('@/views/login/index.vue'), meta: { title: '登录', public: true } },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/dashboard/index.vue'), meta: { title: '工作台' } },
      { path: 'projects', name: 'Projects', component: () => import('@/views/platform/projects.vue'), meta: { title: '项目中心' } },
      { path: 'metadata', name: 'Metadata', component: () => import('@/views/platform/metadata.vue'), meta: { title: '元数据概览' } },
      { path: 'table-and-view', name: 'TableAndView', component: () => import('@/views/platform/table-and-view.vue'), meta: { title: '表和视图管理' } },
      { path: 'metadata/tables', name: 'MetaTables', component: () => import('@/views/platform/table-registry.vue'), meta: { title: '表注册' } },
      { path: 'metadata/fields', name: 'MetaFields', component: () => import('@/views/platform/field-registry.vue'), meta: { title: '字段维护' } },
      { path: 'data-workbench', name: 'DataWorkbench', component: () => import('@/views/platform/data-workbench.vue'), meta: { title: '通用数据管理' } },
      { path: 'files', name: 'Files', component: () => import('@/views/platform/files.vue'), meta: { title: '文件中心' } },
      { path: 'personal-hub', name: 'PersonalHub', component: () => import('@/views/apps/personal-hub.vue'), meta: { title: '个人集项目' } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  if (!isLoggedIn()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
