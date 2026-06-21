import { apiRequest, unwrapApiResult } from './client'
import type { StoredUser } from '@/utils/auth'

export interface LoginPayload {
  username: string
  password: string
  tenantId?: string
}

export interface LoginResult {
  token: string
  refreshToken?: string
  refresh_token?: string
  userinfo?: StoredUser
  userInfo?: StoredUser
  UserInfo?: StoredUser
}

export async function loginApi(payload: LoginPayload) {
  const raw = await apiRequest('/LoginAuthority/UserLoginByEnt', {
    method: 'POST',
    body: JSON.stringify({
      strUser: payload.username,
      strPwd: payload.password,
      entName: payload.tenantId || 'NewApp'
    })
  })
  const result = unwrapApiResult<LoginResult>(raw as any)
  return {
    token: result.token,
    refreshToken: result.refreshToken || result.refresh_token || '',
    user: result.userinfo || result.userInfo || result.UserInfo || {}
  }
}

export async function getUserInfoApi() {
  const raw = await apiRequest('/LoginAuthority/GetUserInfo', { method: 'GET' })
  return unwrapApiResult<{ userInfo?: StoredUser }>(raw as any)
}
