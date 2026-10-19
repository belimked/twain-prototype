import router from './router.js'
import { openTab } from './workspace.js'

export function openRecord(object, id, label) {
  if (!object || !id) return
  openTab({ object, id, name: label || '…', label })
  router.push(`/r/${object}/${id}`)
}
export const openList = (object, query) => router.push({ path: `/o/${object}`, query })
