<template>
  <div class="page">
    <div class="page-title">
      <div>
        <h2>表注册</h2>
        <p>读取现有 _base_tbllist 表，先用于预览和新功能开发，暂不迁移表结构。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
    </div>
    <div class="card">
      <el-form inline>
        <el-form-item label="表名">
          <el-input v-model="keyword" clearable placeholder="输入表名/描述过滤" style="width: 260px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="pageIndex = 1; loadData()">查询后端</el-button>
        </el-form-item>
        <el-form-item>
          <el-button @click="keyword = ''">清空过滤</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="displayRows" border stripe v-loading="loading">
        <el-table-column prop="tblname" label="表名" min-width="220" />
        <el-table-column prop="tbldesc" label="业务描述" min-width="220" />
        <el-table-column prop="dbid" label="数据库ID" width="220" />
        <el-table-column prop="hasDefaultFields" label="系统字段" width="110">
          <template #default="scope"><el-tag :type="Number(scope.row.hasDefaultFields) === 1 ? 'success' : 'info'">{{ Number(scope.row.hasDefaultFields) === 1 ? '启用' : '未启用' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="lingma_sys_is_delete" label="删除标记" width="110" />
        <el-table-column prop="lingma_sys_ent" label="账套" width="120" />
      </el-table>
      <div class="pager">
        <span>共 {{ total }} 条</span>
        <el-pagination background layout="prev, pager, next, sizes" :page-sizes="[20, 50, 100]" v-model:current-page="pageIndex" v-model:page-size="pageSize" :total="total" @change="loadData" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getData, type AnyRow } from '@/api/lowcode'

const rows = ref<AnyRow[]>([])
const total = ref(0)
const loading = ref(false)
const keyword = ref('')
const pageIndex = ref(1)
const pageSize = ref(20)

const displayRows = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return rows.value
  return rows.value.filter(row => String(row.tblname || '').toLowerCase().includes(k) || String(row.tbldesc || '').toLowerCase().includes(k))
})

async function loadData() {
  loading.value = true
  try {
    const result = await getData('_base_tbllist', { pageIndex: pageIndex.value, pageSize: pageSize.value, primaryKeyFields: 'rowid' })
    rows.value = result.items
    total.value = result.count
  } catch (error: any) {
    ElMessage.error(error?.message || '加载表注册数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>.pager{display:flex;align-items:center;justify-content:space-between;margin-top:16px;color:#606266}</style>
