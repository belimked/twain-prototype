import { HTTPException } from 'hono/http-exception'
import { eq, and, inArray, sql, desc } from 'drizzle-orm'
import * as s from './schema.js'
import { OBJECTS, SYSTEM_FIELDS } from '../shared/objects.js'

// D1 allows at most 100 bound parameters per statement.
const MAX_PARAMS = 100
export const nowIso = () => new Date().toISOString()
export const today = () => new Date().toISOString().slice(0, 10)
export const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 18)
export const bad = (message, status = 400) => new HTTPException(status, { message })

export const defOf = (object) => {
  const d = OBJECTS[object]
  if (!d) throw bad(`Unknown object ${object}`, 404)
  return d
}

const SYSTEM_KEYS = new Set(['id', 'object', 'name', 'ownerId', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'])

export function toRecord(row) {
  if (!row) return null
  return { ...row.data, id: row.id, object: row.object, name: row.name, ownerId: row.ownerId, createdAt: row.createdAt, createdBy: row.createdBy, updatedAt: row.updatedAt, updatedBy: row.updatedBy }
}

function coerce(field, v) {
  if (v === '' || v === undefined) return null
  if (v === null) return null
  switch (field.type) {
    case 'number': case 'currency': case 'percent': {
      const n = Number(v)
      if (!Number.isFinite(n)) throw bad(`${field.label} must be a number`)
      return n
    }
    case 'checkbox': return !!v
    case 'multipicklist': {
      const arr = Array.isArray(v) ? v : String(v).split(';').map((x) => x.trim()).filter(Boolean)
      for (const x of arr) if (!field.options.includes(x)) throw bad(`${field.label}: invalid value "${x}"`)
      return arr
    }
    case 'picklist':
      if (!field.options.includes(v)) throw bad(`${field.label}: invalid value "${v}"`)
      return v
    case 'date': {
      const d = String(v).slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw bad(`${field.label} must be a date`)
      return d
    }
    case 'polylookup':
      if (typeof v !== 'object' || !v.id || !OBJECTS[v.object]) throw bad(`${field.label} is invalid`)
      return { object: v.object, id: String(v.id) }
    case 'json': return v
    default: return String(v).slice(0, field.type === 'textarea' ? 32000 : 1000)
  }
}

// Keeps only known fields; `system` lets server code write read-only fields.
export function sanitize(def, input, { system = false } = {}) {
  const out = {}
  for (const field of def.fields) {
    if (!(field.key in input)) continue
    if (field.readonly && !system) continue
    out[field.key] = coerce(field, input[field.key])
  }
  return out
}

export function applyDefaults(def, data) {
  for (const field of def.fields) {
    if (data[field.key] !== undefined && data[field.key] !== null) continue
    if (field.default !== undefined) data[field.key] = field.default
    else if (field.defaultToday) data[field.key] = today()
  }
  return data
}

export function checkRequired(def, data) {
  for (const field of def.fields) {
    if (!field.required) continue
    if (field.showIf && !Object.entries(field.showIf).every(([k, v]) => data[k] === v)) continue
    const v = data[field.key]
    if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) throw bad(`${field.label} is required`)
  }
}

const formatNumber = (def, n) => `${def.prefix}${String(n).padStart(def.digits, '0')}`

async function nextNumber(db, def) {
  const [row] = await db.insert(s.counters).values({ object: def.key, n: def.start })
    .onConflictDoUpdate({ target: s.counters.object, set: { n: sql`${s.counters.n} + 1` } }).returning()
  return formatNumber(def, row.n)
}

export const nameFor = (def, data) => String(data[def.nameFrom] ?? '').slice(0, 300) || '(blank)'

function columnsFor(def, data) {
  return {
    status: data.status ?? null,
    parentId: def.parent ? data[def.parent] ?? null : null,
    approvalId: def.key === 'approval' ? null : data.approvalId ?? null
  }
}

const show = (v) => v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v) : String(v)

export function createStore(db, user, hooks = {}) {
  const store = {
    db, user,

    async get(id) {
      const [row] = await db.select().from(s.records).where(eq(s.records.id, id))
      return toRecord(row)
    },

    async getMany(ids) {
      const uniq = [...new Set(ids.filter(Boolean))]
      const out = []
      for (let i = 0; i < uniq.length; i += MAX_PARAMS) {
        out.push(...(await db.select().from(s.records).where(inArray(s.records.id, uniq.slice(i, i + MAX_PARAMS)))))
      }
      return out.map(toRecord)
    },

    async must(id, object) {
      const r = await store.get(id)
      if (!r || (object && r.object !== object)) throw bad('Record not found', 404)
      return r
    },

    // where: { parentId, approvalId, ownerId, status, ...dataFieldEquals }
    async list(object, where = {}, { limit = 5000, order = 'name' } = {}) {
      defOf(object)
      const conds = [eq(s.records.object, object)]
      for (const [k, v] of Object.entries(where)) {
        if (v === undefined) continue
        if (['parentId', 'approvalId', 'ownerId', 'status'].includes(k)) conds.push(v === null ? sql`${s.records[k]} is null` : eq(s.records[k], v))
        else conds.push(v === null ? sql`json_extract(${s.records.data}, ${'$.' + k}) is null` : sql`json_extract(${s.records.data}, ${'$.' + k}) = ${typeof v === 'boolean' ? (v ? 1 : 0) : v}`)
      }
      const ord = order === 'recent' ? desc(s.records.createdAt) : s.records.name
      const rows = await db.select().from(s.records).where(and(...conds)).orderBy(ord).limit(limit)
      return rows.map(toRecord)
    },

    async create(object, input, { system = false, raw = false } = {}) {
      const def = defOf(object)
      let data = applyDefaults(def, sanitize(def, input, { system }))
      if (def.owner || def.queue) data.ownerId = input.ownerId !== undefined ? input.ownerId || null : user?.id ?? null
      if (!raw && hooks.beforeSave) data = await hooks.beforeSave(store, def, data, null, { system })
      checkRequired(def, data)
      const id = uid()
      const name = def.prefix ? await nextNumber(db, def) : nameFor(def, data)
      const at = nowIso()
      const ownerId = data.ownerId ?? null
      delete data.ownerId
      const row = { id, object, name, ownerId, data, createdAt: at, createdBy: user?.name ?? 'System', updatedAt: at, updatedBy: user?.name ?? 'System', ...columnsFor(def, data) }
      await db.batch([
        db.insert(s.records).values(row),
        db.insert(s.history).values({ id: uid(), recordId: id, object, field: '__created', newValue: name, userId: user?.id, userName: user?.name ?? 'System', at })
      ])
      const rec = toRecord(row)
      if (!raw && hooks.afterSave) await hooks.afterSave(store, def, rec, null)
      return rec
    },

    async update(id, input, { system = false, raw = false } = {}) {
      const before = await store.must(id)
      const def = defOf(before.object)
      const patch = sanitize(def, input, { system })
      let data = { ...stripSystem(before), ...patch }
      if ('ownerId' in input && (def.owner || def.queue)) data.ownerId = input.ownerId || null
      else data.ownerId = before.ownerId
      if (!raw && hooks.beforeSave) data = await hooks.beforeSave(store, def, data, before, { system })
      checkRequired(def, data)
      const changes = []
      for (const k of [...def.fields.map((x) => x.key), 'ownerId']) {
        if (show(before[k]) !== show(data[k])) changes.push({ field: k, oldValue: show(before[k]), newValue: show(data[k]) })
      }
      if (!changes.length) return before
      const at = nowIso()
      const ownerId = data.ownerId ?? null
      delete data.ownerId
      const name = def.prefix ? before.name : nameFor(def, data)
      await db.batch([
        db.update(s.records).set({ data, name, ownerId, updatedAt: at, updatedBy: user?.name ?? 'System', ...columnsFor(def, data) }).where(eq(s.records.id, id)),
        ...chunk(changes, 10).map((c) => db.insert(s.history).values(c.map((x) => ({ id: uid(), recordId: id, object: def.key, ...x, userId: user?.id, userName: user?.name ?? 'System', at }))))
      ])
      const rec = await store.get(id)
      if (!raw && hooks.afterSave) await hooks.afterSave(store, def, rec, before)
      return rec
    },

    async remove(id) {
      const rec = await store.must(id)
      const [child] = await db.select({ id: s.records.id }).from(s.records).where(eq(s.records.parentId, id)).limit(1)
      if (child) throw bad('This record has related records. Delete or move those first.')
      await db.batch([
        db.delete(s.records).where(eq(s.records.id, id)),
        db.delete(s.notes).where(eq(s.notes.recordId, id)),
        db.delete(s.files).where(eq(s.files.recordId, id))
      ])
      return rec
    },

    async addNote(recordId, kind, title, body) {
      await db.insert(s.notes).values({ id: uid(), recordId, kind, title, body, userId: user?.id, userName: user?.name ?? 'System', at: nowIso() })
    },

    // Display names for lookup ids found in the given records.
    async namesFor(records) {
      const ids = new Set()
      for (const r of records) {
        const def = OBJECTS[r.object]
        for (const field of def.fields) {
          if (field.type === 'lookup' && r[field.key]) ids.add(r[field.key])
          if (field.type === 'polylookup' && r[field.key]?.id) ids.add(r[field.key].id)
        }
      }
      const rows = await store.getMany([...ids])
      return Object.fromEntries(rows.map((r) => [r.id, { name: r.name, object: r.object, label: labelOf(r) }]))
    }
  }
  return store
}

// Prefix-numbered records also show their descriptive field, e.g. "TWA-11476 · Springfield Tavern".
export function labelOf(r) {
  const extra = { approval: r.tradingName, pts: r.ptsType, case: r.subject, samplingEvent: r.eventType, planAssessment: r.assessmentType, inspection: r.inspectionType, sampleLocation: r.description }[r.object]
  return extra ? `${r.name} · ${extra}` : r.name
}

export function stripSystem(rec) {
  const out = {}
  for (const [k, v] of Object.entries(rec)) if (!SYSTEM_KEYS.has(k)) out[k] = v
  return out
}

export function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}
