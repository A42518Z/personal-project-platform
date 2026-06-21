<template>
  <div class="page">
    <div class="page-title">
      <div>
        <h2>字段维护</h2>
        <p>读取现有 base_tblfield 字段元数据，后续再迁移到更轻量的 meta_field。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
    </div>
    <div class="card">
      <el-form inline>
        <el-form-item label="表名">
          <el-input v-model="tableKeyword" clearable placeholder="如 base_userinfo" style="width: 220px" />
        </el-form-item>
        <el-form-item label="字段">
          <el-input v-model="fieldKeyword" clearable placeholder="字段名/中文名" style="width: 220px" />
        </el-form-item>
        <el-form-item><el-button type="primary" @click="loadData">查询后端</el-button></el-form-item>
      </el-form>
      <el-table :data="displayRows" border stripe v-loading="loading">
        <el-table-column prop="tblname" label="表名" width="220" />
        <el-table-column prop="enname" label="字段名" width="180" />
        <el-table-column prop="cnname" label="中文名" width="180" />
        <el-table-column prop="DataType" label="类型" width="120" />
        <el-table-column prop="DataLen" label="长度" width="90" />
        <el-table-column prop="IsPKey" label="主键" width="90">
          <template #default="scope"><el-tag :type="Number(scope.row.IsPKey) === 1 ? 'danger' : 'info'">{{ Number(scope.row.IsPKey) === 1 ? '是' : '否' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="IsNill" label="允许空" width="100" />
        <el-table-column prop="DataTypeName" label="类型名称" min-width="140" />
        <el-table-column prop="lingma_sys_ent" label="账套" width="110" />
      </el-table>
      <div class="pager">
        <span>后端共 {{ total }} 条，当前页过滤后 {{ displayRows.length }} 条</span>
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
const tableKeyword = ref('')
const fieldKeyword = ref('')
const pageIndex = ref(1)
const pageSize = ref(50)

const displayRows = computed(() => {
  const tk = tableKeyword.value.trim().toLowerCase()
  const fk = fieldKeyword.value.trim().toLowerCase()
  return rows.value.filter(row => {
    const tableOk = !tk || String(row.tblname || '').toLowerCase().includes(tk)
    const fieldText = String(row.enname || '').toLowerCase() + ' ' + String(row.cnname || '').toLowerCase()
    const fieldOk = !fk || fieldText.includes(fk)
    return tableOk && fieldOk
  })
})

async function loadData() {
  loading.value = true
  try {
    const result = await getData('base_tblfield', { pageIndex: pageIndex.value, pageSize: pageSize.value, primaryKeyFields: 'row_id' })
    rows.value = result.items
    total.value = result.count
  } catch (error: any) {
    ElMessage.error(error?.message || '加载字段元数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>.pager{display:flex;align-items:center;justify-content:space-between;margin-top:16px;color:#606266}</style>
