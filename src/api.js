import { reactive } from 'vue'
import { ElMessage } from 'element-plus'

const TOKEN_KEY = 'twain.token'
export const session = reactive({ token: localStorage.getItem(TOKEN_KEY), user: JSON.parse(localStorage.getItem('twain.user') || 'null'), users: [] })
export const isCoordinator = () => session.user?.role === 'coordinator'

export async function api(path, { method = 'GET', body, quiet = false } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'content-type': 'application/json', ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && path !== '/login') {
    signOut()
    location.hash = '#/login'
  }
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    if (!quiet) ElMessage.error(err.message)
    throw err
  }
  return data
}

export async function signIn(username, password) {
  const { token, user } = await api('/login', { method: 'POST', body: { username, password }, quiet: true })
  session.token = token
  session.user = user
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem('twain.user', JSON.stringify(user))
  await loadUsers()
}

export function signOut() {
  session.token = null
  session.user = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('twain.user')
}

export async function loadUsers() {
  session.users = await api('/users')
}
export const userName = (id) => session.users.find((u) => u.id === id)?.displayName || (id ? id : '')

export const listRecords = (object, query = {}) => api(`/o/${object}?${new URLSearchParams(query)}`)
export const getRecord = (id) => api(`/r/${id}`)
export const createRecord = (object, data) => api(`/o/${object}`, { method: 'POST', body: data })
export const updateRecord = (id, data) => api(`/r/${id}`, { method: 'PATCH', body: data })
export const runAction = (name, body) => api(`/actions/${name}`, { method: 'POST', body })

// Bumped after any write so open lists and pages can refresh.
export const bus = reactive({ version: 0 })
export const changed = () => bus.version++
