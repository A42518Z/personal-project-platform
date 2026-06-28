<template>
  <div class="field-designer">
    <aside class="field-designer__side">
      <div class="field-designer__side-head">
        <div>
          <strong>字段导航</strong>
          <span>{{ filteredRows.length }} / {{ rows.length }}</span>
        </div>
        <el-input v-model="keyword" size="small" clearable placeholder="搜索字段/描述" />
      </div>
      <div class="field-designer__quick-actions">
        <el-button size="small" type="primary" @click="addField">新增</el-button>
        <el-dropdown @command="applyTemplate">
          <el-button size="small">模板</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="project">项目表字段</el-dropdown-item>
              <el-dropdown-item command="dict">字典表字段</el-dropdown-item>
              <el-dropdown-item command="tree">树形表字段</el-dropdown-item>
              <el-dropdown-item command="log">日志表字段</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div class="field-designer__field-list">
        <button
          v-for="(row, index) in filteredRows"
          :key="fieldKey(row)"
          type="button"
          class="field-designer__field-item"
          :class="{ 'is-active': fieldKey(row) === selectedKey, 'has-error': getRowErrors(row).length }"
          @click="selectRow(row)"
        >
          <span class="field-designer__field-main">
            <strong>{{ row.enname || '未命名字段' }}</strong>
            <small>{{ row.cnname || row.DataTypeName || '-' }}</small>
          </span>
          <span class="field-designer__field-badges">
            <em v-if="Number(row.IsPKey) === 1">PK</em>
            <em v-if="Number(row.IsSys) === 1">SYS</em>
            <em v-if="getRowErrors(row).length" class="danger">{{ getRowErrors(row).length }}</em>
          </span>
        </button>
        <el-empty v-if="!filteredRows.length" description="没有匹配字段" :image-size="80" />
      </div>
    </aside>

    <main class="field-designer__main">
      <div class="field-designer__toolbar">
        <div class="field-designer__toolbar-left">
          <el-button type="primary" @click="addField">新增字段</el-button>
          <el-button @click="duplicateSelected" :disabled="!selectedRow">复制选中</el-button>
          <el-button @click="openBatchPaste">批量粘贴</el-button>
          <el-button @click="addDefaultFields">默认字段</el-button>
          <el-button @click="autoDescribeFields">一键描述</el-button>
        </div>
        <div class="field-designer__toolbar-right">
          <el-switch v-model="showAdvancedColumns" active-text="高级列" />
          <el-tag v-if="allErrors.length" type="danger" effect="light">{{ allErrors.length }} 个问题</el-tag>
          <el-tag v-else type="success" effect="light">校验通过</el-tag>
        </div>
      </div>

      <el-table
        ref="tableRef"
        :data="filteredRows"
        border
        stripe
        height="430"
        row-key="__designerKey"
        highlight-current-row
        @current-change="selectRow"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="44" />
        <el-table-column label="#" width="56" align="center">
          <template #default="{ row }">{{ rows.indexOf(row) + 1 }}</template>
        </el-table-column>
        <el-table-column label="字段名" min-width="170">
          <template #default="{ row }">
            <el-input v-model="row.enname" placeholder="project_name" @change="touchRows" />
            <div v-if="getRowErrors(row).some((item) => item.includes('字段名'))" class="field-designer__cell-error">{{ getRowErrors(row).find((item) => item.includes('字段名')) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="170">
          <template #default="{ row }"><el-input v-model="row.cnname" placeholder="项目名称" @change="touchRows" /></template>
        </el-table-column>
        <el-table-column label="字段类型" min-width="150">
          <template #default="{ row }">
            <el-select v-model="row.DataTypeName" filterable placeholder="类型" @change="handleTypeChange(row)">
              <el-option v-for="item in fieldTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="长度" width="100">
          <template #default="{ row }"><el-input v-model="row.DataLen" placeholder="100" @change="touchRows" /></template>
        </el-table-column>
        <el-table-column label="主键" width="72" align="center">
          <template #default="{ row }"><el-checkbox v-model="row.IsPKey" :true-label="1" :false-label="0" @change="handlePrimaryChange(row)" /></template>
        </el-table-column>
        <el-table-column label="可空" width="72" align="center">
          <template #default="{ row }"><el-checkbox v-model="row.IsNill" :true-label="1" :false-label="0" @change="touchRows" /></template>
        </el-table-column>
        <el-table-column label="唯一" width="72" align="center">
          <template #default="{ row }"><el-checkbox v-model="row.IsUQ" :true-label="1" :false-label="0" @change="touchRows" /></template>
        </el-table-column>
        <el-table-column label="自增长" width="86" align="center">
          <template #default="{ row }"><el-checkbox v-model="row.isGrowth" :true-label="1" :false-label="0" @change="handleGrowthChange(row)" /></template>
        </el-table-column>
        <el-table-column label="默认值" min-width="130">
          <template #default="{ row }"><el-input v-model="row.DefaultValue" @change="touchRows" /></template>
        </el-table-column>
        <el-table-column v-if="showAdvancedColumns" label="别名" min-width="120">
          <template #default="{ row }"><el-input v-model="row.AsName" @change="touchRows" /></template>
        </el-table-column>
        <el-table-column v-if="showAdvancedColumns" label="控件" min-width="130">
          <template #default="{ row }"><el-input v-model="row.UseCtrlName" placeholder="Input/Select" @change="touchRows" /></template>
        </el-table-column>
        <el-table-column v-if="showAdvancedColumns" label="AI" width="72" align="center">
          <template #default="{ row }"><el-checkbox v-model="row.allowAIAdd" :true-label="1" :false-label="0" @change="touchRows" /></template>
        </el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="moveRow(row, -1)">上移</el-button>
            <el-button link type="primary" @click="moveRow(row, 1)">下移</el-button>
            <el-button link type="danger" @click="removeRow(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </main>

    <aside class="field-designer__props">
      <template v-if="selectedRow">
        <div class="field-designer__props-head">
          <div>
            <strong>{{ selectedRow.enname || '字段属性' }}</strong>
            <span>{{ selectedRow.cnname || selectedRow.DataTypeName || '-' }}</span>
          </div>
          <el-tag v-if="Number(selectedRow.IsPKey) === 1" type="success">主键</el-tag>
        </div>
        <el-alert v-if="selectedErrors.length" type="error" :closable="false" class="field-designer__props-alert">
          <template #title>
            <div v-for="item in selectedErrors" :key="item">{{ item }}</div>
          </template>
        </el-alert>
        <el-collapse v-model="openPanels">
          <el-collapse-item title="基础信息" name="base">
            <el-form label-width="92px" label-position="left">
              <el-form-item label="字段名"><el-input v-model="selectedRow.enname" @change="touchRows" /></el-form-item>
              <el-form-item label="中文名"><el-input v-model="selectedRow.cnname" @change="touchRows" /></el-form-item>
              <el-form-item label="字段类型"><el-select v-model="selectedRow.DataTypeName" @change="handleTypeChange(selectedRow)"><el-option v-for="item in fieldTypeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
              <el-form-item label="字段长度"><el-input v-model="selectedRow.DataLen" @change="touchRows" /></el-form-item>
            </el-form>
          </el-collapse-item>
          <el-collapse-item title="展示与交互" name="display">
            <el-form label-width="92px" label-position="left">
              <el-form-item label="别名"><el-input v-model="selectedRow.AsName" @change="touchRows" /></el-form-item>
              <el-form-item label="控件类型"><el-input v-model="selectedRow.UseCtrlName" placeholder="Input / Select / DatePicker" @change="touchRows" /></el-form-item>
              <el-form-item label="应用格式"><el-input v-model="selectedRow.applyFormat" @change="touchRows" /></el-form-item>
              <el-form-item label="备注"><el-input v-model="selectedRow.Memo" type="textarea" :rows="3" @change="touchRows" /></el-form-item>
            </el-form>
          </el-collapse-item>
          <el-collapse-item title="规则与安全" name="rule">
            <el-form label-width="92px" label-position="left">
              <el-form-item label="默认值类型"><el-input v-model="selectedRow.DefaultValueType" @change="touchRows" /></el-form-item>
              <el-form-item label="最小值"><el-input v-model="selectedRow.minVal" @change="touchRows" /></el-form-item>
              <el-form-item label="最大值"><el-input v-model="selectedRow.maxVal" @change="touchRows" /></el-form-item>
              <el-form-item label="脱敏ID"><el-input v-model="selectedRow.DesenID" @change="touchRows" /></el-form-item>
              <el-form-item label="加密规则"><el-input v-model="selectedRow.encryption_rule" @change="touchRows" /></el-form-item>
              <el-form-item label="值函数"><el-input v-model="selectedRow.ValueFun" type="textarea" :rows="3" @change="touchRows" /></el-form-item>
            </el-form>
          </el-collapse-item>
          <el-collapse-item title="表达式与 AI" name="ai">
            <el-form label-width="92px" label-position="left">
              <el-form-item label="允许AI"><el-switch v-model="selectedRow.allowAIAdd" :active-value="1" :inactive-value="0" @change="touchRows" /></el-form-item>
              <el-form-item label="功能描述"><el-input v-model="selectedRow.functiondesc" type="textarea" :rows="3" @change="touchRows" /></el-form-item>
              <el-form-item label="SQL表达式"><el-input v-model="selectedRow.SQLExpression" type="textarea" :rows="3" @change="touchRows" /></el-form-item>
              <el-form-item label="数据表达式"><el-input v-model="selectedRow.DataTableExpression" type="textarea" :rows="3" @change="touchRows" /></el-form-item>
            </el-form>
          </el-collapse-item>
        </el-collapse>
      </template>
      <el-empty v-else description="选择一个字段查看属性" :image-size="90" />
    </aside>

    <el-dialog v-model="batchDialog.visible" title="批量粘贴字段" width="760px" append-to-body>
      <el-alert title="每行一个字段，支持 tab/逗号/空格分隔：字段名 中文名 类型 长度。也可以直接从 Excel 复制。" type="info" :closable="false" />
      <el-input v-model="batchDialog.text" type="textarea" :rows="12" class="field-designer__batch-text" placeholder="project_name\t项目名称\t字符串型\t100" />
      <template #footer>
        <el-button @click="batchDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitBatchPaste">导入字段</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fieldTypeOptions, newGuid, rowIdOf, type FieldRecord } from '@/api/tableAndView'
import type { AnyRow } from '@/api/lowcode'

const props = defineProps<{
  modelValue: FieldRecord[]
  tableName?: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: FieldRecord[]): void
  (event: 'delete-existing', value: FieldRecord): void
  (event: 'change'): void
}>()

const keyword = ref('')
const selectedKey = ref('')
const selectedRows = ref<FieldRecord[]>([])
const showAdvancedColumns = ref(false)
const openPanels = ref(['base', 'display'])
const tableRef = ref()
const batchDialog = reactive({ visible: false, text: '' })

const rows = computed<FieldRecord[]>({
  get: () => ensureKeys(props.modelValue || []),
  set: (value) => emitRows(value)
})

const filteredRows = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return rows.value
  return rows.value.filter((row) => [row.enname, row.cnname, row.DataTypeName, row.Memo, row.AsName].some((value) => String(value || '').toLowerCase().includes(text)))
})

const selectedRow = computed(() => rows.value.find((row) => fieldKey(row) === selectedKey.value) || rows.value[0] || null)
const selectedErrors = computed(() => selectedRow.value ? getRowErrors(selectedRow.value) : [])
const allErrors = computed(() => rows.value.flatMap((row, index) => getRowErrors(row).map((message) => ({ index, field: row.enname, message }))))

watch(() => props.modelValue, () => {
  ensureKeys(props.modelValue || [])
  if (!selectedKey.value && rows.value.length) selectedKey.value = fieldKey(rows.value[0])
}, { deep: true, immediate: true })

function ensureKeys(value: FieldRecord[]) {
  value.forEach((row) => {
    const anyRow = row as AnyRow
    if (!anyRow.__designerKey) anyRow.__designerKey = rowIdOf(row) || newGuid()
  })
  return value
}

function fieldKey(row: FieldRecord) {
  const anyRow = row as AnyRow
  return String(anyRow.__designerKey || rowIdOf(row) || row.enname || '')
}

function normalizeField(row: Partial<FieldRecord> = {}): FieldRecord {
  const next: FieldRecord = {
    enname: '',
    cnname: '',
    DataTypeName: '字符串型',
    DataType: '字符串型',
    DataLen: '100',
    IsPKey: 0,
    IsNill: 1,
    IsUQ: 0,
    isGrowth: 0,
    allowAIAdd: 0,
    ...row
  }
  ;(next as AnyRow).__designerKey = (row as AnyRow).__designerKey || rowIdOf(next) || newGuid()
  return next
}

function emitRows(value: FieldRecord[]) {
  const next = value.map((row, index) => ({ ...row, ordIdx: index + 1 }))
  emit('update:modelValue', next)
  emit('change')
}

function touchRows() {
  emitRows([...rows.value])
}

function selectRow(row: FieldRecord | null) {
  if (!row) return
  selectedKey.value = fieldKey(row)
  nextTick(() => tableRef.value?.setCurrentRow?.(row))
}

function handleSelectionChange(value: FieldRecord[]) {
  selectedRows.value = value
}

function addField(seed: Partial<FieldRecord> = {}) {
  const next = normalizeField(seed)
  rows.value = [next, ...rows.value]
  selectedKey.value = fieldKey(next)
}

function addFields(fields: Partial<FieldRecord>[]) {
  const existing = new Set(rows.value.map((row) => String(row.enname || '').toLowerCase()).filter(Boolean))
  const nextFields = fields.map(normalizeField).map((row) => {
    let name = String(row.enname || '').trim()
    if (name) {
      const base = name
      let i = 2
      while (existing.has(name.toLowerCase())) {
        name = base + '_' + i
        i += 1
      }
      row.enname = name
      existing.add(name.toLowerCase())
    }
    return row
  })
  rows.value = [...nextFields, ...rows.value]
  if (nextFields[0]) selectedKey.value = fieldKey(nextFields[0])
}

function duplicateSelected() {
  const source = selectedRow.value
  if (!source) return
  const copy = { ...source }
  delete (copy as AnyRow).row_id
  delete (copy as AnyRow).rowid
  ;(copy as AnyRow).__designerKey = newGuid()
  copy.enname = uniqueFieldName(String(source.enname || 'field') + '_copy')
  copy.cnname = source.cnname ? String(source.cnname) + '副本' : ''
  addField(copy)
}

function uniqueFieldName(baseName: string) {
  const names = new Set(rows.value.map((row) => String(row.enname || '').toLowerCase()))
  let name = baseName.replace(/[^A-Za-z0-9_]/g, '_') || 'field'
  let i = 2
  while (names.has(name.toLowerCase())) {
    name = baseName + '_' + i
    i += 1
  }
  return name
}

async function removeRow(row: FieldRecord) {
  if (Number((row as AnyRow).IsSys) === 1) {
    await ElMessageBox.confirm('这是系统字段，删除可能影响通用能力。仍然删除吗？', '系统字段确认', { type: 'warning' })
  } else {
    await ElMessageBox.confirm('确定删除字段「' + (row.enname || '未命名字段') + '」吗？保存前会进入删除变更列表。', '删除字段', { type: 'warning' })
  }
  if (rowIdOf(row)) emit('delete-existing', row)
  const next = rows.value.filter((item) => fieldKey(item) !== fieldKey(row))
  rows.value = next
  if (selectedKey.value === fieldKey(row)) selectedKey.value = next[0] ? fieldKey(next[0]) : ''
}

function moveRow(row: FieldRecord, offset: number) {
  const list = [...rows.value]
  const index = list.findIndex((item) => fieldKey(item) === fieldKey(row))
  const target = index + offset
  if (index < 0 || target < 0 || target >= list.length) return
  const [current] = list.splice(index, 1)
  list.splice(target, 0, current)
  rows.value = list
}

function handleTypeChange(row: FieldRecord) {
  row.DataType = row.DataTypeName
  if (row.DataTypeName === '整数型' && !row.DataLen) row.DataLen = '11'
  if (row.DataTypeName === '日期型') row.DataLen = ''
  if (row.DataTypeName === '文本型') row.DataLen = ''
  touchRows()
}

function handlePrimaryChange(row: FieldRecord) {
  if (Number(row.IsPKey) === 1) {
    row.IsNill = 0
    row.IsUQ = 1
  }
  touchRows()
}

function handleGrowthChange(row: FieldRecord) {
  if (Number(row.isGrowth) === 1) {
    row.IsPKey = 1
    row.IsNill = 0
    row.IsUQ = 1
    if (!row.DataTypeName) row.DataTypeName = '整数型'
  }
  touchRows()
}

function getRowErrors(row: FieldRecord) {
  const errors: string[] = []
  const name = String(row.enname || '').trim()
  if (!name) errors.push('字段名不能为空')
  else if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) errors.push('字段名格式不正确')
  const duplicateCount = rows.value.filter((item) => String(item.enname || '').trim().toLowerCase() === name.toLowerCase()).length
  if (name && duplicateCount > 1) errors.push('字段名重复')
  if (Number(row.IsPKey) === 1 && Number(row.IsNill) === 1) errors.push('主键不能允许为空')
  if (Number(row.isGrowth) === 1 && Number(row.IsPKey) !== 1) errors.push('自增长字段应为主键')
  if (row.DataLen && !/^\d+(,\d+)?$/.test(String(row.DataLen)) && !['日期型', '文本型'].includes(String(row.DataTypeName || ''))) errors.push('长度建议填写数字')
  return errors
}

function autoDescribeFields() {
  rows.value.forEach((row) => {
    if (!row.cnname && row.enname) row.cnname = smartDescription(String(row.enname))
  })
  touchRows()
  ElMessage.success('已按字段名回填空描述')
}

function smartDescription(name: string) {
  const map: Record<string, string> = {
    id: 'ID', rowid: '唯一值', row_id: '唯一值', name: '名称', title: '标题', code: '编码', type: '类型', status: '状态', remark: '备注', memo: '备注', description: '描述', createuser: '创建人', createtime: '创建时间', updateuser: '修改人', updatetime: '修改时间', project_id: '项目ID', project_name: '项目名称'
  }
  const lower = name.toLowerCase()
  if (map[lower]) return map[lower]
  return name.replace(/_/g, ' ')
}

function addDefaultFields() {
  addFields([
    { enname: 'row_id', cnname: '唯一值', DataTypeName: '字符串型', DataLen: '32', IsPKey: 1, IsNill: 0, IsUQ: 1 },
    { enname: 'createuser', cnname: '创建人', DataTypeName: '字符串型', DataLen: '100' },
    { enname: 'createtime', cnname: '创建时间', DataTypeName: '日期型', DataLen: '' },
    { enname: 'updateuser', cnname: '修改人', DataTypeName: '字符串型', DataLen: '100' },
    { enname: 'updatetime', cnname: '修改时间', DataTypeName: '日期型', DataLen: '' },
    { enname: 'lingma_sys_is_delete', cnname: '是否删除', DataTypeName: '整数型', DataLen: '1', DefaultValue: '0' }
  ])
  ElMessage.success('已加入默认字段，重复字段会自动改名')
}

function applyTemplate(command: string | number | object) {
  const key = String(command)
  const templates: Record<string, Partial<FieldRecord>[]> = {
    project: [
      { enname: 'project_name', cnname: '项目名称' },
      { enname: 'project_code', cnname: '项目编码' },
      { enname: 'project_status', cnname: '项目状态' },
      { enname: 'owner_user', cnname: '负责人' },
      { enname: 'start_date', cnname: '开始日期', DataTypeName: '日期型', DataLen: '' },
      { enname: 'end_date', cnname: '结束日期', DataTypeName: '日期型', DataLen: '' }
    ],
    dict: [
      { enname: 'dict_type', cnname: '字典类型' },
      { enname: 'dict_code', cnname: '字典编码' },
      { enname: 'dict_label', cnname: '字典标签' },
      { enname: 'dict_value', cnname: '字典值' },
      { enname: 'sort_no', cnname: '排序号', DataTypeName: '整数型', DataLen: '11' }
    ],
    tree: [
      { enname: 'parent_id', cnname: '父级ID', DataLen: '32' },
      { enname: 'node_name', cnname: '节点名称' },
      { enname: 'node_path', cnname: '节点路径', DataTypeName: '文本型', DataLen: '' },
      { enname: 'sort_no', cnname: '排序号', DataTypeName: '整数型', DataLen: '11' }
    ],
    log: [
      { enname: 'biz_id', cnname: '业务ID', DataLen: '32' },
      { enname: 'operate_type', cnname: '操作类型' },
      { enname: 'operate_content', cnname: '操作内容', DataTypeName: '文本型', DataLen: '' },
      { enname: 'operate_time', cnname: '操作时间', DataTypeName: '日期型', DataLen: '' },
      { enname: 'operator_name', cnname: '操作人' }
    ]
  }
  addFields(templates[key] || [])
  ElMessage.success('模板字段已加入')
}

function openBatchPaste() {
  batchDialog.text = ''
  batchDialog.visible = true
}

function submitBatchPaste() {
  const fields = batchDialog.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.includes('\t') ? line.split('\t') : line.split(/[,，\s]+/)
    return normalizeField({
      enname: parts[0] || '',
      cnname: parts[1] || smartDescription(parts[0] || ''),
      DataTypeName: parts[2] || '字符串型',
      DataLen: parts[3] ?? '100'
    })
  }).filter((row) => row.enname)
  if (!fields.length) return ElMessage.warning('没有识别到有效字段')
  addFields(fields)
  batchDialog.visible = false
  ElMessage.success('已导入 ' + fields.length + ' 个字段')
}
</script>

<style scoped>
.field-designer { display: grid; grid-template-columns: 240px minmax(0, 1fr) 330px; gap: 12px; min-height: 560px; }
.field-designer__side, .field-designer__main, .field-designer__props { min-width: 0; border: 1px solid #dbe6f3; border-radius: 14px; background: #fff; }
.field-designer__side { display: flex; flex-direction: column; padding: 12px; }
.field-designer__side-head { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
.field-designer__side-head > div { display: flex; justify-content: space-between; align-items: center; color: #132238; }
.field-designer__side-head span { color: #64748b; font-size: 12px; }
.field-designer__quick-actions { display: flex; gap: 8px; margin-bottom: 10px; }
.field-designer__field-list { display: flex; flex-direction: column; gap: 8px; overflow: auto; max-height: 484px; }
.field-designer__field-item { display: flex; justify-content: space-between; gap: 10px; width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; cursor: pointer; text-align: left; transition: all .16s ease; }
.field-designer__field-item.is-active { border-color: #2563eb; background: #eff6ff; box-shadow: 0 8px 18px rgba(37,99,235,.08); }
.field-designer__field-item.has-error { border-color: #fecaca; background: #fff7f7; }
.field-designer__field-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.field-designer__field-main strong, .field-designer__field-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.field-designer__field-main strong { color: #132238; font-size: 13px; }
.field-designer__field-main small { color: #64748b; font-size: 12px; }
.field-designer__field-badges { display: inline-flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.field-designer__field-badges em { padding: 2px 6px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-style: normal; font-size: 10px; font-weight: 700; }
.field-designer__field-badges em.danger { background: #fee2e2; color: #b91c1c; }
.field-designer__main { padding: 12px; }
.field-designer__toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.field-designer__toolbar-left, .field-designer__toolbar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.field-designer__cell-error { margin-top: 4px; color: #dc2626; font-size: 12px; line-height: 1.3; }
.field-designer__props { padding: 12px; overflow: auto; max-height: 560px; }
.field-designer__props-head { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.field-designer__props-head div { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.field-designer__props-head strong, .field-designer__props-head span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.field-designer__props-head strong { color: #132238; }
.field-designer__props-head span { color: #64748b; font-size: 12px; }
.field-designer__props-alert { margin-bottom: 10px; }
.field-designer__props :deep(.el-form-item) { margin-bottom: 12px; }
.field-designer__batch-text { margin-top: 12px; }
@media (max-width: 1280px) { .field-designer { grid-template-columns: 1fr; } .field-designer__props { max-height: none; } .field-designer__field-list { max-height: 260px; } }
</style>
