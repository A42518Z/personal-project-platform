<template>
  <div class="relation-designer">
    <section class="relation-designer__hero">
      <div>
        <span class="relation-designer__eyebrow">表关系设计器</span>
        <h2>{{ currentTableName || '当前表' }}</h2>
        <p>基于 _base_tbllist、base_tblfield、base_tblrln，支持拖拽表节点、画线新建关系、在线配置字段关联。</p>
      </div>
      <div class="relation-designer__stats">
        <article><span>表节点</span><strong>{{ graphData.nodes.length }}</strong></article>
        <article><span>关系连线</span><strong>{{ graphData.edges.length }}</strong></article>
        <article><span>当前表</span><strong>{{ currentTableName || '-' }}</strong></article>
      </div>
    </section>

    <div class="relation-designer__body">
      <aside class="relation-designer__settings">
        <div class="relation-designer__settings-title">
          <span>图谱设置</span>
          <el-button size="small" type="primary" plain @click="applyForceLayout(true)">稳定布局</el-button>
        </div>

        <el-collapse v-model="settingsOpen">
          <el-collapse-item title="外观" name="appearance">
            <div class="relation-designer__setting-row">
              <span>箭头</span>
              <el-switch v-model="graphSettings.showArrow" @change="persistAndRefreshGraphStyle" />
            </div>
            <div class="relation-designer__setting-row">
              <span>关系文字</span>
              <el-switch v-model="graphSettings.showEdgeLabel" @change="persistAndRefreshGraphStyle" />
            </div>
            <div class="relation-designer__setting-row">
              <span>连线避让节点</span>
              <el-switch v-model="graphSettings.avoidNodes" @change="persistAndRefreshGraphStyle" />
            </div>
            <div class="relation-designer__setting-block">
              <label>文本透明度</label>
              <el-slider v-model="graphSettings.textOpacity" :min="0" :max="1" :step="0.05" @input="persistAndRefreshGraphStyle" />
            </div>
            <div class="relation-designer__setting-block">
              <label>节点大小</label>
              <el-slider v-model="graphSettings.nodeSize" :min="0.7" :max="1.6" :step="0.05" @input="persistAndRefreshGraphStyle" />
            </div>
            <div class="relation-designer__setting-block">
              <label>连线粗细</label>
              <el-slider v-model="graphSettings.edgeWidth" :min="0.8" :max="4" :step="0.1" @input="persistAndRefreshGraphStyle" />
            </div>
          </el-collapse-item>
          <el-collapse-item title="力度" name="force">
            <div class="relation-designer__setting-block">
              <label>图谱向心力</label>
              <el-slider v-model="graphSettings.centerGravity" :min="0" :max="1" :step="0.05" @input="persistGraphSettings" />
            </div>
            <div class="relation-designer__setting-block">
              <label>节点间的排斥力</label>
              <el-slider v-model="graphSettings.nodeRepulsion" :min="2000" :max="40000" :step="500" @input="persistGraphSettings" />
            </div>
            <div class="relation-designer__setting-block">
              <label>相连节点间的吸引力</label>
              <el-slider v-model="graphSettings.linkAttraction" :min="0.01" :max="0.4" :step="0.01" @input="persistGraphSettings" />
            </div>
            <div class="relation-designer__setting-block">
              <label>连线长度</label>
              <el-slider v-model="graphSettings.linkLength" :min="120" :max="520" :step="10" @input="persistGraphSettings" />
            </div>
            <div class="relation-designer__force-preview">
              <div><span>向心</span><strong>{{ Number(graphSettings.centerGravity).toFixed(2) }}</strong></div>
              <div><span>排斥</span><strong>{{ graphSettings.nodeRepulsion }}</strong></div>
              <div><span>吸引</span><strong>{{ Number(graphSettings.linkAttraction).toFixed(2) }}</strong></div>
              <div><span>线长</span><strong>{{ graphSettings.linkLength }}</strong></div>
            </div>
            <div class="relation-designer__settings-actions">
              <el-button type="primary" @click="applyForceLayout(true)">应用布局</el-button>
              <el-button @click="resetGraphSettings">重置</el-button>
            </div>
          </el-collapse-item>
        </el-collapse>
      </aside>

      <div class="relation-designer__canvas-wrap">
        <SchemaGraph
      ref="schemaGraphRef"
      :key="graphRenderKey"
      :initial-data="graphData"
      :node-templates="[]"
      :toolbar-buttons="toolbarButtons"
      :height="height"
      :constrain-node-in-canvas="false"
      :dialog-width="'980px'"
      :on-edge-add="handleEdgeAdd"
      :on-edge-click="handleEdgeClick"
      :on-node-click="handleNodeClick"
      :on-graph-change="handleGraphChange"
    />
      </div>
    </div>

    <el-dialog v-model="tableDialog.visible" title="添加表节点" width="980px" append-to-body destroy-on-close>
      <el-tabs v-model="tableDialog.tab">
        <el-tab-pane label="选择已有表" name="select">
          <el-form :model="tableDialog.search" inline>
            <el-form-item label="关键字"><el-input v-model="tableDialog.search.keyword" clearable placeholder="表名/中文名" @keyup.enter="loadCandidateTables" /></el-form-item>
            <el-form-item><el-button type="primary" :loading="tableDialog.loading" @click="loadCandidateTables">搜索</el-button></el-form-item>
          </el-form>
          <el-table :data="candidateTables" border highlight-current-row height="380" row-key="rowid" @current-change="handleCandidateTableChange">
            <el-table-column prop="tblname" label="表名" min-width="220" show-overflow-tooltip />
            <el-table-column prop="tbldesc" label="中文名" min-width="240" show-overflow-tooltip />
            <el-table-column prop="dbid" label="数据库" min-width="180" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="新建表元数据" name="create">
          <el-alert title="当前只新建表元数据，不执行物理 CREATE TABLE。字段会写入 base_tblfield。" type="info" :closable="false" />
          <el-form :model="tableDialog.createForm" label-width="92px" class="relation-designer__create-form">
            <el-form-item label="表名" required><el-input v-model="tableDialog.createForm.tblname" /></el-form-item>
            <el-form-item label="中文名" required><el-input v-model="tableDialog.createForm.tbldesc" /></el-form-item>
          </el-form>
          <el-table :data="tableDialog.createFields" border height="300">
            <el-table-column label="字段名" min-width="180"><template #default="{ row }"><el-input v-model="row.enname" /></template></el-table-column>
            <el-table-column label="描述" min-width="180"><template #default="{ row }"><el-input v-model="row.cnname" /></template></el-table-column>
            <el-table-column label="类型" width="140"><template #default="{ row }"><el-select v-model="row.DataTypeName"><el-option v-for="item in fieldTypeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></template></el-table-column>
            <el-table-column label="长度" width="100"><template #default="{ row }"><el-input v-model="row.DataLen" /></template></el-table-column>
            <el-table-column label="主键" width="80" align="center"><template #default="{ row }"><el-checkbox v-model="row.IsPKey" :true-label="1" :false-label="0" /></template></el-table-column>
            <el-table-column label="操作" width="80"><template #default="{ $index }"><el-button type="danger" link @click="tableDialog.createFields.splice($index, 1)">删除</el-button></template></el-table-column>
          </el-table>
          <div class="relation-designer__field-actions"><el-button type="primary" plain @click="addCreateField">新增字段</el-button></div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="tableDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="tableDialog.saving" @click="submitTableDialog">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="edgeDialog.visible" :title="edgeDialog.mode === 'add' ? '新建表关系' : '编辑表关系'" width="960px" append-to-body destroy-on-close @closed="handleEdgeDialogClosed">
      <el-form :model="edgeDialog.form" label-width="108px">
        <div class="relation-designer__edge-grid">
          <el-form-item label="主表"><el-input :model-value="edgeDialog.masterTable?.tblname || '-'" readonly /></el-form-item>
          <el-form-item label="从表"><el-input :model-value="edgeDialog.childTable?.tblname || '-'" readonly /></el-form-item>
          <el-form-item label="关系名称"><el-input v-model="edgeDialog.form.rlname" placeholder="保存时可自动生成" /></el-form-item>
          <el-form-item label="操作符">
            <el-select v-model="edgeDialog.form.operator">
              <el-option label="等于" value="equal" />
              <el-option label="不等于" value="notequal" />
              <el-option label="包含" value="contains" />
              <el-option label="开头匹配" value="startswith" />
            </el-select>
          </el-form-item>
          <el-form-item label="主表字段" required>
            <el-select v-model="edgeDialog.form.masterField" filterable clearable placeholder="请选择主表字段">
              <el-option v-for="field in edgeDialog.masterFields" :key="fieldKey(field)" :label="fieldLabel(field)" :value="field.enname || ''" />
            </el-select>
          </el-form-item>
          <el-form-item label="从表字段" required>
            <el-select v-model="edgeDialog.form.childField" filterable clearable placeholder="请选择从表字段">
              <el-option v-for="field in edgeDialog.childFields" :key="fieldKey(field)" :label="fieldLabel(field)" :value="field.enname || ''" />
            </el-select>
          </el-form-item>
          <el-form-item label="级联删除"><el-switch v-model="edgeDialog.form.cascade" /></el-form-item>
          <el-form-item label="备注"><el-input v-model="edgeDialog.form.memo" type="textarea" :rows="3" /></el-form-item>
        </div>
      </el-form>
      <div class="relation-designer__relation-preview">
        <span>连线文字</span>
        <strong>{{ relationPreviewText }}</strong>
      </div>
      <template #footer>
        <el-button v-if="edgeDialog.mode === 'edit'" type="danger" :loading="edgeDialog.saving" @click="deleteCurrentRelation">删除关系</el-button>
        <el-button @click="cancelEdgeDialog">取消</el-button>
        <el-button type="primary" :loading="edgeDialog.saving" @click="submitEdgeDialog">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="nodeDrawer.visible" title="表节点" size="520px" append-to-body>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="表名">{{ nodeDrawer.table?.tblname || '-' }}</el-descriptions-item>
        <el-descriptions-item label="中文名">{{ nodeDrawer.table?.tbldesc || '-' }}</el-descriptions-item>
        <el-descriptions-item label="表ID">{{ rowIdOf(nodeDrawer.table || {}) || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="nodeDrawer.fields" border height="420" style="margin-top: 16px">
        <el-table-column prop="enname" label="字段名" min-width="160" show-overflow-tooltip />
        <el-table-column prop="cnname" label="描述" min-width="160" show-overflow-tooltip />
        <el-table-column prop="DataTypeName" label="类型" width="120" show-overflow-tooltip />
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DocumentChecked, Plus } from '@element-plus/icons-vue'
import SchemaGraph from '@/components/SchemaGraph/index.vue'
import type { SchemaGraphData, SchemaGraphEdgeAddPayload, SchemaGraphEdgeAddResult, SchemaGraphExpose, SchemaGraphToolbarButton } from '@/components/SchemaGraph/types'
import { copyTableMeta, deleteTableRelationMeta, fieldTypeOptions, newGuid, queryFields, queryTableRelations, queryTables, rowIdOf, saveFields, saveTableMeta, saveTableRelationMeta, type FieldRecord, type TableRecord, type TableRelationRecord } from '@/api/tableAndView'
import type { AnyRow } from '@/api/lowcode'

const props = withDefaults(defineProps<{
  table: TableRecord | null
  height?: string
}>(), {
  height: '640px'
})

const schemaGraphRef = ref<SchemaGraphExpose | null>(null)
const graphData = ref<SchemaGraphData>({ nodes: [], edges: [] })
const graphRenderKey = ref(0)
const allTables = ref<TableRecord[]>([])
const allRelations = ref<TableRelationRecord[]>([])
const currentTableName = computed(() => String(props.table?.tblname || ''))
let pendingEdgeResolver: ((value: SchemaGraphEdgeAddResult | boolean | void) => void) | null = null

const settingsOpen = ref(['appearance', 'force'])
const defaultGraphSettings = {
  showArrow: true,
  textOpacity: 0.9,
  nodeSize: 1,
  edgeWidth: 1.5,
  showEdgeLabel: true,
  avoidNodes: true,
  centerGravity: 0.2,
  nodeRepulsion: 14000,
  linkAttraction: 0.12,
  linkLength: 260
}
const GRAPH_SETTING_STORAGE_KEY = 'projecthub_table_relation_graph_settings'
const GRAPH_LAYOUT_STORAGE_PREFIX = 'projecthub_table_relation_graph_layout:'
const graphSettings = reactive({ ...defaultGraphSettings })

function safeNumber(value: unknown, fallback: number) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function loadGraphSettings() {
  try {
    const raw = window.localStorage.getItem(GRAPH_SETTING_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    graphSettings.showArrow = Boolean(parsed.showArrow ?? defaultGraphSettings.showArrow)
    graphSettings.textOpacity = safeNumber(parsed.textOpacity, defaultGraphSettings.textOpacity)
    graphSettings.nodeSize = safeNumber(parsed.nodeSize, defaultGraphSettings.nodeSize)
    graphSettings.edgeWidth = safeNumber(parsed.edgeWidth, defaultGraphSettings.edgeWidth)
    graphSettings.showEdgeLabel = Boolean(parsed.showEdgeLabel ?? defaultGraphSettings.showEdgeLabel)
    graphSettings.avoidNodes = Boolean(parsed.avoidNodes ?? defaultGraphSettings.avoidNodes)
    graphSettings.centerGravity = safeNumber(parsed.centerGravity, defaultGraphSettings.centerGravity)
    graphSettings.nodeRepulsion = safeNumber(parsed.nodeRepulsion, defaultGraphSettings.nodeRepulsion)
    graphSettings.linkAttraction = safeNumber(parsed.linkAttraction, defaultGraphSettings.linkAttraction)
    graphSettings.linkLength = safeNumber(parsed.linkLength, defaultGraphSettings.linkLength)
  } catch {
    // ignore invalid local setting
  }
}

function persistGraphSettings() {
  window.localStorage.setItem(GRAPH_SETTING_STORAGE_KEY, JSON.stringify(graphSettings))
}

function getGraphLayoutStorageKey(table: TableRecord | null = props.table) {
  const id = getTableId(table) || String(table?.tblname || currentTableName.value || 'default')
  return GRAPH_LAYOUT_STORAGE_PREFIX + id
}

function persistGraphLayout(data: SchemaGraphData = schemaGraphRef.value?.saveGraph() || graphData.value) {
  const key = getGraphLayoutStorageKey()
  const snapshot = normalizeGraphForRender(applyGraphAppearance(data))
  window.localStorage.setItem(key, JSON.stringify({
    savedAt: Date.now(),
    graphData: snapshot
  }))
}

function readGraphLayout() {
  try {
    const raw = window.localStorage.getItem(getGraphLayoutStorageKey())
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const graph = parsed?.graphData
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return null
    return graph as SchemaGraphData
  } catch {
    return null
  }
}

function mergeSavedGraphLayout(base: SchemaGraphData, saved: SchemaGraphData | null) {
  if (!saved) return null
  const baseNodeIds = new Set((base.nodes || []).map((node) => String(node.id || '')))
  const baseEdgeIds = new Set((base.edges || []).map((edge) => String(edge.id || '')))
  const savedNodeMap = new Map((saved.nodes || []).map((node) => [String(node.id || ''), node]))
  const savedEdgeMap = new Map((saved.edges || []).map((edge) => [String(edge.id || ''), edge]))
  const hasSameNodes = Array.from(baseNodeIds).every((id) => savedNodeMap.has(id))
  if (!hasSameNodes) return null
  return normalizeGraphForRender(applyGraphAppearance({
    ...base,
    nodes: (base.nodes || []).map((node) => {
      const savedNode = savedNodeMap.get(String(node.id || ''))
      return savedNode ? {
        ...node,
        x: savedNode.x,
        y: savedNode.y,
        text: { ...(node.text || {}), x: savedNode.x, y: savedNode.y }
      } : node
    }),
    edges: (base.edges || []).map((edge) => {
      const savedEdge = savedEdgeMap.get(String(edge.id || ''))
      return savedEdge && baseEdgeIds.has(String(savedEdge.id || ''))
        ? { ...edge, properties: { ...(edge.properties || {}), ...(savedEdge.properties || {}) } }
        : edge
    })
  }))
}

const tableDialog = reactive({
  visible: false,
  tab: 'select' as 'select' | 'create',
  loading: false,
  saving: false,
  selected: null as TableRecord | null,
  search: { keyword: '' },
  createForm: { tblname: '', tbldesc: '' },
  createFields: [] as FieldRecord[]
})

const edgeDialog = reactive({
  visible: false,
  saving: false,
  mode: 'add' as 'add' | 'edit',
  edgeId: '',
  masterTable: null as TableRecord | null,
  childTable: null as TableRecord | null,
  masterFields: [] as FieldRecord[],
  childFields: [] as FieldRecord[],
  form: {
    row_id: '',
    rlname: '',
    masterField: '',
    childField: '',
    operator: 'equal',
    cascade: false,
    memo: ''
  }
})

const nodeDrawer = reactive({
  visible: false,
  table: null as TableRecord | null,
  fields: [] as FieldRecord[]
})

const toolbarButtons: SchemaGraphToolbarButton[] = [
  { key: 'add-node', label: '新增节点', action: 'addNode', visible: false },
  { key: 'add-table-node', label: '添加表', icon: Plus, action: 'custom', buttonType: 'primary', order: 14, onClick: openTableDialog },
  { key: 'save', label: '保存布局', icon: DocumentChecked, action: 'save', buttonType: 'primary', order: 100, onClick: ({ result }) => {
    if (result) graphData.value = normalizeGraphForRender(applyGraphAppearance(result))
    persistGraphSettings()
    persistGraphLayout(graphData.value)
    ElMessage.success('布局和图谱参数已保存到本地')
  } }
]

const candidateTables = computed(() => {
  const keyword = tableDialog.search.keyword.trim().toLowerCase()
  const usedIds = new Set((graphData.value.nodes || []).map((node) => String(node.id || '')))
  return allTables.value.filter((item) => {
    if (usedIds.has(rowIdOf(item))) return false
    if (!keyword) return true
    return String(item.tblname || '').toLowerCase().includes(keyword) || String(item.tbldesc || '').toLowerCase().includes(keyword)
  })
})

const relationPreviewText = computed(() => {
  const master = edgeDialog.form.masterField || '主表字段'
  const child = edgeDialog.form.childField || '从表字段'
  return child + ' ' + operatorText(edgeDialog.form.operator) + ' ' + master
})

function operatorText(operator: string) {
  const map: Record<string, string> = { equal: '=', notequal: '≠', contains: '包含', startswith: '开头匹配' }
  return map[operator] || operator || '='
}

function fieldKey(field: FieldRecord) {
  return String(field.row_id || field.rowid || field.enname || Math.random())
}

function fieldLabel(field: FieldRecord) {
  const name = String(field.enname || '')
  const desc = String(field.cnname || '')
  return desc ? desc + '（' + name + '）' : name
}

function getTableId(table: TableRecord | null | undefined) {
  return rowIdOf(table || {}) || String(table?.tblname || '')
}

function findTableByNodeId(id: string) {
  const text = String(id || '').trim()
  return allTables.value.find((item) => rowIdOf(item) === text || String(item.tblname || '') === text) || null
}

function findTableByNameOrId(id: string, name?: string) {
  const text = String(id || '').trim()
  const tableName = String(name || '').trim()
  return allTables.value.find((item) => rowIdOf(item) === text || String(item.tblname || '') === text || String(item.tblname || '') === tableName) || null
}

function normalizeRelationExp(value: unknown): any {
  if (!value) return null
  if (typeof value === 'object') return value
  try { return JSON.parse(String(value || '')) } catch { return null }
}

function flattenRelationFilters(exp: any): any[] {
  if (!exp) return []
  if (Array.isArray(exp)) return exp.flatMap(flattenRelationFilters)
  if (String(exp.Type || exp.type || '').toLowerCase() === 'cond') return [exp]
  const filters = exp.Filters || exp.filters || []
  return Array.isArray(filters) ? filters.flatMap(flattenRelationFilters) : []
}

function shortFieldName(value: unknown) {
  const text = String(value || '').trim()
  const parts = text.split('.')
  return parts[parts.length - 1] || text
}

function extractFieldPair(row: TableRelationRecord) {
  const filters = flattenRelationFilters(normalizeRelationExp(row.RelshipExp))
  const first = filters[0]
  if (!first) return { childField: '', masterField: '', operator: 'equal' }
  return {
    childField: shortFieldName(first.Field || first.field),
    masterField: shortFieldName(first.ValueFun?.Field || first.valueFun?.Field || first.ValueFun?.field || first.valueFun?.field),
    operator: String(first.Operator || first.operator || 'equal')
  }
}

function relationLabel(row: TableRelationRecord) {
  const pair = extractFieldPair(row)
  if (pair.childField || pair.masterField) return (pair.childField || '从表字段') + ' ' + operatorText(pair.operator) + ' ' + (pair.masterField || '主表字段')
  return String(row.rlname || row.memo || row.description || '字段关系未配置')
}

function buildRelationExp(master: TableRecord, child: TableRecord) {
  return JSON.stringify({
    Type: 'and',
    Filters: [{
      Type: 'cond',
      Field: String(child.tblname || '') + '.' + edgeDialog.form.childField,
      Value: null,
      Operator: edgeDialog.form.operator,
      ValueFun: {
        Type: 'GetTableField',
        Field: String(master.tblname || '') + '.' + edgeDialog.form.masterField
      }
    }]
  })
}

function buildNodePalette(isCurrent: boolean) {
  return isCurrent
    ? { borderColor: '#86efac', headerBackground: '#f0fdf4', headerTextColor: '#166534', accentColor: '#22c55e' }
    : { borderColor: '#bfdbfe', headerBackground: '#eff6ff', headerTextColor: '#1d4ed8', accentColor: '#2563eb' }
}

function buildGraphNode(table: TableRecord, index: number) {
  const id = getTableId(table) || 'table-' + index
  const isCurrent = id === getTableId(props.table) || String(table.tblname || '') === currentTableName.value
  return {
    id,
    type: 'data-model-node',
    x: isCurrent ? 440 : 160 + (index % 3) * 300,
    y: isCurrent ? 260 : 160 + Math.floor(index / 3) * 180,
    width: Math.round(232 * graphSettings.nodeSize),
    height: Math.round(120 * graphSettings.nodeSize),
    label: String(table.tblname || id),
    text: { value: String(table.tblname || id) },
    properties: {
      tableId: rowIdOf(table),
      tableName: table.tblname,
      tableDesc: table.tbldesc,
      nodeTitle: table.tblname || id,
      nodeCaption: table.tbldesc || (isCurrent ? '当前表' : '关联表'),
      nodeTypeLabel: '数据库表',
      width: Math.round(232 * graphSettings.nodeSize),
      height: Math.round(120 * graphSettings.nodeSize),
      nodeStatusLabel: isCurrent ? '当前表' : '关系表',
      nodePalette: buildNodePalette(isCurrent)
    }
  }
}

function edgeStyleProperties(extra: Record<string, unknown> = {}) {
  const previousStyle = (extra.style && typeof extra.style === 'object') ? extra.style as Record<string, unknown> : {}
  const rawLabel = String((extra as AnyRow).edgeLabel || '')
  return {
    ...extra,
    submitType: graphSettings.showArrow ? 'oneToMany' : 'oneToOne',
    avoidNodes: graphSettings.avoidNodes,
    renderInlineLabel: true,
    showLabel: graphSettings.showEdgeLabel,
    edgeLabel: graphSettings.showEdgeLabel ? rawLabel : '',
    rawEdgeLabel: rawLabel,
    style: {
      ...previousStyle,
      strokeWidth: graphSettings.edgeWidth,
      opacity: graphSettings.textOpacity
    }
  }
}

function resetGraphEdgeGeometry(edge: AnyRow) {
  const { points, pointsList, startPoint, endPoint, path, text, ...rest } = edge
  const rawLabel = String(edge.properties?.rawEdgeLabel || edge.properties?.edgeLabel || edge.label || edge.text?.value || '')
  const label = graphSettings.showEdgeLabel ? rawLabel : ''
  return {
    ...rest,
    label,
    text: label ? { value: label } : undefined,
    properties: edgeStyleProperties({ ...(edge.properties || {}), edgeLabel: rawLabel })
  }
}

function normalizeGraphForRender(data: SchemaGraphData): SchemaGraphData {
  return {
    ...data,
    autoGenerated: false,
    edges: (data.edges || []).map((edge) => resetGraphEdgeGeometry(edge as AnyRow) as any)
  }
}

function applyGraphAppearance(data: SchemaGraphData): SchemaGraphData {
  return {
    ...data,
    nodes: (data.nodes || []).map((node) => ({
      ...node,
      width: Math.round(232 * graphSettings.nodeSize),
      height: Math.round(120 * graphSettings.nodeSize),
      properties: {
        ...(node.properties || {}),
        width: Math.round(232 * graphSettings.nodeSize),
        height: Math.round(120 * graphSettings.nodeSize),
        nodePalette: buildNodePalette(Boolean((node.properties as AnyRow)?.nodeStatusLabel === '当前表'))
      }
    })),
    edges: (data.edges || []).map((edge) => ({
      ...edge,
      properties: edgeStyleProperties(edge.properties || {})
    }))
  }
}

function refreshGraphStyle() {
  const current = schemaGraphRef.value?.saveGraph() || graphData.value
  graphData.value = normalizeGraphForRender(applyGraphAppearance(current))
  schemaGraphRef.value?.loadGraph(graphData.value)
  persistGraphLayout(graphData.value)
}

function persistAndRefreshGraphStyle() {
  persistGraphSettings()
  refreshGraphStyle()
}

function resetGraphSettings() {
  Object.assign(graphSettings, defaultGraphSettings)
  persistGraphSettings()
  applyForceLayout(true)
}

function buildGraphEdge(row: TableRelationRecord, index: number) {
  const master = findTableByNameOrId(String(row.pktbid || ''), row.pktable)
  const child = findTableByNameOrId(String(row.fktbid || ''), row.fktable)
  const sourceNodeId = master ? getTableId(master) : String(row.pktbid || row.pktable || '')
  const targetNodeId = child ? getTableId(child) : String(row.fktbid || row.fktable || '')
  return {
    id: String(row.row_id || 'relation-' + index),
    type: 'flow-polyline',
    sourceNodeId,
    targetNodeId,
    label: graphSettings.showEdgeLabel ? relationLabel(row) : '',
    text: graphSettings.showEdgeLabel ? { value: relationLabel(row) } : undefined,
    properties: {
      relationId: row.row_id,
      pktable: row.pktable,
      fktable: row.fktable,
      ...edgeStyleProperties({
        relationId: row.row_id,
        pktable: row.pktable,
        fktable: row.fktable,
        RelshipExp: row.RelshipExp,
        edgeLabel: relationLabel(row)
      })
    }
  }
}

function getGraphCenter() {
  return { x: 620, y: 340 }
}

function getCurrentTableNodeId() {
  return getTableId(props.table) || currentTableName.value
}

function buildTopologySeedLayout(data: SchemaGraphData): SchemaGraphData {
  const center = getGraphCenter()
  const currentId = getCurrentTableNodeId()
  const nodes = (data.nodes || []).map((node) => ({ ...node }))
  const nodeMap = new Map(nodes.map((node) => [String(node.id), node]))
  const incoming = new Set<string>()
  const outgoing = new Set<string>()
  const others = new Set<string>()

  ;(data.edges || []).forEach((edge) => {
    const source = String(edge.sourceNodeId || '')
    const target = String(edge.targetNodeId || '')
    if (target === currentId && source) incoming.add(source)
    else if (source === currentId && target) outgoing.add(target)
    else {
      if (source && source !== currentId) others.add(source)
      if (target && target !== currentId) others.add(target)
    }
  })

  const placeVertical = (ids: string[], x: number) => {
    const gap = Math.max(150, Math.min(260, graphSettings.linkLength * 0.78))
    const startY = center.y - ((ids.length - 1) * gap) / 2
    ids.forEach((id, index) => {
      const node = nodeMap.get(id)
      if (!node) return
      node.x = Math.round(x)
      node.y = Math.round(startY + index * gap)
      node.text = { ...(node.text || {}), x: node.x, y: node.y }
    })
  }

  const current = nodeMap.get(currentId)
  if (current) {
    current.x = center.x
    current.y = center.y
    current.text = { ...(current.text || {}), x: current.x, y: current.y }
  }

  const incomingIds = Array.from(incoming).filter((id) => nodeMap.has(id))
  const outgoingIds = Array.from(outgoing).filter((id) => nodeMap.has(id))
  const otherIds = Array.from(others).filter((id) => nodeMap.has(id) && !incoming.has(id) && !outgoing.has(id))
  const horizontal = Math.max(280, graphSettings.linkLength * 1.35)
  placeVertical(incomingIds, center.x - horizontal)
  placeVertical(outgoingIds, center.x + horizontal)

  const radius = Math.max(horizontal * 1.18, 360)
  otherIds.forEach((id, index) => {
    const node = nodeMap.get(id)
    if (!node) return
    const angle = (Math.PI * 2 * index) / Math.max(otherIds.length, 1) + Math.PI / 4
    node.x = Math.round(center.x + Math.cos(angle) * radius)
    node.y = Math.round(center.y + Math.sin(angle) * radius)
    node.text = { ...(node.text || {}), x: node.x, y: node.y }
  })

  return { ...data, nodes }
}

function runForceSimulation(data: SchemaGraphData, stabilize = false): SchemaGraphData {
  const seeded = buildTopologySeedLayout(normalizeGraphForRender(data))
  const nodes = (seeded.nodes || []).map((node) => ({
    ...node,
    x: Number(node.x || 0),
    y: Number(node.y || 0),
    vx: 0,
    vy: 0
  })) as Array<any>
  const nodeMap = new Map(nodes.map((node) => [String(node.id), node]))
  const edges = seeded.edges || []
  const center = getGraphCenter()
  const currentId = getCurrentTableNodeId()
  const iterations = stabilize ? 360 : 220
  const damping = 0.78
  const maxStep = stabilize ? 10 : 14
  const minDistance = Math.max(170, 150 * graphSettings.nodeSize)

  for (let step = 0; step < iterations; step += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i]
        const b = nodes[j]
        let dx = a.x - b.x
        let dy = a.y - b.y
        let dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 1) { dx = 1; dy = 0; dist = 1 }
        const tooCloseBoost = dist < minDistance ? (minDistance - dist) * 0.32 : 0
        const force = (graphSettings.nodeRepulsion / Math.max(dist * dist, 1200)) + tooCloseBoost
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }
    }

    edges.forEach((edge: any) => {
      const source = nodeMap.get(String(edge.sourceNodeId || ''))
      const target = nodeMap.get(String(edge.targetNodeId || ''))
      if (!source || !target) return
      const dx = target.x - source.x
      const dy = target.y - source.y
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
      const force = (dist - graphSettings.linkLength) * graphSettings.linkAttraction
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      source.vx += fx
      source.vy += fy
      target.vx -= fx
      target.vy -= fy
    })

    nodes.forEach((node) => {
      const isCurrent = String(node.id) === currentId
      const gravity = isCurrent ? graphSettings.centerGravity * 1.2 : graphSettings.centerGravity
      node.vx += (center.x - node.x) * gravity * 0.012
      node.vy += (center.y - node.y) * gravity * 0.012
      if (isCurrent) {
        node.vx += (center.x - node.x) * 0.08
        node.vy += (center.y - node.y) * 0.08
      }
      node.vx *= damping
      node.vy *= damping
      node.x += Math.max(-maxStep, Math.min(maxStep, node.vx))
      node.y += Math.max(-maxStep, Math.min(maxStep, node.vy))
    })
  }

  return normalizeGraphForRender(applyGraphAppearance({
    ...seeded,
    autoGenerated: false,
    nodes: nodes.map(({ vx, vy, ...node }) => ({
      ...node,
      x: Math.round(node.x),
      y: Math.round(node.y),
      text: { ...(node.text || {}), x: Math.round(node.x), y: Math.round(node.y) }
    }))
  }))
}

function applyForceLayout(showMessage = false) {
  persistGraphSettings()
  const current = schemaGraphRef.value?.saveGraph() || graphData.value
  graphData.value = runForceSimulation(current, true)
  schemaGraphRef.value?.loadGraph(graphData.value)
  if (showMessage) ElMessage.success('已按当前力度参数重新稳定布局')
}

async function loadDesigner() {
  loadGraphSettings()
  if (!props.table) return
  const dbid = String(props.table.dbid || '')
  const tableResult = await queryTables({ databaseId: dbid, pageSize: 1000, pageIndex: 1 })
  allTables.value = mergeTables(tableResult.list as TableRecord[], [props.table])

  const relationResult = await queryTableRelations(props.table, { pageIndex: 1, pageSize: 1000, role: 'all' })
  allRelations.value = relationResult.list

  const relatedTables: TableRecord[] = [props.table]
  allRelations.value.forEach((relation) => {
    const master = findTableByNameOrId(String(relation.pktbid || ''), relation.pktable) || createVirtualTable(relation.pktbid, relation.pktable, relation.pkdbid)
    const child = findTableByNameOrId(String(relation.fktbid || ''), relation.fktable) || createVirtualTable(relation.fktbid, relation.fktable, relation.fkdbid)
    relatedTables.push(master, child)
  })
  allTables.value = mergeTables(allTables.value, relatedTables)
  const nodeTables = mergeTables([], relatedTables)
  const baseGraphData: SchemaGraphData = {
    autoGenerated: false,
    nodes: nodeTables.map(buildGraphNode),
    edges: allRelations.value.map(buildGraphEdge).filter((edge) => edge.sourceNodeId && edge.targetNodeId)
  }
  const savedGraphData = mergeSavedGraphLayout(baseGraphData, readGraphLayout())
  graphData.value = savedGraphData || runForceSimulation(baseGraphData)
  graphRenderKey.value += 1
}

function createVirtualTable(id: unknown, name: unknown, dbid: unknown): TableRecord {
  return { rowid: String(id || name || newGuid()), tblname: String(name || id || '未命名表'), tbldesc: '关系表', dbid: String(dbid || props.table?.dbid || '') }
}

function mergeTables(base: TableRecord[], extra: TableRecord[]) {
  const map = new Map<string, TableRecord>()
  ;[...base, ...extra].forEach((table) => {
    const key = getTableId(table) || String(table.tblname || '')
    if (key && !map.has(key)) map.set(key, table)
  })
  return Array.from(map.values())
}

function handleGraphChange(next: SchemaGraphData) {
  graphData.value = next
}

function handleCandidateTableChange(row: TableRecord | null) {
  tableDialog.selected = row
}

function openTableDialog() {
  tableDialog.visible = true
  tableDialog.tab = 'select'
  tableDialog.selected = null
  if (tableDialog.createFields.length === 0) addCreateField('rowid', '唯一值（ID）', 1)
}

async function loadCandidateTables() {
  tableDialog.loading = true
  try {
    const result = await queryTables({ databaseId: String(props.table?.dbid || ''), pageIndex: 1, pageSize: 1000, keyword: tableDialog.search.keyword })
    allTables.value = mergeTables(allTables.value, result.list as TableRecord[])
  } finally {
    tableDialog.loading = false
  }
}

function addCreateField(name = '', desc = '', pk = 0) {
  tableDialog.createFields.push({ enname: name, cnname: desc, DataTypeName: '字符串型', DataLen: '100', IsPKey: pk, IsNill: pk ? 0 : 1 })
}

async function submitTableDialog() {
  tableDialog.saving = true
  try {
    if (tableDialog.tab === 'select') {
      if (!tableDialog.selected) {
        ElMessage.warning('请先选择表')
        return
      }
      addTableNode(tableDialog.selected)
      tableDialog.visible = false
      return
    }

    const tblname = tableDialog.createForm.tblname.trim()
    const tbldesc = tableDialog.createForm.tbldesc.trim()
    if (!tblname || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(tblname)) throw new Error('表名格式不正确')
    const rowid = newGuid()
    const table: TableRecord = { rowid, tblname, tbldesc, dbid: String(props.table?.dbid || '') }
    await saveTableMeta(table, 'add')
    const fields = tableDialog.createFields.filter((item) => item.enname).map((item) => ({ ...item, tblid: rowid, tblname }))
    if (fields.length) await saveFields(fields)
    allTables.value = mergeTables(allTables.value, [table])
    addTableNode(table)
    tableDialog.visible = false
    tableDialog.createForm.tblname = ''
    tableDialog.createForm.tbldesc = ''
    tableDialog.createFields = []
    addCreateField('rowid', '唯一值（ID）', 1)
    ElMessage.success('表元数据已新增')
  } catch (error: any) {
    ElMessage.error(error?.message || '添加表失败')
  } finally {
    tableDialog.saving = false
  }
}

function addTableNode(table: TableRecord) {
  const current = schemaGraphRef.value?.saveGraph() || graphData.value
  const id = getTableId(table)
  if ((current.nodes || []).some((node) => String(node.id) === id)) {
    ElMessage.warning('该表已在画布中')
    return
  }
  const next: SchemaGraphData = { ...current, autoGenerated: false, nodes: [...(current.nodes || []), buildGraphNode(table, current.nodes.length)], edges: [...(current.edges || [])] }
  graphData.value = runForceSimulation(next)
  schemaGraphRef.value?.loadGraph(graphData.value)
}

async function handleNodeClick(payload: any) {
  const table = findTableByNodeId(payload.current.id)
  if (!table) return
  nodeDrawer.table = table
  nodeDrawer.fields = (await queryFields(rowIdOf(table))).list
  nodeDrawer.visible = true
}

async function handleEdgeClick(payload: any) {
  const edge = payload.current
  const relation = allRelations.value.find((item) => String(item.row_id || '') === String(edge.id || '')) || null
  const master = findTableByNodeId(String(edge.sourceNodeId || ''))
  const child = findTableByNodeId(String(edge.targetNodeId || ''))
  await openEdgeDialog('edit', String(edge.id || ''), master, child, relation)
}

async function handleEdgeAdd(payload: SchemaGraphEdgeAddPayload) {
  const master = findTableByNodeId(String(payload.edge.sourceNodeId || ''))
  const child = findTableByNodeId(String(payload.edge.targetNodeId || ''))
  if (!master || !child) {
    ElMessage.warning('请从一个表节点连到另一个表节点')
    return { cancel: true }
  }
  await openEdgeDialog('add', payload.edge.id, master, child, null)
  return new Promise<SchemaGraphEdgeAddResult | boolean | void>((resolve) => {
    pendingEdgeResolver = resolve
  })
}

async function openEdgeDialog(mode: 'add' | 'edit', edgeId: string, master: TableRecord | null, child: TableRecord | null, relation: TableRelationRecord | null) {
  edgeDialog.mode = mode
  edgeDialog.edgeId = edgeId
  edgeDialog.masterTable = master
  edgeDialog.childTable = child
  edgeDialog.form.row_id = String(relation?.row_id || '')
  const pair = relation ? extractFieldPair(relation) : { masterField: '', childField: '', operator: 'equal' }
  edgeDialog.form.masterField = pair.masterField
  edgeDialog.form.childField = pair.childField
  edgeDialog.form.operator = pair.operator || 'equal'
  edgeDialog.form.rlname = String(relation?.rlname || '')
  edgeDialog.form.cascade = Boolean(Number(relation?.IsCascadeDeletion || 0))
  edgeDialog.form.memo = String(relation?.memo || relation?.description || '')
  edgeDialog.masterFields = master ? (await queryFields(rowIdOf(master))).list : []
  edgeDialog.childFields = child ? (await queryFields(rowIdOf(child))).list : []
  edgeDialog.visible = true
}

function buildRelationPayload(rowId?: string): TableRelationRecord {
  const master = edgeDialog.masterTable as TableRecord
  const child = edgeDialog.childTable as TableRecord
  const relationName = edgeDialog.form.rlname || (edgeDialog.form.childField + '[' + child.tblname + '] ' + operatorText(edgeDialog.form.operator) + ' ' + edgeDialog.form.masterField + '[' + master.tblname + ']')
  return {
    row_id: rowId || edgeDialog.form.row_id || newGuid(),
    rlname: relationName,
    pktable: master.tblname,
    fktable: child.tblname,
    pktbid: rowIdOf(master),
    fktbid: rowIdOf(child),
    pkdbid: master.dbid || props.table?.dbid,
    fkdbid: child.dbid || props.table?.dbid,
    IsCascadeDeletion: edgeDialog.form.cascade ? 1 : 0,
    memo: edgeDialog.form.memo,
    RelshipExp: buildRelationExp(master, child)
  }
}

async function submitEdgeDialog() {
  if (!edgeDialog.masterTable || !edgeDialog.childTable) return
  if (!edgeDialog.form.masterField || !edgeDialog.form.childField) {
    ElMessage.warning('请选择主表字段和从表字段')
    return
  }
  edgeDialog.saving = true
  try {
    const row = buildRelationPayload()
    await saveTableRelationMeta(row, edgeDialog.mode === 'add' || !edgeDialog.form.row_id ? 'add' : 'edit')
    allRelations.value = allRelations.value.filter((item) => String(item.row_id || '') !== String(row.row_id || '')).concat([row])
    const label = relationLabel(row)
    if (pendingEdgeResolver) {
      pendingEdgeResolver({ nextEdgeId: String(row.row_id), label: graphSettings.showEdgeLabel ? label : '', properties: edgeStyleProperties({ relationId: row.row_id, pktable: row.pktable, fktable: row.fktable, RelshipExp: row.RelshipExp, edgeLabel: label }) })
      pendingEdgeResolver = null
    } else if (edgeDialog.edgeId) {
      schemaGraphRef.value?.patchEdge({ edgeId: edgeDialog.edgeId, nextEdgeId: String(row.row_id), label: graphSettings.showEdgeLabel ? label : '', properties: edgeStyleProperties({ relationId: row.row_id, pktable: row.pktable, fktable: row.fktable, RelshipExp: row.RelshipExp, edgeLabel: label }) })
    }
    edgeDialog.visible = false
    ElMessage.success('表关系已保存')
  } catch (error: any) {
    ElMessage.error(error?.message || '保存关系失败')
  } finally {
    edgeDialog.saving = false
  }
}

async function deleteCurrentRelation() {
  if (!edgeDialog.form.row_id) {
    cancelEdgeDialog()
    return
  }
  await ElMessageBox.confirm('确定删除该表关系吗？', '删除确认', { type: 'warning' })
  edgeDialog.saving = true
  try {
    await deleteTableRelationMeta(edgeDialog.form.row_id)
    allRelations.value = allRelations.value.filter((item) => item.row_id !== edgeDialog.form.row_id)
    const current = schemaGraphRef.value?.saveGraph() || graphData.value
    const next = { ...current, edges: (current.edges || []).filter((edge) => edge.id !== edgeDialog.edgeId && edge.id !== edgeDialog.form.row_id) }
    graphData.value = normalizeGraphForRender(next as SchemaGraphData)
    schemaGraphRef.value?.loadGraph(graphData.value)
    edgeDialog.visible = false
    ElMessage.success('关系已删除')
  } finally {
    edgeDialog.saving = false
  }
}

function cancelEdgeDialog() {
  if (pendingEdgeResolver) {
    pendingEdgeResolver({ cancel: true })
    pendingEdgeResolver = null
  }
  edgeDialog.visible = false
}

function handleEdgeDialogClosed() {
  if (pendingEdgeResolver) {
    pendingEdgeResolver({ cancel: true })
    pendingEdgeResolver = null
  }
}

watch(() => props.table, loadDesigner, { deep: true })
onMounted(loadDesigner)
</script>

<style scoped>
.relation-designer { display: flex; flex-direction: column; gap: 14px; }
.relation-designer__hero { display: flex; justify-content: space-between; gap: 16px; padding: 14px 16px; border: 1px solid #dbe6f3; border-radius: 16px; background: linear-gradient(180deg, #fbfdff 0%, #f5f9fd 100%); }
.relation-designer__eyebrow { display: inline-flex; padding: 4px 10px; border-radius: 999px; background: rgba(37, 99, 235, 0.08); color: #2457c5; font-size: 12px; font-weight: 700; }
.relation-designer__hero h2 { margin: 8px 0 4px; font-size: 18px; color: #132238; }
.relation-designer__hero p { margin: 0; color: #607189; font-size: 13px; }
.relation-designer__stats { display: flex; align-items: stretch; gap: 10px; }
.relation-designer__stats article { min-width: 100px; padding: 10px 12px; border: 1px solid #dbe6f3; border-radius: 12px; background: #fff; }
.relation-designer__stats span { display: block; color: #64748b; font-size: 12px; }
.relation-designer__stats strong { display: block; margin-top: 6px; color: #132238; font-size: 20px; }
.relation-designer__body { display: grid; grid-template-columns: 270px minmax(0, 1fr); gap: 14px; align-items: stretch; }
.relation-designer__settings { height: 640px; overflow: auto; box-sizing: border-box; padding: 14px 14px 18px; border: 1px solid #303030; border-radius: 16px; background: #252525; color: #f5f5f5; }
.relation-designer__settings-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; font-weight: 700; }
.relation-designer__settings :deep(.el-collapse) { border: 0; --el-collapse-header-bg-color: transparent; --el-collapse-content-bg-color: transparent; --el-collapse-header-text-color: #e8e8e8; --el-collapse-content-text-color: #e8e8e8; }
.relation-designer__settings :deep(.el-collapse-item__header) { border-bottom-color: #363636; font-weight: 700; }
.relation-designer__settings :deep(.el-collapse-item__wrap) { border-bottom-color: #363636; }
.relation-designer__setting-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 12px 0; font-size: 13px; color: #f2f2f2; }
.relation-designer__setting-block { margin: 14px 0 16px; }
.relation-designer__setting-block label { display: block; margin-bottom: 6px; color: #f2f2f2; font-size: 13px; }
.relation-designer__force-preview { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.relation-designer__force-preview div { padding: 8px 10px; border: 1px solid #3a3a3a; border-radius: 10px; background: #1f1f1f; }
.relation-designer__force-preview span { display: block; color: #a8a8a8; font-size: 12px; }
.relation-designer__force-preview strong { display: block; margin-top: 4px; color: #fff; font-size: 14px; }
.relation-designer__settings-actions { display: flex; gap: 8px; margin-top: 14px; }
.relation-designer__canvas-wrap { min-width: 0; }
.relation-designer__create-form { margin-top: 14px; }
.relation-designer__field-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
.relation-designer__edge-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.relation-designer__edge-grid :deep(.el-form-item:last-child) { grid-column: 1 / -1; }
.relation-designer__relation-preview { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #bfdbfe; border-radius: 12px; background: #eff6ff; color: #1d4ed8; }
.relation-designer__relation-preview span { color: #64748b; }
@media (max-width: 1100px) { .relation-designer__hero, .relation-designer__stats { flex-direction: column; } .relation-designer__body { grid-template-columns: 1fr; } .relation-designer__settings { height: auto; max-height: 420px; } .relation-designer__edge-grid { grid-template-columns: 1fr; } }
</style>
