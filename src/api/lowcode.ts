import { apiRequest } from './client'

export type AnyRow = Record<string, any>

export interface GetDataOptions {
  dbName?: string
  pageIndex?: number
  pageSize?: number
  primaryKeyFields?: string
  fields?: string[]
  filter?: unknown
}

export interface GetDataResult {
  items: AnyRow[]
  count: number
  raw: any
}

const DEFAULT_DB = 'QYVirtualPlat'

export function buildGetDataBody(tableName: string, options: GetDataOptions = {}) {
  return {
    Table: [
      {
        allowAdd: false,
        DbName: options.dbName || DEFAULT_DB,
        Fields: options.fields || [],
        Filter: options.filter ?? null,
        inputParams: [],
        lmKey: '',
        Name: tableName,
        OutputType: 'Table',
        PrimaryKeyFields: options.primaryKeyFields || 'Id',
        Type: '数据库表',
        ChildTables: [],
        JoinFilter: null,
        JoinType: null
      }
    ],
    PageParam: {
      size: options.pageSize || 20,
      index: options.pageIndex || 1
    }
  }
}

export async function getData(tableName: string, options: GetDataOptions = {}): Promise<GetDataResult> {
  const raw = await apiRequest<any>('/DataOperation/GetData', {
    method: 'POST',
    body: JSON.stringify(buildGetDataBody(tableName, options))
  })
  const data = raw?.Result?.data || raw?.result?.data || raw?.data?.Result?.data || raw?.data?.result?.data || raw?.data
  const items = data?.Items || data?.items || []
  const count = Number(data?.Count ?? data?.count ?? items.length ?? 0)
  return { items, count, raw }
}

export async function batchSave(tableName: string, crudModel: { Added?: AnyRow[]; Changed?: AnyRow[]; Deleted?: AnyRow[] }, dbName = DEFAULT_DB) {
  return apiRequest('/DataOperation/BatchTableOperateRequestByCRUD', {
    method: 'POST',
    body: JSON.stringify([
      {
        TableName: dbName + '@' + tableName,
        CrudModel: crudModel
      }
    ])
  })
}
