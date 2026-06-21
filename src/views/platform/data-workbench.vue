<template>
  <div class="page">
    <div class="page-title">
      <div>
        <h2>通用数据管理</h2>
        <p>已接入 /api/DataOperation/GetData，可以输入任意已注册或真实存在的表先查询预览。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadData">查询</el-button>
    </div>
    <div class="card">
      <el-form inline>
        <el-form-item label="表名">
          <el-input v-model="tableName" placeholder="如 _base_dbinfo / _base_tbllist" style="width: 260px" />
        </el-form-item>
        <el-form-item label="主键">
          <el-input v-model="primaryKey" placeholder="Id / rowid / row_id" style="width: 160px" />
        </el-form-item>
        <el-form-item><el-button type="primary" @click="pageIndex = 1; loadData()">查询后端</el-button></el-form-item>
      </el-form>

      <el-alert title="当前只接通用查询。新增/编辑/删除会在你要做的新功能明确后，再接 BatchTableOperateRequestByCRUD。" type="info" :closable="false" show-icon style="margin-bottom:16px" />

      <el-table :data="rows" border stripe v-loading="loading" max-height="520">
        <el-table-column v-for="col in columns" :key="col" :prop="col" :label="col" min-width="160" show-overflow-tooltip />
      </el-table>
      <div class="pager">
        <span>共 {{ total }} 条</span>
        <el-pagination background layout="prev, pager, next, sizes" :page-sizes="[10, 20, 50, 100]" v-model:current-page="pageIndex" v-model:page-size="pageSize" :total="total" @change="loadData" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getData, type AnyRow } from '@/api/lowcode'

const tableName = ref('_base_dbinfo')
const primaryKey = ref('Id')
const rows = ref<AnyRow[]>([])
const total = ref(0)
const loading = ref(false)
const pageIndex = ref(1)
const pageSize = ref(20)
const columns = computed(() => Object.keys(rows.value[0] || {}).slice(0, 12))

async function loadData() {
  if (!tableName.value.trim()) {
    ElMessage.warning('请输入表名')
    return
  }
  loading.value = true
  try {
    const result = await getData(tableName.value.trim(), { pageIndex: pageIndex.value, pageSize: pageSize.value, primaryKeyFields: primaryKey.value || 'Id' })
    rows.value = result.items
    total.value = result.count
  } catch (error: any) {
    ElMessage.error(error?.message || '通用查询失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>.pager{display:flex;align-items:center;justify-content:space-between;margin-top:16px;color:#606266}</style>
