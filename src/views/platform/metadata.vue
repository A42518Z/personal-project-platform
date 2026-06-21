<template>
  <div class="page">
    <div class="page-title">
      <div>
        <h2>元数据概览</h2>
        <p>已接入现有后端 DataOperation/GetData，暂时读取 lowcode 原库表，后续再转 meta_* / hub_*。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">数据库配置</div><div class="stat-value">{{ stats.databases }}</div></div>
      <div class="stat-card"><div class="stat-label">注册表</div><div class="stat-value">{{ stats.tables }}</div></div>
      <div class="stat-card"><div class="stat-label">字段配置</div><div class="stat-value">{{ stats.fields }}</div></div>
      <div class="stat-card"><div class="stat-label">兼容接口</div><div class="stat-value">2</div></div>
    </div>

    <div class="card">
      <h3>当前接入状态</h3>
      <el-alert title="登录和低代码核心已接入后端；库表仍沿用当前 qyvirtualplat / lowcode 历史表。" type="success" :closable="false" show-icon />
      <div class="action-grid boundary">
        <div class="action-card"><h3>登录</h3><p>/api/LoginAuthority/UserLoginByEnt，保存 token 后进入后台。</p></div>
        <div class="action-card"><h3>查询</h3><p>/api/DataOperation/GetData，读取 _base_dbinfo、_base_tbllist、base_tblfield。</p></div>
        <div class="action-card"><h3>保存</h3><p>后续可接 /api/DataOperation/BatchTableOperateRequestByCRUD。</p></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getData } from '@/api/lowcode'

const loading = ref(false)
const stats = reactive({ databases: 0, tables: 0, fields: 0 })

async function loadData() {
  loading.value = true
  try {
    const [dbs, tables, fields] = await Promise.all([
      getData('_base_dbinfo', { pageSize: 1, primaryKeyFields: 'Id' }),
      getData('_base_tbllist', { pageSize: 1, primaryKeyFields: 'rowid' }),
      getData('base_tblfield', { pageSize: 1, primaryKeyFields: 'row_id' })
    ])
    stats.databases = dbs.count
    stats.tables = tables.count
    stats.fields = fields.count
  } catch (error: any) {
    ElMessage.error(error?.message || '加载元数据统计失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>.card h3{margin:0 0 16px}.boundary{margin-top:16px}</style>
