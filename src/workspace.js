import { reactive, watch } from 'vue'
import { api, session } from './api.js'

// Workspace tabs, recent records and favourites, persisted per user on the server.
export const ws = reactive({ tabs: [], recent: [], favourites: [], loaded: false })

let saveTimer = null
export async function loadWorkspace() {
  ws.loaded = false
  const v = await api('/prefs/workspace', { quiet: true }).catch(() => null)
  ws.tabs = v?.tabs || []
  ws.recent = v?.recent || []
  ws.favourites = v?.favourites || []
  ws.loaded = true
}
watch(() => [ws.tabs, ws.recent, ws.favourites], () => {
  if (!ws.loaded || !session.token) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => api('/prefs/workspace', { method: 'PUT', body: { tabs: ws.tabs, recent: ws.recent, favourites: ws.favourites }, quiet: true }).catch(() => {}), 600)
}, { deep: true })

export function openTab(rec) {
  const entry = { id: rec.id, object: rec.object, label: rec.label || rec.name }
  const i = ws.tabs.findIndex((t) => t.id === rec.id)
  if (i >= 0) ws.tabs[i] = { ...ws.tabs[i], label: entry.label }
  else ws.tabs.push(entry)
  if (ws.tabs.length > 12) {
    const drop = ws.tabs.findIndex((t) => !t.pinned)
    if (drop >= 0) ws.tabs.splice(drop, 1)
  }
  ws.recent = [entry, ...ws.recent.filter((x) => x.id !== rec.id)].slice(0, 20)
}
export const closeTab = (id) => { ws.tabs = ws.tabs.filter((t) => t.id !== id) }
export const togglePin = (id) => { const t = ws.tabs.find((x) => x.id === id); if (t) t.pinned = !t.pinned }
export const isFavourite = (id) => ws.favourites.some((f) => f.id === id)
export function toggleFavourite(rec) {
  if (isFavourite(rec.id)) ws.favourites = ws.favourites.filter((f) => f.id !== rec.id)
  else ws.favourites.push({ id: rec.id, object: rec.object, label: rec.label || rec.name })
}
