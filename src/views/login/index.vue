<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <div class="logo">P</div>
        <div>
          <h1>ProjectHub</h1>
          <p>个人项目平台后台</p>
        </div>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="submit">
        <el-form-item prop="tenantId">
          <el-input v-model="form.tenantId" placeholder="企业/账套" prefix-icon="OfficeBuilding" />
        </el-form-item>
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="密码" prefix-icon="Lock" />
        </el-form-item>
        <el-button type="primary" size="large" class="login-button" :loading="loading" @click="submit">登录</el-button>
      </el-form>
      <div class="login-tip">当前接入后端：/api/LoginAuthority/UserLoginByEnt</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { loginApi } from '@/api/auth'
import { setAuth } from '@/utils/auth'

const router = useRouter()
const route = useRoute()
const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({ tenantId: 'NewApp', username: 'admin', password: '123456' })
const rules: FormRules = {
  tenantId: [{ required: true, message: '请输入企业/账套', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function submit() {
  await formRef.value?.validate()
  loading.value = true
  try {
    const result = await loginApi(form)
    if (!result.token) throw new Error('后端没有返回 token')
    setAuth(result.token, result.refreshToken || '', result.user)
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    router.replace(redirect)
  } catch (error: any) {
    ElMessage.error(error?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #263445 0%, #304156 42%, #f0f2f5 42%, #f0f2f5 100%); }
.login-card { width: 420px; padding: 36px; background: #fff; border-radius: 14px; box-shadow: 0 18px 48px rgba(0, 21, 41, .18); }
.login-brand { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
.logo { width: 52px; height: 52px; border-radius: 14px; display: grid; place-items: center; background: linear-gradient(135deg, #409eff, #67c23a); color: #fff; font-size: 28px; font-weight: 800; }
h1 { margin: 0; font-size: 26px; color: #1f2f3d; }
p { margin: 6px 0 0; color: #697b8c; }
.login-button { width: 100%; margin-top: 4px; }
.login-tip { margin-top: 18px; color: #97a8be; font-size: 12px; text-align: center; }
</style>
