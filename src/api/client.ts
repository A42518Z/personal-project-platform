import { getToken } from '@/utils/auth'

export interface ApiEnvelope<T = unknown> {
  Code?: number | string
  code?: number | string
  Type?: string
  type?: string
  Message?: string
  message?: string
  msg?: string
  Result?: T
  result?: T
  data?: T
}

const API_BASE = '/api'

function isSuccessCode(code: unknown) {
  return code === undefined || code === null || code === 200 || code === '200' || code === 0 || code === '0' || code === true || code === 'success' || code === 'ok'
}

export async function apiRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', 'Bearer ' + token)

  const response = await fetch(API_BASE + path, { ...init, headers })
  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }
  if (!response.ok) {
    throw new Error(typeof payload === 'string' ? payload : 'HTTP ' + response.status)
  }
  return payload as T
}

export function unwrapApiResult<T = unknown>(payload: ApiEnvelope<T> | T): T {
  const obj = payload as ApiEnvelope<T>
  const code = obj?.Code ?? obj?.code
  if (!isSuccessCode(code)) {
    throw new Error(obj?.Message || obj?.message || obj?.msg || '接口返回失败')
  }
  if (Object.prototype.hasOwnProperty.call(obj || {}, 'Result')) return obj.Result as T
  if (Object.prototype.hasOwnProperty.call(obj || {}, 'result')) return obj.result as T
  if (Object.prototype.hasOwnProperty.call(obj || {}, 'data')) return obj.data as T
  return payload as T
}
