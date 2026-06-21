<template>
  <div class="table-view-page">
    <div class="layout-grid">
      <el-card class="database-panel" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>数据库列表</span>
            <el-input v-model="databaseKeyword" placeholder="搜索数据库" clearable @keyup.enter="loadDatabases" @clear="loadDatabases" />
          </div>
        </template>
        <el-table v-loading="databaseLoading" :data="databaseList" border highlight-current-row height="640" row-key="_id" @current-change="handleDatabaseChange">
          <el-table-column type="index" label="#" width="60" />
          <el-table-column label="数据库名称" min-width="170" show-overflow-tooltip>
            <template #default="{ row }">{{ dbNameOf(row) || '-' }}</template>
          </el-table-column>
          <el-table-column label="描述" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ dbDescOf(row) || '-' }}</template>
          </el-table-column>
        </el-table>
        <div class="database-pagination-wrapper">
          <el-pagination v-model:current-page="databasePage.pageIndex" :page-size="databasePage.pageSize" :total="databasePage.total" layout="total, prev, pager, next" background @current-change="loadDatabases" />
        </div>
      </el-card>

      <el-card class="object-panel" shadow="never">
        <template #header>
          <div class="panel-header panel-header--wide">
            <div class="panel-title">
              <span>表和视图管理</span>
              <span v-if="currentDatabase" class="panel-subtitle">{{ dbNameOf(currentDatabase) }}</span>
            </div>
            <div class="panel-actions">
              <el-button type="primary" plain :disabled="!currentDatabase" @click="openRegisterDialog"><el-icon><Plus /></el-icon>注册</el-button>
              <el-button type="primary" :disabled="!currentDatabase" @click="openAddDialog"><el-icon><Plus /></el-icon>新增</el-button>
            </div>
          </div>
        </template>

        <div class="tab-toolbar">
          <el-tabs v-model="activeTab" @tab-change="loadObjects">
            <el-tab-pane label="表" name="table" />
            <el-tab-pane label="视图" name="view" />
          </el-tabs>
        </div>

        <el-form :model="searchForm" inline class="search-form">
          <el-form-item :label="activeTab === 'table' ? '表名' : '视图名'"><el-input v-model="searchForm.keyword" clearable :placeholder="activeTab === 'table' ? '请输入表名' : '请输入视图名'" @keyup.enter="handleSearch" /></el-form-item>
          <el-form-item label="中文名"><el-input v-model="searchForm.cnName" clearable placeholder="请输入中文名" @keyup.enter="handleSearch" /></el-form-item>
          <el-form-item label="创建人"><el-input v-model="searchForm.creator" clearable placeholder="请输入创建人" @keyup.enter="handleSearch" /></el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch"><el-icon><Search /></el-icon>搜索</el-button>
            <el-button @click="handleReset"><el-icon><Refresh /></el-icon>重置</el-button>
          </el-form-item>
        </el-form>

        <el-empty v-if="!currentDatabase && !objectLoading" description="请选择左侧数据库" />
        <template v-else>
          <el-table v-loading="objectLoading" :data="objectList" border stripe height="520" highlight-current-row row-key="_rowid" @current-change="handleObjectChange">
            <el-table-column type="index" label="#" width="70" />
            <el-table-column :label="activeTab === 'table' ? '表名' : '视图名'" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ activeTab === 'table' ? row.tblname : row.vewname }}</template>
            </el-table-column>
            <el-table-column label="中文名" min-width="240" show-overflow-tooltip>
              <template #default="{ row }">{{ activeTab === 'table' ? row.tbldesc : row.vewdesc }}</template>
            </el-table-column>
            <el-table-column prop="createuser" label="创建人" width="140" show-overflow-tooltip />
            <el-table-column prop="createtime" label="创建时间" width="170" show-overflow-tooltip />
            <el-table-column label="操作" width="260" fixed="right">
              <template #default="{ row }">
                <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
                <el-button type="primary" link @click="openDesignDialog(row)">{{ activeTab === 'table' ? '表设计' : '视图设计' }}</el-button>
                <el-button v-if="activeTab === 'table'" type="primary" link @click="openRelationDialog(row)">表关系</el-button>
                <el-button v-if="activeTab === 'table'" type="primary" link @click="openCopyDialog(row)">复制</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrapper">
            <el-pagination v-model:current-page="objectPage.pageIndex" v-model:page-size="objectPage.pageSize" :page-sizes="[10, 20, 50, 100]" :total="objectPage.total" layout="total, sizes, prev, pager, next, jumper" background @size-change="handleObjectSizeChange" @current-change="loadObjects" />
          </div>
        </template>
      </el-card>
    </div>

    <el-dialog v-model="registerDialog.visible" :title="activeTab === 'table' ? '注册表' : '注册视图'" width="960px" destroy-on-close>
      <div class="tip-box">当前阶段先复刻 metadatamanagement 的操作入口。注册会把输入对象写入现有元数据表，不做物理建表/建视图。</div>
      <el-form :model="registerDialog.form" label-width="96px">
        <el-form-item :label="activeTab === 'table' ? '表名' : '视图名'" required><el-input v-model="registerDialog.form.name" /></el-form-item>
        <el-form-item label="中文名" required><el-input v-model="registerDialog.form.desc" /></el-form-item>
        <el-form-item v-if="activeTab === 'view'" label="SQL"><el-input v-model="registerDialog.form.sql" type="textarea" :rows="5" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="registerDialog.visible=false">取消</el-button><el-button type="primary" :loading="registerDialog.loading" @click="submitRegister">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="copyDialog.visible" title="复制表" width="520px" destroy-on-close>
      <el-form :model="copyDialog.form" label-width="88px">
        <el-form-item label="新表名" required><el-input v-model="copyDialog.form.tblname" /></el-form-item>
        <el-form-item label="描述" required><el-input v-model="copyDialog.form.tbldesc" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="copyDialog.visible=false">取消</el-button><el-button type="primary" :loading="copyDialog.loading" @click="submitCopy">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="addDialog.visible" :title="activeTab === 'table' ? '新建表' : '新建视图'" width="1500px" destroy-on-close>
      <div v-if="activeTab === 'table'">
        <el-form :model="tableForm" label-width="92px" class="table-form">
          <div class="form-grid">
            <el-form-item label="表名" required><el-input v-model="tableForm.tblname" /></el-form-item>
            <el-form-item label="中文名" required><el-input v-model="tableForm.tbldesc" /></el-form-item>
            <el-form-item label="描述"><el-input v-model="tableForm.functiondesc" /></el-form-item>
            <el-form-item label="摘要表达式"><el-input v-model="tableForm.Expression" /></el-form-item>
            <div class="toggle-row"><el-checkbox v-model="tableForm.PhysicsDel">物理删除</el-checkbox><el-checkbox v-model="tableForm.multiTenancy">多租户</el-checkbox><el-checkbox v-model="tableForm.IsVisible">可见(自动脱敏)</el-checkbox></div>
          </div>
        </el-form>
        <field-editor v-model="fieldRows" />
      </div>
      <view-editor v-else v-model="viewForm" />
      <template #footer><el-button @click="addDialog.visible=false">取消</el-button><el-button type="primary" :loading="addDialog.loading" @click="submitAdd">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="designDialog.visible" :title="activeTab === 'table' ? '表设计' : '视图设计'" width="1600px" destroy-on-close>
      <el-tabs v-if="activeTab === 'table'" v-model="designTab" class="design-tabs">
        <el-tab-pane label="设计" name="design">
          <el-form :model="tableForm" label-width="88px" class="table-form">
            <div class="form-grid design-form-grid">
              <el-form-item label="表名" required><el-input v-model="tableForm.tblname" /></el-form-item>
              <el-form-item label="中文名" required><el-input v-model="tableForm.tbldesc" /></el-form-item>
              <el-form-item label="物理删除"><el-checkbox v-model="tableForm.PhysicsDel" /></el-form-item>
              <el-form-item label="默认字段"><el-checkbox v-model="tableForm.hasDefaultFields" /></el-form-item>
              <el-form-item label="多租户"><el-checkbox v-model="tableForm.multiTenancy" /></el-form-item>
              <el-form-item label="可见"><el-checkbox v-model="tableForm.IsVisible" /></el-form-item>
              <el-form-item label="功能描述"><el-input v-model="tableForm.functiondesc" /></el-form-item>
            </div>
          </el-form>
          <div class="field-toolbar"><el-button type="primary" @click="addFieldRow">新建</el-button><el-button type="primary" plain @click="systemFieldVisible=true">查看系统字段</el-button><el-button type="primary" plain @click="autoDescribeFields">一键加描述</el-button><el-button type="primary" plain disabled>编码设计</el-button><el-button type="primary" plain :loading="fieldLoading" @click="loadSelectedFields">同步元数据</el-button><el-button type="primary" plain @click="aiFillFields">AI填表</el-button></div>
          <field-editor v-model="fieldRows" @delete-existing="deletedFields.push($event)" />
        </el-tab-pane>
        <el-tab-pane label="关系" name="relation">
          <div class="relation-panel"><el-alert title="关系管理入口已复刻。当前先展示和维护元数据字段；关系表保存将在后端能力确定后接入。" type="info" :closable="false" /><el-table :data="relationRows" border height="420" style="margin-top:12px"><el-table-column prop="pkdbName" label="主表数据库" /><el-table-column prop="pktbName" label="主表表名" /><el-table-column prop="fkdbName" label="从表数据库" /><el-table-column prop="fktbName" label="从表表名" /><el-table-column prop="rlname" label="关系表达式" /></el-table></div>
        </el-tab-pane>
        <el-tab-pane label="数据流" name="flow"><el-empty description="数据流设计入口已保留，后续接工作流定义表" /></el-tab-pane>
        <el-tab-pane label="数据" name="data"><data-preview :table-name="String(tableForm.tblname || '')" /></el-tab-pane>
      </el-tabs>
      <div v-else>
        <view-editor v-model="viewForm" />
        <data-preview :table-name="String(viewForm.vewname || '')" />
      </div>
      <template #footer><el-button @click="designDialog.visible=false">取消</el-button><el-button type="primary" :loading="designDialog.loading" @click="submitDesign">保存</el-button></template>
    </el-dialog>


    <el-dialog v-model="relationDialog.visible" title="表关系设计" width="1500px" append-to-body destroy-on-close class="relation-dialog-wrap">
      <TableRelationDesigner v-if="relationDialog.currentTable" :table="relationDialog.currentTable" height="640px" />
      <el-empty v-else description="未选择表" />
    </el-dialog>

    <el-dialog v-model="systemFieldVisible" title="系统字段" width="860px" append-to-body>
      <el-table :data="systemFields" border height="420"><el-table-column prop="enname" label="字段名" /><el-table-column prop="cnname" label="中文名" /><el-table-column prop="DataTypeName" label="字段类型" /><el-table-column prop="DataLen" label="字段长度" /></el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, resolveComponent, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import { dbDescOf, dbIdOf, dbNameOf, deleteTableMeta, deleteViewMeta, fieldTypeOptions, newGuid, queryDatabases, queryDataPreview, queryFields, queryTables, queryViews, queryTableRelations, rowIdOf, saveFields, saveTableMeta, saveViewMeta, copyTableMeta, type DbRecord, type FieldRecord, type TableRecord, type TableRelationRecord, type ViewRecord } from '@/api/tableAndView'
import type { AnyRow } from '@/api/lowcode'
import TableRelationDesigner from '@/views/platform/table-relation-designer/index.vue'

const FieldEditor = defineComponent({
  name: 'FieldEditor',
  props: { modelValue: { type: Array, required: true } },
  emits: ['update:modelValue', 'delete-existing'],
  setup(props, { emit }) {
    const rows = computed({ get: () => props.modelValue as FieldRecord[], set: (value) => emit('update:modelValue', value) })
    function add() { rows.value = [...rows.value, { enname: '', cnname: '', DataTypeName: '字符串型', DataLen: '100', IsPKey: 0, IsNill: 1, IsUQ: 0, isGrowth: 0 }] }
    function remove(row: FieldRecord, index: number) { if (rowIdOf(row)) emit('delete-existing', row); rows.value = rows.value.filter((_item, i) => i !== index) }
    return () => h('div', { class: 'field-panel' }, [
      h('div', { class: 'field-panel__header' }, [h('span', '字段'), h('div', { class: 'field-panel__actions' }, [h(resolveComponent('el-button'), { type: 'primary', onClick: add }, () => '新增')])]),
      h(resolveComponent('el-table'), { data: rows.value, border: true, height: 420 }, () => [
        h(resolveComponent('el-table-column'), { label: '字段', minWidth: 150 }, { default: ({ row }: any) => h(resolveComponent('el-input'), { modelValue: row.enname, 'onUpdate:modelValue': (v: string) => row.enname = v }) }),
        h(resolveComponent('el-table-column'), { label: '描述', minWidth: 150 }, { default: ({ row }: any) => h(resolveComponent('el-input'), { modelValue: row.cnname, 'onUpdate:modelValue': (v: string) => row.cnname = v }) }),
        h(resolveComponent('el-table-column'), { label: '字段类型', minWidth: 140 }, { default: ({ row }: any) => h(resolveComponent('el-select'), { modelValue: row.DataTypeName, 'onUpdate:modelValue': (v: string) => row.DataTypeName = v, clearable: true }, () => fieldTypeOptions.map(opt => h(resolveComponent('el-option'), { label: opt.label, value: opt.value, key: opt.value }))) }),
        h(resolveComponent('el-table-column'), { label: '长度', width: 90 }, { default: ({ row }: any) => h(resolveComponent('el-input'), { modelValue: row.DataLen, 'onUpdate:modelValue': (v: string) => row.DataLen = v }) }),
        h(resolveComponent('el-table-column'), { label: '主键', width: 70, align: 'center' }, { default: ({ row }: any) => h(resolveComponent('el-checkbox'), { modelValue: Boolean(Number(row.IsPKey)), 'onUpdate:modelValue': (v: boolean) => row.IsPKey = v ? 1 : 0 }) }),
        h(resolveComponent('el-table-column'), { label: '允许为空', width: 92, align: 'center' }, { default: ({ row }: any) => h(resolveComponent('el-checkbox'), { modelValue: Boolean(Number(row.IsNill)), 'onUpdate:modelValue': (v: boolean) => row.IsNill = v ? 1 : 0 }) }),
        h(resolveComponent('el-table-column'), { label: '唯一', width: 76, align: 'center' }, { default: ({ row }: any) => h(resolveComponent('el-checkbox'), { modelValue: Boolean(Number(row.IsUQ)), 'onUpdate:modelValue': (v: boolean) => row.IsUQ = v ? 1 : 0 }) }),
        h(resolveComponent('el-table-column'), { label: '自增长', width: 90, align: 'center' }, { default: ({ row }: any) => h(resolveComponent('el-checkbox'), { modelValue: Boolean(Number(row.isGrowth)), 'onUpdate:modelValue': (v: boolean) => row.isGrowth = v ? 1 : 0 }) }),
        h(resolveComponent('el-table-column'), { label: '默认值', minWidth: 120 }, { default: ({ row }: any) => h(resolveComponent('el-input'), { modelValue: row.DefaultValue, 'onUpdate:modelValue': (v: string) => row.DefaultValue = v }) }),
        h(resolveComponent('el-table-column'), { label: '别名', minWidth: 100 }, { default: ({ row }: any) => h(resolveComponent('el-input'), { modelValue: row.AsName, 'onUpdate:modelValue': (v: string) => row.AsName = v }) }),
        h(resolveComponent('el-table-column'), { label: '备注', minWidth: 120 }, { default: ({ row }: any) => h(resolveComponent('el-input'), { modelValue: row.Memo, 'onUpdate:modelValue': (v: string) => row.Memo = v }) }),
        h(resolveComponent('el-table-column'), { label: '操作', width: 80, fixed: 'right' }, { default: ({ row, $index }: any) => h(resolveComponent('el-button'), { type: 'danger', link: true, onClick: () => remove(row, $index) }, () => '删除') })
      ])
    ])
  }
})

const ViewEditor = defineComponent({
  name: 'ViewEditor',
  props: { modelValue: { type: Object, required: true } },
  emits: ['update:modelValue'],
  setup(props) {
    const row = props.modelValue as ViewRecord
    return () => h('el-form' as any, { model: row, labelWidth: '92px' }, {
      default: () => [
        h('el-form-item' as any, { label: '视图名', required: true }, () => h('el-input' as any, { modelValue: row.vewname, 'onUpdate:modelValue': (v: string) => row.vewname = v })),
        h('el-form-item' as any, { label: '中文名', required: true }, () => h('el-input' as any, { modelValue: row.vewdesc, 'onUpdate:modelValue': (v: string) => row.vewdesc = v })),
        h('el-form-item' as any, { label: '功能描述' }, () => h('el-input' as any, { modelValue: row.functiondesc, 'onUpdate:modelValue': (v: string) => row.functiondesc = v })),
        h('el-form-item' as any, { label: 'SQL' }, () => h('el-input' as any, { type: 'textarea', rows: 8, modelValue: row.sql, 'onUpdate:modelValue': (v: string) => row.sql = v }))
      ]
    })
  }
})

const DataPreview = defineComponent({
  name: 'DataPreview',
  props: { tableName: { type: String, required: true } },
  setup(props) {
    const loading = ref(false)
    const rows = ref<AnyRow[]>([])
    const columns = computed(() => Object.keys(rows.value[0] || {}).slice(0, 12))
    async function load() {
      if (!props.tableName) return
      loading.value = true
      try { rows.value = (await queryDataPreview(props.tableName, 'Id', 20)).list } finally { loading.value = false }
    }
    watch(() => props.tableName, load, { immediate: true })
    return () => h('div', { class: 'data-preview' }, [
      h(resolveComponent('el-button'), { type: 'primary', loading: loading.value, onClick: load, style: 'margin-bottom:12px' }, () => '刷新数据'),
      h(resolveComponent('el-table'), { data: rows.value, border: true, height: 420, loading: loading.value }, () => columns.value.map(col => h(resolveComponent('el-table-column'), { prop: col, label: col, minWidth: 150, showOverflowTooltip: true, key: col })))
    ])
  }
})


const databaseKeyword = ref('')
const databaseLoading = ref(false)
const objectLoading = ref(false)
const fieldLoading = ref(false)
const databaseList = ref<DbRecord[]>([])
const currentDatabase = ref<DbRecord | null>(null)
const objectList = ref<AnyRow[]>([])
const currentObject = ref<AnyRow | null>(null)
const activeTab = ref<'table' | 'view'>('table')
const designTab = ref<'design' | 'relation' | 'flow' | 'data'>('design')
const searchForm = reactive({ keyword: '', cnName: '', creator: '' })
const databasePage = reactive({ pageIndex: 1, pageSize: 20, total: 0 })
const objectPage = reactive({ pageIndex: 1, pageSize: 10, total: 0 })
const tableForm = reactive<TableRecord>({})
const viewForm = reactive<ViewRecord>({})
const fieldRows = ref<FieldRecord[]>([])
const deletedFields = ref<FieldRecord[]>([])
const relationRows = ref<AnyRow[]>([])
const systemFieldVisible = ref(false)
const systemFields = computed(() => fieldRows.value.filter((item) => Number((item as AnyRow).IsSys) === 1))

const registerDialog = reactive({ visible: false, loading: false, form: { name: '', desc: '', sql: '' } })
const addDialog = reactive({ visible: false, loading: false })
const designDialog = reactive({ visible: false, loading: false })
const copyDialog = reactive({ visible: false, loading: false, source: null as TableRecord | null, form: { tblname: '', tbldesc: '' } })
const relationDialog = reactive({
  visible: false,
  loading: false,
  currentTable: null as TableRecord | null,
  tableId: '',
  tableName: '',
  tableDesc: '',
  role: 'all' as 'all' | 'master' | 'child',
  keyword: '',
  rows: [] as TableRelationRecord[],
  pageIndex: 1,
  pageSize: 10,
  total: 0,
  stats: { all: 0, master: 0, child: 0 }
})

function resetTableForm(row?: TableRecord) {
  Object.keys(tableForm).forEach((key) => delete (tableForm as AnyRow)[key])
  Object.assign(tableForm, row ? { ...row } : { rowid: newGuid(), dbid: currentDatabase.value ? dbIdOf(currentDatabase.value) : '', tblname: '', tbldesc: '', functiondesc: '', Expression: '', PhysicsDel: 1, multiTenancy: 0, IsVisible: 1, hasDefaultFields: 0 })
}

function resetViewForm(row?: ViewRecord) {
  Object.keys(viewForm).forEach((key) => delete (viewForm as AnyRow)[key])
  Object.assign(viewForm, row ? { ...row } : { rowid: newGuid(), dbid: currentDatabase.value ? dbIdOf(currentDatabase.value) : '', vewname: '', vewdesc: '', functiondesc: '', sql: '' })
}

async function loadDatabases() {
  databaseLoading.value = true
  try {
    const result = await queryDatabases({ pageIndex: databasePage.pageIndex, pageSize: databasePage.pageSize, keyword: databaseKeyword.value })
    databaseList.value = result.list
    databasePage.total = result.total
    if (!currentDatabase.value && result.list.length) currentDatabase.value = result.list[0]
    if (currentDatabase.value) await loadObjects()
  } catch (error: any) {
    ElMessage.error(error?.message || '获取数据库列表失败')
  } finally { databaseLoading.value = false }
}

async function loadObjects() {
  if (!currentDatabase.value) return
  objectLoading.value = true
  try {
    const common = { pageIndex: objectPage.pageIndex, pageSize: objectPage.pageSize, databaseId: dbIdOf(currentDatabase.value), ...searchForm }
    const result = activeTab.value === 'table' ? await queryTables(common) : await queryViews(common)
    objectList.value = result.list.map((item: AnyRow) => ({ ...item, _rowid: rowIdOf(item) }))
    objectPage.total = result.total
    currentObject.value = objectList.value[0] || null
  } catch (error: any) {
    ElMessage.error(error?.message || '获取表和视图列表失败')
  } finally { objectLoading.value = false }
}

function handleDatabaseChange(row: DbRecord | null) { currentDatabase.value = row; objectPage.pageIndex = 1; loadObjects() }
function handleObjectChange(row: AnyRow | null) { currentObject.value = row }
function handleSearch() { objectPage.pageIndex = 1; loadObjects() }
function handleReset() { searchForm.keyword = ''; searchForm.cnName = ''; searchForm.creator = ''; handleSearch() }
function handleObjectSizeChange() { objectPage.pageIndex = 1; loadObjects() }

function openRegisterDialog() { registerDialog.form.name = ''; registerDialog.form.desc = ''; registerDialog.form.sql = ''; registerDialog.visible = true }
function openAddDialog() { activeTab.value === 'table' ? resetTableForm() : resetViewForm(); fieldRows.value = []; addDialog.visible = true }
async function openDesignDialog(row: AnyRow) {
  if (activeTab.value === 'table') {
    resetTableForm(row as TableRecord)
    await loadSelectedFields()
    designTab.value = 'design'
  } else {
    resetViewForm(row as ViewRecord)
    fieldRows.value = (await queryFields(rowIdOf(row))).list
  }
  designDialog.visible = true
}
function openCopyDialog(row: TableRecord) { copyDialog.source = row; copyDialog.form.tblname = ''; copyDialog.form.tbldesc = ''; copyDialog.visible = true }

async function openRelationDialog(row: TableRecord) {
  relationDialog.currentTable = row
  relationDialog.tableId = rowIdOf(row)
  relationDialog.tableName = String(row.tblname || '')
  relationDialog.tableDesc = String(row.tbldesc || '')
  relationDialog.role = 'all'
  relationDialog.keyword = ''
  relationDialog.pageIndex = 1
  relationDialog.visible = true
  await loadRelationDialogRows()
}

async function loadRelationDialogRows() {
  if (!relationDialog.currentTable) return
  relationDialog.loading = true
  try {
    const result = await queryTableRelations(relationDialog.currentTable, {
      pageIndex: relationDialog.pageIndex,
      pageSize: relationDialog.pageSize,
      keyword: relationDialog.keyword,
      role: relationDialog.role
    })
    relationDialog.rows = result.list
    relationDialog.total = result.total
    relationDialog.stats.all = result.allCount
    relationDialog.stats.master = result.masterCount
    relationDialog.stats.child = result.childCount
  } catch (error: any) {
    ElMessage.error(error?.message || '加载表关系失败')
  } finally {
    relationDialog.loading = false
  }
}

function handleRelationRoleChange() { relationDialog.pageIndex = 1; loadRelationDialogRows() }
function handleRelationPageSizeChange() { relationDialog.pageIndex = 1; loadRelationDialogRows() }

async function loadSelectedFields() {
  const id = rowIdOf(tableForm)
  if (!id) return
  fieldLoading.value = true
  try { fieldRows.value = (await queryFields(id)).list } finally { fieldLoading.value = false }
}

function validateObjectName(name: string) { return /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(name || '').trim()) }
function validateFields() {
  const names = new Set<string>()
  for (const row of fieldRows.value) {
    if (!row.enname || !validateObjectName(row.enname)) throw new Error('字段名不能为空，且只能使用字母、数字、下划线并不能以数字开头')
    if (names.has(row.enname)) throw new Error('字段名重复：' + row.enname)
    names.add(row.enname)
  }
}

async function submitRegister() {
  if (!currentDatabase.value) return
  if (!validateObjectName(registerDialog.form.name)) return ElMessage.warning('名称只能使用字母、数字、下划线并不能以数字开头')
  registerDialog.loading = true
  try {
    if (activeTab.value === 'table') await saveTableMeta({ rowid: newGuid(), dbid: dbIdOf(currentDatabase.value), tblname: registerDialog.form.name, tbldesc: registerDialog.form.desc }, 'add')
    else await saveViewMeta({ rowid: newGuid(), dbid: dbIdOf(currentDatabase.value), vewname: registerDialog.form.name, vewdesc: registerDialog.form.desc, sql: registerDialog.form.sql }, 'add')
    ElMessage.success('注册成功')
    registerDialog.visible = false
    await loadObjects()
  } catch (error: any) { ElMessage.error(error?.message || '注册失败') } finally { registerDialog.loading = false }
}

async function submitAdd() {
  addDialog.loading = true
  try {
    if (activeTab.value === 'table') {
      if (!validateObjectName(String(tableForm.tblname || ''))) throw new Error('表名格式不正确')
      validateFields()
      const rowid = String(tableForm.rowid || newGuid())
      tableForm.rowid = rowid
      tableForm.dbid = currentDatabase.value ? dbIdOf(currentDatabase.value) : tableForm.dbid
      await saveTableMeta(tableForm, 'add')
      if (fieldRows.value.length) await saveFields(fieldRows.value.map((item) => ({ ...item, tblid: rowid, tblname: tableForm.tblname })))
    } else {
      if (!validateObjectName(String(viewForm.vewname || ''))) throw new Error('视图名格式不正确')
      viewForm.dbid = currentDatabase.value ? dbIdOf(currentDatabase.value) : viewForm.dbid
      await saveViewMeta(viewForm, 'add')
    }
    ElMessage.success('新增成功')
    addDialog.visible = false
    await loadObjects()
  } catch (error: any) { ElMessage.error(error?.message || '新增失败') } finally { addDialog.loading = false }
}

async function submitDesign() {
  designDialog.loading = true
  try {
    if (activeTab.value === 'table') {
      validateFields()
      await saveTableMeta(tableForm, 'edit')
      await saveFields(fieldRows.value.map((item) => ({ ...item, tblid: rowIdOf(tableForm), tblname: tableForm.tblname })), deletedFields.value)
      deletedFields.value = []
    } else {
      await saveViewMeta(viewForm, 'edit')
      if (fieldRows.value.length) await saveFields(fieldRows.value.map((item) => ({ ...item, tblid: rowIdOf(viewForm), tblname: viewForm.vewname })))
    }
    ElMessage.success('保存成功')
    designDialog.visible = false
    await loadObjects()
  } catch (error: any) { ElMessage.error(error?.message || '保存失败') } finally { designDialog.loading = false }
}

async function handleDelete(row: AnyRow) {
  try {
    await ElMessageBox.confirm('确定删除该元数据吗？当前只删除元数据记录，不删除物理对象。', '删除确认', { type: 'warning' })
    if (activeTab.value === 'table') await deleteTableMeta(rowIdOf(row))
    else await deleteViewMeta(rowIdOf(row))
    ElMessage.success('删除成功')
    await loadObjects()
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error('删除失败') }
}

async function submitCopy() {
  if (!copyDialog.source) return
  if (!validateObjectName(copyDialog.form.tblname)) return ElMessage.warning('新表名格式不正确')
  copyDialog.loading = true
  try {
    const fields = (await queryFields(rowIdOf(copyDialog.source))).list
    await copyTableMeta(copyDialog.source, fields, copyDialog.form.tblname, copyDialog.form.tbldesc)
    ElMessage.success('复制成功')
    copyDialog.visible = false
    await loadObjects()
  } catch (error: any) { ElMessage.error(error?.message || '复制失败') } finally { copyDialog.loading = false }
}

function addFieldRow() { fieldRows.value.unshift({ enname: '', cnname: '', DataTypeName: '字符串型', DataLen: '100', IsPKey: 0, IsNill: 1, IsUQ: 0, isGrowth: 0 }) }
function autoDescribeFields() { fieldRows.value.forEach((row) => { if (!row.cnname && row.enname) row.cnname = row.enname }); ElMessage.success('已根据字段名回填描述') }
function aiFillFields() { if (!fieldRows.value.length) addFieldRow(); ElMessage.info('AI填表入口已复刻，后续接入 AI 组件') }

function normalizeRelationExp(value: unknown): any {
  if (!value) return null
  if (typeof value === 'object') return value
  const text = String(value || '').trim()
  if (!text) return null
  try { return JSON.parse(text) } catch { return null }
}

function flattenRelationFilters(exp: any): any[] {
  if (!exp) return []
  if (Array.isArray(exp)) return exp.flatMap(flattenRelationFilters)
  const type = String(exp.Type || exp.type || '').toLowerCase()
  if (type === 'cond') return [exp]
  const filters = exp.Filters || exp.filters || []
  return Array.isArray(filters) ? filters.flatMap(flattenRelationFilters) : []
}

function shortFieldName(value: unknown) {
  const text = String(value || '').trim()
  if (!text) return ''
  const parts = text.split('.')
  return parts[parts.length - 1] || text
}

function relationOperatorText(operator: unknown) {
  const op = String(operator || '').toLowerCase()
  const map: Record<string, string> = {
    equal: '=',
    eq: '=',
    notequal: '≠',
    not_equal: '≠',
    contains: '包含',
    container: '包含',
    startswith: '开头匹配',
    endswith: '结尾匹配',
    greater: '>',
    greaterthan: '>',
    less: '<',
    lessthan: '<'
  }
  return map[op] || String(operator || '=') || '='
}

function extractRelationFieldPairs(row: TableRelationRecord) {
  const exp = normalizeRelationExp((row as AnyRow).RelshipExp)
  const filters = flattenRelationFilters(exp)
  const pairs = filters.map((item) => {
    const left = shortFieldName(item.Field || item.field)
    const right = shortFieldName(item.ValueFun?.Field || item.valueFun?.Field || item.ValueFun?.field || item.valueFun?.field || item.Value)
    const op = relationOperatorText(item.Operator || item.operator)
    if (left && right) return left + ' ' + op + ' ' + right
    if (left) return left + ' ' + op
    return ''
  }).filter(Boolean)
  if (pairs.length) return pairs

  const name = String(row.rlname || '').trim()
  if (name) return [name]
  const memo = String(row.memo || row.description || '').trim()
  return memo ? [memo] : ['字段关系未配置']
}

const relationGraphViewBox = '0 0 1120 430'
const relationGraphNodes = computed(() => {
  const currentName = relationDialog.tableName
  const currentId = relationDialog.tableId || currentName
  const related = new Map<string, { tableName: string; role: 'master' | 'child'; count: number }>()

  relationDialog.rows.forEach((row) => {
    const pk = String(row.pktable || '').trim()
    const fk = String(row.fktable || '').trim()
    const currentLower = currentName.toLowerCase()
    if (pk && pk.toLowerCase() !== currentLower) {
      const key = 'pk:' + pk
      const prev = related.get(key)
      related.set(key, { tableName: pk, role: 'master', count: (prev?.count || 0) + 1 })
    }
    if (fk && fk.toLowerCase() !== currentLower) {
      const key = 'fk:' + fk
      const prev = related.get(key)
      related.set(key, { tableName: fk, role: 'child', count: (prev?.count || 0) + 1 })
    }
  })

  const leftNodes = Array.from(related.values()).filter((item) => item.role === 'master').slice(0, 4)
  const rightNodes = Array.from(related.values()).filter((item) => item.role === 'child').slice(0, 4)
  const vertical = (index: number, total: number) => total <= 1 ? 168 : 52 + index * Math.min(108, 320 / Math.max(total - 1, 1))
  const nodes: Array<{ id: string; tableName: string; role: 'current' | 'master' | 'child'; x: number; y: number; isCurrent: boolean; badge: string; roleLabel: string; meta: string; className: string }> = []

  leftNodes.forEach((item, index) => nodes.push({ id: 'master:' + item.tableName, tableName: item.tableName, role: 'master', x: 42, y: vertical(index, leftNodes.length), isCurrent: false, badge: 'PK', roleLabel: '上游主表', meta: '关联 ' + item.count + ' 条关系', className: 'relation-graph-node--master' }))
  nodes.push({ id: 'current:' + currentId, tableName: currentName || '当前表', role: 'current', x: 435, y: 158, isCurrent: true, badge: '当前', roleLabel: '当前表', meta: currentId || '-', className: 'relation-graph-node--current' })
  rightNodes.forEach((item, index) => nodes.push({ id: 'child:' + item.tableName, tableName: item.tableName, role: 'child', x: 828, y: vertical(index, rightNodes.length), isCurrent: false, badge: 'FK', roleLabel: '下游从表', meta: '关联 ' + item.count + ' 条关系', className: 'relation-graph-node--child' }))
  return nodes
})

function findRelationNode(tableName: string, preferredRole: 'master' | 'child') {
  const normalized = String(tableName || '').toLowerCase()
  return relationGraphNodes.value.find((node) => node.role === preferredRole && node.tableName.toLowerCase() === normalized)
}

const relationGraphEdges = computed(() => {
  const current = relationGraphNodes.value.find((node) => node.role === 'current')
  if (!current) return []
  const currentName = relationDialog.tableName.toLowerCase()
  return relationDialog.rows.map((row, index) => {
    const pk = String(row.pktable || '').trim()
    const fk = String(row.fktable || '').trim()
    const currentIsPk = pk.toLowerCase() === currentName
    const otherNode = currentIsPk ? findRelationNode(fk, 'child') : findRelationNode(pk, 'master')
    if (!otherNode) return null

    const from = currentIsPk ? current : otherNode
    const to = currentIsPk ? otherNode : current
    const fromX = from.x + 250
    const fromY = from.y + 45 + (index % 3) * 8
    const toX = to.x
    const toY = to.y + 45 + (index % 3) * 8
    const midX = (fromX + toX) / 2
    const c1x = fromX + (toX - fromX) * 0.38
    const c2x = fromX + (toX - fromX) * 0.62
    const labelPairs = extractRelationFieldPairs(row)
    const label = labelPairs.slice(0, 2).join('；')
    return {
      id: String(row.row_id || index),
      path: 'M ' + fromX + ' ' + fromY + ' C ' + c1x + ' ' + fromY + ', ' + c2x + ' ' + toY + ', ' + toX + ' ' + toY,
      labelX: midX,
      labelY: (fromY + toY) / 2,
      name: String(row.rlname || '字段关联'),
      label: label || '字段关系未配置',
      fullLabel: labelPairs.join('；')
    }
  }).filter(Boolean) as Array<{ id: string; path: string; labelX: number; labelY: number; name: string; label: string; fullLabel: string }>
})

onMounted(loadDatabases)
</script>

<style scoped>
.table-view-page { padding: 20px; }
.layout-grid { display: grid; grid-template-columns: 420px minmax(0, 1fr); gap: 20px; align-items: start; }
.panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.panel-header--wide { align-items: center; }
.panel-title { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; }
.panel-subtitle { color: #606266; font-size: 14px; font-weight: 400; }
.panel-actions { display: flex; gap: 12px; }
.tab-toolbar { margin-bottom: 8px; }
.search-form { margin-bottom: 16px; }
.database-pagination-wrapper, .pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
.tip-box { padding: 10px 12px; margin-bottom: 14px; background: #f4f8ff; border: 1px solid #d9ecff; color: #606266; border-radius: 6px; }
.form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 18px; align-items: start; }
.design-form-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.toggle-row { grid-column: 1 / -1; display: flex; gap: 28px; padding-left: 8px; margin-bottom: 12px; }
.field-panel { border-top: 1px solid var(--el-border-color-lighter); padding-top: 14px; }
.field-panel__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 14px; font-weight: 600; }
.field-panel__actions { display: flex; gap: 12px; }
.field-toolbar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.design-tabs :deep(.el-tabs__header) { margin-bottom: 12px; }
.relation-panel { min-height: 520px; }
.data-preview { margin-top: 12px; }
.dialog-footer { display: flex; justify-content: flex-end; }
.relation-design-page { display: flex; flex-direction: column; gap: 12px; }
.relation-workbench { display: flex; flex-direction: column; padding: 12px 16px; border: 1px solid #dde6f1; border-radius: 16px; background: linear-gradient(180deg, #fbfdff 0%, #f5f9fd 100%); }
.relation-workbench__hero { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.relation-workbench__eyebrow { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; background: rgba(37, 99, 235, 0.08); color: #2457c5; font-size: 11px; font-weight: 700; }
.relation-workbench__title-top { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
.relation-workbench__title-block { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.relation-workbench__title-block h2 { margin: 0; color: #132238; font-size: 16px; line-height: 1.2; }
.relation-workbench__title-block p { margin: 0; max-width: 440px; color: #52627a; font-size: 11px; line-height: 1.4; }
.relation-workbench__summary { display: flex; align-items: stretch; gap: 8px; margin-left: auto; }
.relation-workbench__primary-stat { display: flex; flex-direction: column; justify-content: center; gap: 3px; min-width: 188px; height: 72px; padding: 9px 12px; box-sizing: border-box; border: 1px solid #dbe6f3; border-radius: 10px; background: #fff; }
.relation-workbench__primary-label, .relation-workbench__metric-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #607189; font-size: 11px; font-weight: 600; }
.relation-workbench__primary-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #132238; font-size: 15px; line-height: 1.2; }
.relation-workbench__primary-note { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #7b8ca3; font-size: 11px; line-height: 1.4; }
.relation-workbench__secondary-stats { display: flex; align-items: stretch; gap: 8px; justify-content: flex-end; }
.relation-workbench__metric-chip { display: inline-flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 5px; min-width: 88px; height: 72px; padding: 9px 12px; box-sizing: border-box; border: 1px solid #dbe6f3; border-radius: 10px; background: #fff; }
.relation-workbench__metric-value { color: #132238; font-size: 18px; line-height: 1.1; }
.relation-canvas-panel { display: flex; flex-direction: column; gap: 10px; }
.relation-canvas-panel__header { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.relation-canvas-panel__intro h3 { margin: 0; color: #132238; font-size: 18px; }
.relation-canvas-panel__intro p { margin: 4px 0 0; color: #5f718b; font-size: 12px; line-height: 1.5; }
.relation-canvas-panel__meta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.relation-canvas-panel__legend-card { height: 88px; box-sizing: border-box; --legend-border: #d7e1ee; --legend-surface: #ffffff; --legend-header: #f3f6fb; --legend-header-text: #475569; --legend-title: #132238; --legend-note: #64748b; --legend-badge-bg: #eef2f7; --legend-badge-text: #475569; --legend-accent: #64748b; --legend-halo: rgba(148, 163, 184, 0.08); position: relative; display: inline-flex; align-items: stretch; min-width: 176px; max-width: 230px; border: 1px solid var(--legend-border); border-radius: 16px; background: linear-gradient(180deg, var(--legend-surface) 0%, #ffffff 100%); box-shadow: 0 10px 26px var(--legend-halo); overflow: hidden; }
.relation-canvas-panel__legend-card-accent { width: 8px; flex: 0 0 8px; background: linear-gradient(180deg, color-mix(in srgb, var(--legend-accent) 32%, #ffffff) 0%, transparent 100%); }
.relation-canvas-panel__legend-card-content { display: flex; flex-direction: column; justify-content: space-between; gap: 6px; min-width: 0; padding: 9px 12px 10px; flex: 1; }
.relation-canvas-panel__legend-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 0; }
.relation-canvas-panel__legend-card-type, .relation-canvas-panel__legend-card-badge { display: inline-flex; align-items: center; padding: 4px 9px; border-radius: 999px; font-size: 10px; font-weight: 700; line-height: 1; white-space: nowrap; }
.relation-canvas-panel__legend-card-type { background: var(--legend-header); color: var(--legend-header-text); }
.relation-canvas-panel__legend-card-badge { background: var(--legend-badge-bg); color: var(--legend-badge-text); }
.relation-canvas-panel__legend-card-title { position: relative; display: inline-flex; align-self: flex-start; padding-bottom: 6px; color: var(--legend-title); font-size: 14px; line-height: 1.2; }
.relation-canvas-panel__legend-card-title::after { content: ''; position: absolute; left: 0; bottom: 0; width: 44px; height: 3px; border-radius: 999px; background: color-mix(in srgb, var(--legend-accent) 34%, #ffffff); }
.relation-canvas-panel__legend-card-note { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: var(--legend-note); font-size: 11px; line-height: 1.45; }
.relation-canvas-panel__legend-card--main { --legend-border: #f19ca4; --legend-surface: #fffdfd; --legend-header: #fff1f2; --legend-header-text: #be123c; --legend-title: #3a1720; --legend-note: #7c4755; --legend-badge-bg: #fee2e2; --legend-badge-text: #b91c1c; --legend-accent: #dc2626; --legend-halo: rgba(220, 38, 38, 0.08); }
.relation-canvas-panel__legend-card--business { --legend-border: #a9c0ff; --legend-surface: #ffffff; --legend-header: #eef4ff; --legend-header-text: #1d4ed8; --legend-title: #152845; --legend-note: #506584; --legend-badge-bg: #dbeafe; --legend-badge-text: #1d4ed8; --legend-accent: #2563eb; --legend-halo: rgba(37, 99, 235, 0.08); }
.source-dialog__tabs { margin-top: -4px; }
.source-dialog__header-filter { display: flex; flex-direction: column; gap: 8px; }
.source-dialog__header-filter span { color: #5e7089; font-size: 12px; font-weight: 700; }
.source-dialog__footer { display: flex; justify-content: flex-end; margin-top: 16px; }
.relation-table-cell { display: flex; align-items: center; gap: 8px; min-width: 0; }
.relation-graph-canvas { position: relative; height: 430px; margin: 4px 0 12px; border: 1px solid #dbe6f3; border-radius: 18px; overflow: hidden; background: radial-gradient(circle at 20% 20%, rgba(37,99,235,.08), transparent 26%), linear-gradient(180deg,#fbfdff 0%,#f6faff 100%); }
.relation-graph-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.relation-graph-edge { fill: none; stroke: #2563eb; stroke-width: 2.2; stroke-linecap: round; opacity: .8; }
.relation-graph-edge-label { display: flex; flex-direction: column; justify-content: center; gap: 3px; max-width: 290px; min-height: 44px; padding: 6px 10px; box-sizing: border-box; border: 1px solid #bfdbfe; border-radius: 999px; background: rgba(255,255,255,.94); box-shadow: 0 8px 20px rgba(37,99,235,.12); color: #1e3a8a; font-size: 11px; line-height: 1.2; overflow: hidden; text-align: center; }
.relation-graph-edge-label__name { color: #64748b; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.relation-graph-edge-label strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.relation-graph-node { position: absolute; width: 250px; min-height: 92px; padding: 12px 14px; box-sizing: border-box; border-radius: 18px; border: 1px solid #d7e1ee; background: #fff; box-shadow: 0 14px 34px rgba(15,23,42,.08); }
.relation-graph-node__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; color: #64748b; font-size: 12px; font-weight: 700; }
.relation-graph-node__title { display: block; color: #132238; font-size: 15px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.relation-graph-node__meta { display: block; margin-top: 8px; color: #7b8ca3; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.relation-graph-node--current { border-color: #86efac; background: linear-gradient(180deg,#f0fdf4 0%,#fff 100%); }
.relation-graph-node--master { border-color: #fecaca; background: linear-gradient(180deg,#fff1f2 0%,#fff 100%); }
.relation-graph-node--child { border-color: #bfdbfe; background: linear-gradient(180deg,#eff6ff 0%,#fff 100%); }
.relation-graph-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.72); }
@media (max-width: 1200px) { .layout-grid { grid-template-columns: 1fr; } .relation-workbench__hero, .relation-canvas-panel__header { flex-direction: column; align-items: flex-start; } .relation-workbench__summary { margin-left: 0; width: 100%; flex-wrap: wrap; } .relation-canvas-panel__meta { justify-content: flex-start; } }
</style>
