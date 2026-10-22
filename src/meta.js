import { OBJECTS, fieldOf, PICKLISTS } from '../shared/objects.js'
import { userName } from './api.js'

export { OBJECTS, fieldOf, PICKLISTS }

const dateFmt = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dtFmt = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })
const numFmt = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 3 })

export function formatValue(field, v, names = {}) {
  if (v === null || v === undefined || v === '') return ''
  switch (field?.type) {
    case 'date': return dateFmt.format(new Date(v + 'T00:00:00'))
    case 'datetime': return dtFmt.format(new Date(v))
    case 'currency': return money.format(v)
    case 'percent': return `${v}%`
    case 'number': return numFmt.format(v)
    case 'checkbox': return v ? 'Yes' : 'No'
    case 'multipicklist': return (v || []).join('; ')
    case 'lookup': return names[v]?.label || names[v]?.name || v
    case 'polylookup': return names[v?.id]?.label || ''
    case 'user': return userName(v)
    case 'json': return JSON.stringify(v)
    default: return String(v)
  }
}

export const STATUS_TONE = {
  Active: 'success', Current: 'success', Completed: 'success', Closed: 'info', Approved: 'success', Received: 'success', 'Awaiting Response': 'warning', 'Queued for Billing': 'success', Compliant: 'success',
  'In Progress': 'primary', Running: 'primary', 'Sample Collected': 'primary', 'Pending Endorsement': 'warning', Pending: 'warning', 'Waiting on someone else': 'warning', 'Awaiting Information': 'warning',
  Scheduled: 'info', New: 'primary', 'Not Started': 'info', Draft: 'info', 'In Plan Assessment': 'warning',
  Suspended: 'warning', Cancelled: 'danger', Rejected: 'danger', Decommissioned: 'info', Inactive: 'info', Ended: 'danger', 'Moved Out': 'info',
  High: 'danger', 'Major non-compliance': 'danger', 'Minor non-compliance': 'warning'
}

export const objectLabel = (key) => OBJECTS[key]?.label || key
export const recordTitle = (rec) => {
  if (!rec) return ''
  const extra = { approval: rec.tradingName, pts: rec.ptsType, case: rec.subject, samplingEvent: rec.eventType, inspection: rec.inspectionType, sampleLocation: rec.description }[rec.object]
  return extra ? `${rec.name} · ${extra}` : rec.name
}

export function toCsv(rows, columns) {
  const esc = (s) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  return [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(c.text(r))).join(','))].join('\n')
}

export function download(name, text, type = 'text/csv') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
