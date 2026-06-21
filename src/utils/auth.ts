export interface StoredUser {
  ROWID?: string
  rowid?: string
  LoginName?: string
  UserName?: string
  ShortName?: string
  EntShortName?: string
  [key: string]: unknown
}

const TOKEN_KEY = 'projecthub_token'
const REFRESH_TOKEN_KEY = 'projecthub_refresh_token'
const USER_KEY = 'projecthub_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || ''
}

export function getUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

export function setAuth(token: string, refreshToken: string, user: StoredUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken || '')
  localStorage.setItem(USER_KEY, JSON.stringify(user || {}))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isLoggedIn() {
  return Boolean(getToken())
}
