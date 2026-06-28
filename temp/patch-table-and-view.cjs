const fs = require('fs')
const path = require('path')
const file = path.join(process.cwd(), 'src/views/platform/table-and-view.vue')
let s = fs.readFileSync(file, 'utf8')

function mustReplace(pattern, to, label) {
  const next = s.replace(pattern, to)
  if (next === s) throw new Error('Missing segment: ' + label)
  s = next
}

s = s.replace(/<field-editor v-model="fieldRows" \/>/g, '<FieldDesigner v-model="fieldRows" :table-name="String(tableForm.tblname || \'\')" />')
s = s.replace(/<field-editor v-model="fieldRows" @delete-existing="deletedFields\.push\(\$event\)" \/>/g, '<FieldDesigner v-model="fieldRows" :table-name="String(tableForm.tblname || \'\')" @delete-existing="markFieldDeleted" />')

mustReplace(/<el-tab-pane label="关系" name="relation">[\s\S]*?<\/el-tab-pane>\s*<el-tab-pane label="数据流" name="flow">/, `<el-tab-pane label="关系" name="relation">
          <div class="relation-panel relation-panel--designer">
            <TableRelationDesigner v-if="rowIdOf(tableForm)" :table="tableForm" height="640px" />
            <el-empty v-else description="请先保存表元数据后再设计关系" />
          </div>
        </el-tab-pane>
        <el-tab-pane label="数据流" name="flow">`, 'relation tab')

mustReplace(/<template #footer><el-button @click="designDialog\.visible=false">取消<\/el-button><el-button type="primary" :loading="designDialog\.loading" @click="submitDesign">保存<\/el-button><\/template>/, '<template #footer><el-button @click="designDialog.visible=false">取消</el-button><el-button type="primary" :loading="designDialog.loading" @click="requestSubmitDesign">保存</el-button></template>', 'design footer')

mustReplace(/\r?\n\r?\n    <el-dialog v-model="relationDialog\.visible" title="表关系设计"/, `

    <el-dialog v-model="saveSummaryDialog.visible" title="保存前变更摘要" width="760px" append-to-body>
      <div class="change-summary">
        <el-alert v-if="saveSummaryDialog.risks.length" type="warning" :closable="false" title="请确认以下风险" />
        <div v-if="saveSummaryDialog.risks.length" class="change-summary__risks">
          <el-tag v-for="item in saveSummaryDialog.risks" :key="item" type="warning" effect="light">{{ item }}</el-tag>
        </div>
        <div class="change-summary__stats">
          <article><span>新增字段</span><strong>{{ saveSummaryDialog.added.length }}</strong></article>
          <article><span>修改字段</span><strong>{{ saveSummaryDialog.changed.length }}</strong></article>
          <article><span>删除字段</span><strong>{{ saveSummaryDialog.deleted.length }}</strong></article>
        </div>
        <el-tabs model-value="added" class="change-summary__tabs">
          <el-tab-pane label="新增" name="added"><el-table :data="saveSummaryDialog.added" border height="180"><el-table-column prop="enname" label="字段名" /><el-table-column prop="cnname" label="描述" /><el-table-column prop="DataTypeName" label="类型" /></el-table></el-tab-pane>
          <el-tab-pane label="修改" name="changed"><el-table :data="saveSummaryDialog.changed" border height="180"><el-table-column prop="enname" label="字段名" /><el-table-column prop="changeText" label="变化" show-overflow-tooltip /></el-table></el-tab-pane>
          <el-tab-pane label="删除" name="deleted"><el-table :data="saveSummaryDialog.deleted" border height="180"><el-table-column prop="enname" label="字段名" /><el-table-column prop="cnname" label="描述" /><el-table-column prop="DataTypeName" label="类型" /></el-table></el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <el-button @click="saveSummaryDialog.visible=false">返回继续编辑</el-button>
        <el-button type="primary" :loading="designDialog.loading" @click="confirmDesignSummary">确认保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="relationDialog.visible" title="表关系设计"`, 'summary dialog insert')

mustReplace("import TableRelationDesigner from '@/views/platform/table-relation-designer/index.vue'", "import TableRelationDesigner from '@/views/platform/table-relation-designer/index.vue'\r\nimport FieldDesigner from '@/components/FieldDesigner/index.vue'", 'FieldDesigner import')

const start = s.indexOf('const FieldEditor = defineComponent({')
const end = s.indexOf('const ViewEditor = defineComponent({')
if (start === -1 || end === -1 || end <= start) throw new Error('Cannot locate FieldEditor block')
s = s.slice(0, start) + s.slice(end)

mustReplace("const deletedFields = ref<FieldRecord[]>([])\r\nconst relationRows = ref<AnyRow[]>([])", "const deletedFields = ref<FieldRecord[]>([])\r\nconst originalTableSnapshot = ref<AnyRow | null>(null)\r\nconst originalFieldsSnapshot = ref<FieldRecord[]>([])\r\nconst relationRows = ref<AnyRow[]>([])", 'snapshot state')
mustReplace("const designDialog = reactive({ visible: false, loading: false })\r\nconst copyDialog", "const designDialog = reactive({ visible: false, loading: false })\r\nconst saveSummaryDialog = reactive({\r\n  visible: false,\r\n  added: [] as FieldRecord[],\r\n  changed: [] as Array<FieldRecord & { changeText: string }>,\r\n  deleted: [] as FieldRecord[],\r\n  risks: [] as string[]\r\n})\r\nconst copyDialog", 'summary state')

mustReplace("function openAddDialog() { activeTab.value === 'table' ? resetTableForm() : resetViewForm(); fieldRows.value = []; addDialog.visible = true }", "function openAddDialog() { activeTab.value === 'table' ? resetTableForm() : resetViewForm(); fieldRows.value = []; deletedFields.value = []; addDialog.visible = true }", 'openAddDialog')
mustReplace("    resetTableForm(row as TableRecord)\r\n    await loadSelectedFields()\r\n    designTab.value = 'design'", "    resetTableForm(row as TableRecord)\r\n    deletedFields.value = []\r\n    await loadSelectedFields()\r\n    originalTableSnapshot.value = cleanRuntimeRow(tableForm)\r\n    originalFieldsSnapshot.value = fieldRows.value.map(cleanRuntimeRow) as FieldRecord[]\r\n    designTab.value = 'design'", 'openDesign table snapshot')
mustReplace("    resetViewForm(row as ViewRecord)\r\n    fieldRows.value = (await queryFields(rowIdOf(row))).list", "    deletedFields.value = []\r\n    resetViewForm(row as ViewRecord)\r\n    fieldRows.value = (await queryFields(rowIdOf(row))).list\r\n    originalTableSnapshot.value = cleanRuntimeRow(viewForm)\r\n    originalFieldsSnapshot.value = fieldRows.value.map(cleanRuntimeRow) as FieldRecord[]", 'openDesign view snapshot')

mustReplace("try { fieldRows.value = (await queryFields(id)).list } finally { fieldLoading.value = false }", "try { fieldRows.value = (await queryFields(id)).list.sort((a, b) => Number(a.ordIdx || 0) - Number(b.ordIdx || 0)) } finally { fieldLoading.value = false }", 'loadSelectedFields sort')

const helperAnchor = `async function submitDesign() {\r\n`
const helpers = `function cleanRuntimeRow<T extends AnyRow>(row: T): T {\r\n  const next = { ...row }\r\n  delete next.__designerKey\r\n  delete next._rowid\r\n  return next\r\n}\r\n\r\nfunction markFieldDeleted(row: FieldRecord) {\r\n  if (!deletedFields.value.some((item) => rowIdOf(item) === rowIdOf(row))) deletedFields.value.push(row)\r\n}\r\n\r\nfunction summarizeFieldChange(before: FieldRecord, after: FieldRecord) {\r\n  const keys = ['enname', 'cnname', 'DataTypeName', 'DataLen', 'IsPKey', 'IsNill', 'IsUQ', 'isGrowth', 'DefaultValue', 'AsName', 'Memo', 'UseCtrlName', 'allowAIAdd', 'ordIdx']\r\n  return keys.filter((key) => String((before as AnyRow)[key] ?? '') !== String((after as AnyRow)[key] ?? '')).map((key) => key + ': ' + String((before as AnyRow)[key] ?? '-') + ' → ' + String((after as AnyRow)[key] ?? '-')).join('；')\r\n}\r\n\r\nfunction buildDesignChangeSummary() {\r\n  const originalMap = new Map(originalFieldsSnapshot.value.map((row) => [rowIdOf(row), row]))\r\n  const added: FieldRecord[] = []\r\n  const changed: Array<FieldRecord & { changeText: string }> = []\r\n  fieldRows.value.forEach((row) => {\r\n    const id = rowIdOf(row)\r\n    const clean = cleanRuntimeRow(row)\r\n    if (!id) {\r\n      added.push(clean as FieldRecord)\r\n      return\r\n    }\r\n    const before = originalMap.get(id)\r\n    if (!before) return\r\n    const changeText = summarizeFieldChange(before, clean as FieldRecord)\r\n    if (changeText) changed.push({ ...(clean as FieldRecord), changeText })\r\n  })\r\n  const deleted = deletedFields.value.map(cleanRuntimeRow) as FieldRecord[]\r\n  const risks: string[] = []\r\n  if (activeTab.value === 'table' && !fieldRows.value.some((row) => Number(row.IsPKey) === 1)) risks.push('当前表没有主键字段')\r\n  deleted.forEach((row) => {\r\n    if (Number((row as AnyRow).IsSys) === 1) risks.push('将删除系统字段：' + (row.enname || rowIdOf(row)))\r\n    risks.push('删除字段需确认是否被关系/视图/表达式引用：' + (row.enname || rowIdOf(row)))\r\n  })\r\n  saveSummaryDialog.added = added\r\n  saveSummaryDialog.changed = changed\r\n  saveSummaryDialog.deleted = deleted\r\n  saveSummaryDialog.risks = Array.from(new Set(risks))\r\n}\r\n\r\nasync function requestSubmitDesign() {\r\n  try {\r\n    if (activeTab.value === 'table') validateFields()\r\n    buildDesignChangeSummary()\r\n    saveSummaryDialog.visible = true\r\n  } catch (error: any) {\r\n    ElMessage.error(error?.message || '校验失败')\r\n  }\r\n}\r\n\r\nasync function confirmDesignSummary() {\r\n  saveSummaryDialog.visible = false\r\n  await submitDesign()\r\n}\r\n\r\n`
mustReplace(helperAnchor, helpers + helperAnchor, 'submit helpers')

s = s.replace("await saveFields(fieldRows.value.map((item) => ({ ...item, tblid: rowid, tblname: tableForm.tblname })))", "await saveFields(fieldRows.value.map((item) => cleanRuntimeRow({ ...item, tblid: rowid, tblname: tableForm.tblname })))")
s = s.replace("await saveFields(fieldRows.value.map((item) => ({ ...item, tblid: rowIdOf(tableForm), tblname: tableForm.tblname })), deletedFields.value)", "await saveFields(fieldRows.value.map((item) => cleanRuntimeRow({ ...item, tblid: rowIdOf(tableForm), tblname: tableForm.tblname })), deletedFields.value.map(cleanRuntimeRow) as FieldRecord[])")
s = s.replace("if (fieldRows.value.length) await saveFields(fieldRows.value.map((item) => ({ ...item, tblid: rowIdOf(viewForm), tblname: viewForm.vewname })))", "if (fieldRows.value.length) await saveFields(fieldRows.value.map((item) => cleanRuntimeRow({ ...item, tblid: rowIdOf(viewForm), tblname: viewForm.vewname })))")

mustReplace(".relation-panel { min-height: 520px; }", ".relation-panel { min-height: 520px; }\r\n.relation-panel--designer { min-height: 680px; }\r\n.change-summary { display: flex; flex-direction: column; gap: 14px; }\r\n.change-summary__risks { display: flex; gap: 8px; flex-wrap: wrap; }\r\n.change-summary__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }\r\n.change-summary__stats article { padding: 12px; border: 1px solid #dbe6f3; border-radius: 12px; background: #f8fafc; }\r\n.change-summary__stats span { display: block; color: #64748b; font-size: 12px; }\r\n.change-summary__stats strong { display: block; margin-top: 6px; color: #132238; font-size: 24px; }\r\n.change-summary__tabs :deep(.el-tabs__header) { margin-bottom: 8px; }", 'summary styles')

fs.writeFileSync(file, s, 'utf8')
console.log('patched', file)
