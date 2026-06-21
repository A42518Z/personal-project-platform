import { batchSave, getData, type AnyRow } from './lowcode'

const tableListFields = ['row_id', 'tblname', 'tbldesc', 'dbid', 'createuser', 'createtime', 'lingma_sys_is_delete', 'status']
const viewListFields = ['row_id', 'vewname', 'vewdesc', 'dbid', 'createuser', 'createtime', 'sql', 'lingma_sys_is_delete']
const fieldListFields = ['row_id', 'tblid', 'tblname', 'enname', 'cnname', 'DataType', 'DataTypeName', 'DataLen', 'IsPKey', 'IsNill', 'IsUQ', 'isGrowth', 'ordIdx', 'lingma_sys_is_delete']
const relationListFields = ['row_id', 'rlname', 'pktable', 'fktable', 'pktbid', 'fktbid', 'pkdbid', 'fkdbid', 'pkdbname', 'fkdbname', 'memo', 'description', 'IsCascadeDeletion', 'RelshipExp', 'lingma_sys_is_delete']

export interface PageQuery {
  pageIndex?: number
  pageSize?: number
}

export interface DbRecord extends AnyRow {
  Id?: string
  id?: string
  Name?: string
  name?: string
  Remark?: string
  description?: string
}

export interface TableRecord extends AnyRow {
  row_id?: string
  rowid?: string
  tblname?: string
  tbldesc?: string
  dbid?: string
  createuser?: string
  createtime?: string
}

export interface ViewRecord extends AnyRow {
  row_id?: string
  rowid?: string
  vewname?: string
  vewdesc?: string
  dbid?: string
  createuser?: string
  createtime?: string
  sql?: string
}

export interface FieldRecord extends AnyRow {
  row_id?: string
  rowid?: string
  tblid?: string
  tblname?: string
  enname?: string
  cnname?: string
  DataTypeName?: string
  DataLen?: string
  IsPKey?: number
  IsNill?: number
  IsUQ?: number
  isGrowth?: number
}

export interface TableRelationRecord extends AnyRow {
  row_id?: string
  rlname?: string
  pktable?: string
  fktable?: string
  pktbid?: string
  fktbid?: string
  pkdbname?: string
  fkdbname?: string
  pkdbid?: string
  fkdbid?: string
  memo?: string
  description?: string
  IsCascadeDeletion?: number
  pkType?: string
  createtime?: string
  createuser?: string
  RelshipExp?: unknown
}

export function newGuid() {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1).toUpperCase()
  return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4()
}

export function cond(field: string, operator: string, value: unknown) {
  return {
    Type: 'cond',
    Field: field,
    Operator: operator,
    ValueFun: {
      Type: 'GetConstValue',
      Value: value
    }
  }
}

export function and(...filters: unknown[]) {
  const normalized = filters.filter(Boolean)
  if (normalized.length === 0) return null
  if (normalized.length === 1) return normalized[0]
  return { Type: 'and', Filters: normalized }
}

export function rowIdOf(row: AnyRow) {
  return String(row.row_id || row.rowid || row.ROWID || row.Id || row.ID || row.id || '')
}

export function dbIdOf(row: DbRecord) {
  return String(row.Id || row.id || row.ROWID || row.rowid || '')
}

export function dbNameOf(row: DbRecord) {
  return String(row.Name || row.name || row.NameStr || row.ValueName || '')
}

export function dbDescOf(row: DbRecord) {
  return String(row.Remark || row.description || row.Description || row.Memo || '')
}

export async function queryDatabases(params: PageQuery & { keyword?: string } = {}) {
  const result = await getData('_base_dbinfo', {
    pageIndex: params.pageIndex || 1,
    pageSize: params.pageSize || 20,
    primaryKeyFields: 'Id'
  })
  const keyword = String(params.keyword || '').toLowerCase()
  const list = keyword
    ? result.items.filter((item) => dbNameOf(item).toLowerCase().includes(keyword) || dbDescOf(item).toLowerCase().includes(keyword))
    : result.items
  return { list: list as DbRecord[], total: keyword ? list.length : result.count }
}

export async function queryTables(params: PageQuery & { databaseId?: string; keyword?: string; cnName?: string; creator?: string } = {}) {
  const filter = params.databaseId ? cond('dbid', 'equal', params.databaseId) : null
  const result = await getData('_base_tbllist', {
    pageIndex: params.pageIndex || 1,
    pageSize: params.pageSize || 20,
    primaryKeyFields: 'row_id',
    fields: tableListFields,
    filter
  })
  return filterObjects(result.items as TableRecord[], result.count, params, 'tblname', 'tbldesc')
}

export async function queryViews(params: PageQuery & { databaseId?: string; keyword?: string; cnName?: string; creator?: string } = {}) {
  const filter = params.databaseId ? cond('dbid', 'equal', params.databaseId) : null
  const result = await getData('_base_viewlist', {
    pageIndex: params.pageIndex || 1,
    pageSize: params.pageSize || 20,
    primaryKeyFields: 'row_id',
    fields: viewListFields,
    filter
  })
  return filterObjects(result.items as ViewRecord[], result.count, params, 'vewname', 'vewdesc')
}

function filterObjects<T extends AnyRow>(items: T[], total: number, params: { keyword?: string; cnName?: string; creator?: string }, nameKey: string, descKey: string) {
  const keyword = String(params.keyword || '').toLowerCase()
  const cnName = String(params.cnName || '').toLowerCase()
  const creator = String(params.creator || '').toLowerCase()
  const hasClientFilter = keyword || cnName || creator
  const list = items.filter((item) => {
    if (keyword && !String(item[nameKey] || '').toLowerCase().includes(keyword)) return false
    if (cnName && !String(item[descKey] || '').toLowerCase().includes(cnName)) return false
    if (creator && !String(item.createuser || '').toLowerCase().includes(creator)) return false
    return true
  })
  return { list, total: hasClientFilter ? list.length : total }
}

export async function queryFields(tblid: string) {
  if (!tblid) return { list: [] as FieldRecord[], total: 0 }
  const result = await getData('base_tblfield', {
    pageIndex: 1,
    pageSize: 500,
    primaryKeyFields: 'row_id',
    fields: fieldListFields,
    filter: cond('tblid', 'equal', tblid)
  })
  return { list: result.items as FieldRecord[], total: result.count }
}

export async function queryDataPreview(tableName: string, primaryKey = 'Id', pageSize = 20) {
  if (!tableName) return { list: [] as AnyRow[], total: 0 }
  const result = await getData(tableName, { pageIndex: 1, pageSize, primaryKeyFields: primaryKey })
  return { list: result.items, total: result.count }
}

export async function queryTableRelations(table: TableRecord, params: PageQuery & { keyword?: string; role?: 'all' | 'master' | 'child' } = {}) {
  const tableId = rowIdOf(table)
  const tableName = String(table.tblname || '').trim().toLowerCase()
  if (!tableId && !tableName) return { list: [] as TableRelationRecord[], total: 0, allCount: 0, masterCount: 0, childCount: 0 }

  const result = await getData('base_tblrln', {
    pageIndex: 1,
    pageSize: 1000,
    primaryKeyFields: 'row_id',
    fields: relationListFields
  })
  const keyword = String(params.keyword || '').trim().toLowerCase()
  const role = params.role || 'all'

  const allMatched = (result.items as TableRelationRecord[]).filter((item) => {
    const pkId = String(item.pktbid || '').trim()
    const fkId = String(item.fktbid || '').trim()
    const pkTable = String(item.pktable || '').trim().toLowerCase()
    const fkTable = String(item.fktable || '').trim().toLowerCase()
    return (tableId && (pkId === tableId || fkId === tableId)) || (tableName && (pkTable === tableName || fkTable === tableName))
  })

  const masterCount = allMatched.filter((item) => {
    const pkId = String(item.pktbid || '').trim()
    const pkTable = String(item.pktable || '').trim().toLowerCase()
    return (tableId && pkId === tableId) || (tableName && pkTable === tableName)
  }).length
  const childCount = allMatched.filter((item) => {
    const fkId = String(item.fktbid || '').trim()
    const fkTable = String(item.fktable || '').trim().toLowerCase()
    return (tableId && fkId === tableId) || (tableName && fkTable === tableName)
  }).length

  const roleFiltered = allMatched.filter((item) => {
    if (role === 'all') return true
    const pkId = String(item.pktbid || '').trim()
    const fkId = String(item.fktbid || '').trim()
    const pkTable = String(item.pktable || '').trim().toLowerCase()
    const fkTable = String(item.fktable || '').trim().toLowerCase()
    if (role === 'master') return (tableId && pkId === tableId) || (tableName && pkTable === tableName)
    return (tableId && fkId === tableId) || (tableName && fkTable === tableName)
  }).filter((item) => {
    if (!keyword) return true
    return [item.rlname, item.pktable, item.fktable, item.memo, item.description, item.pkdbname, item.fkdbname]
      .some((value) => String(value || '').toLowerCase().includes(keyword))
  })

  const pageIndex = params.pageIndex || 1
  const pageSize = params.pageSize || 20
  const start = (pageIndex - 1) * pageSize
  return {
    list: roleFiltered.slice(start, start + pageSize),
    total: roleFiltered.length,
    allCount: allMatched.length,
    masterCount,
    childCount
  }
}

export async function saveTableMeta(row: TableRecord, mode: 'add' | 'edit') {
  const payload = { ...row }
  if (!payload.row_id) payload.row_id = rowIdOf(payload) || newGuid()
  delete (payload as AnyRow).rowid
  return batchSave('_base_tbllist', {
    Added: mode === 'add' ? [payload] : [],
    Changed: mode === 'edit' ? [payload] : [],
    Deleted: []
  })
}

export async function saveViewMeta(row: ViewRecord, mode: 'add' | 'edit') {
  const payload = { ...row }
  if (!payload.row_id) payload.row_id = rowIdOf(payload) || newGuid()
  delete (payload as AnyRow).rowid
  return batchSave('_base_viewlist', {
    Added: mode === 'add' ? [payload] : [],
    Changed: mode === 'edit' ? [payload] : [],
    Deleted: []
  })
}

export async function saveFields(changed: FieldRecord[], deleted: FieldRecord[] = []) {
  const addedRows = changed.filter((item) => !rowIdOf(item)).map((item) => ({ ...item, row_id: newGuid(), rowid: undefined }))
  const changedRows = changed.filter((item) => rowIdOf(item)).map((item) => ({ ...item, row_id: rowIdOf(item), rowid: undefined }))
  const deletedRows = deleted.map((item) => ({ row_id: item.row_id || item.rowid }))
  return batchSave('base_tblfield', { Added: addedRows, Changed: changedRows, Deleted: deletedRows })
}

export async function deleteTableMeta(rowId: string) {
  return batchSave('_base_tbllist', { Added: [], Changed: [], Deleted: [{ row_id: rowId }] })
}

export async function deleteViewMeta(rowId: string) {
  return batchSave('_base_viewlist', { Added: [], Changed: [], Deleted: [{ row_id: rowId }] })
}

export async function saveTableRelationMeta(row: TableRelationRecord, mode: 'add' | 'edit') {
  const payload = { ...row }
  if (!payload.row_id) payload.row_id = newGuid()
  return batchSave('base_tblrln', {
    Added: mode === 'add' ? [payload] : [],
    Changed: mode === 'edit' ? [payload] : [],
    Deleted: []
  })
}

export async function deleteTableRelationMeta(rowId: string) {
  return batchSave('base_tblrln', { Added: [], Changed: [], Deleted: [{ row_id: rowId }] })
}

export async function copyTableMeta(source: TableRecord, fields: FieldRecord[], newTableName: string, newTableDesc: string) {
  const nextRowId = newGuid()
  const tablePayload: TableRecord = {
    ...source,
    row_id: nextRowId,
    tblname: newTableName,
    tbldesc: newTableDesc
  }
  delete (tablePayload as AnyRow).createtime
  delete (tablePayload as AnyRow).updatetime
  const fieldPayloads = fields.map((field) => {
    const next = { ...field, row_id: newGuid(), rowid: undefined, tblid: nextRowId, tblname: newTableName }
    delete (next as AnyRow).createtime
    delete (next as AnyRow).updatetime
    return next
  })
  await batchSave('_base_tbllist', { Added: [tablePayload], Changed: [], Deleted: [] })
  if (fieldPayloads.length) await batchSave('base_tblfield', { Added: fieldPayloads, Changed: [], Deleted: [] })
  return nextRowId
}

export const fieldTypeOptions = [
  { label: '字符串型', value: '字符串型' },
  { label: '整数型', value: '整数型' },
  { label: '浮点型', value: '浮点型' },
  { label: '日期型', value: '日期型' },
  { label: '文本型', value: '文本型' },
  { label: '布尔型', value: '布尔型' }
]
