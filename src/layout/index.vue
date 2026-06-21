<template>
  <el-container class="layout-container">
    <el-aside :width="collapsed ? '64px' : '232px'" class="layout-aside">
      <div class="brand" :class="{ collapsed }">
        <div class="brand-logo">P</div>
        <div v-if="!collapsed" class="brand-text">
          <strong>ProjectHub</strong>
          <span>个人项目平台</span>
        </div>
      </div>
      <el-menu
        :default-active="activePath"
        router
        :collapse="collapsed"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        class="side-menu"
      >
        <el-menu-item index="/dashboard"><el-icon><Odometer /></el-icon><template #title>工作台</template></el-menu-item>
        <el-menu-item index="/projects"><el-icon><Grid /></el-icon><template #title>项目中心</template></el-menu-item>
        <el-sub-menu index="metadata">
          <template #title><el-icon><Collection /></el-icon><span>低代码核心</span></template>
          <el-menu-item index="/metadata">元数据概览</el-menu-item>
          <el-menu-item index="/table-and-view">表和视图管理</el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/files"><el-icon><FolderOpened /></el-icon><template #title>文件中心</template></el-menu-item>
        <el-sub-menu index="apps">
          <template #title><el-icon><Monitor /></el-icon><span>项目模块</span></template>
          <el-menu-item index="/personal-hub">个人集项目</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container class="layout-content">
      <el-header class="layout-header">
        <div class="header-left">
          <el-button text circle @click="collapsed = !collapsed"><el-icon><Fold v-if="!collapsed" /><Expand v-else /></el-icon></el-button>
          <span class="header-title">{{ route.meta.title || '个人项目平台' }}</span>
        </div>
        <div class="header-right">
          <el-tag effect="plain" type="success">后端已接入</el-tag>
          <span class="user-name">{{ displayName }}</span>
          <el-dropdown @command="handleCommand">
            <el-avatar :size="32">{{ avatarText }}</el-avatar>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <div class="tabs-bar">
        <el-tag size="small" type="info" effect="plain">首页 / {{ route.meta.title || '工作台' }}</el-tag>
      </div>
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clearAuth, getUser } from '@/utils/auth'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const activePath = computed(() => route.path)
const user = computed(() => getUser())
const displayName = computed(() => String(user.value?.UserName || user.value?.LoginName || '管理员'))
const avatarText = computed(() => displayName.value.slice(0, 1))

function handleCommand(command: string) {
  if (command === 'logout') {
    clearAuth()
    router.replace('/login')
  }
}
</script>

<style scoped>
.layout-container { width: 100%; height: 100vh; background: #f0f2f5; }
.layout-aside { background-color: #304156; transition: width .25s ease; overflow: hidden; }
.brand { height: 60px; display: flex; align-items: center; gap: 12px; padding: 0 18px; color: #fff; background: #263445; box-sizing: border-box; }
.brand.collapsed { justify-content: center; padding: 0; }
.brand-logo { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: linear-gradient(135deg,#409eff,#67c23a); color: #fff; font-weight: 800; }
.brand-text { display: flex; flex-direction: column; line-height: 1.2; }
.brand-text span { color: #9fb3c8; font-size: 12px; margin-top: 4px; }
.side-menu { border-right: none; }
.layout-content { min-width: 0; overflow: hidden; }
.layout-header { height: 60px; background: #fff; box-shadow: 0 1px 4px rgba(0,21,41,.08); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
.header-left, .header-right { display: flex; align-items: center; gap: 14px; }
.header-title { font-size: 16px; font-weight: 600; color: #1f2f3d; }
.user-name { color: #606266; font-size: 14px; }
.tabs-bar { height: 40px; padding: 7px 20px; box-sizing: border-box; background: #fff; border-top: 1px solid #f2f3f5; border-bottom: 1px solid #e8e8e8; }
.layout-main { padding: 20px; overflow-y: auto; background: #f0f2f5; }
</style>
