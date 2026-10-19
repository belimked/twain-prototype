import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { eq, and, desc, sql, inArray } from 'drizzle-orm'
import * as s from './schema.js'
import { verifyPassword, signToken, verifyToken } from './auth.js'
import { OBJECTS } from '../shared/objects.js'
import { createStore, defOf, bad, uid, nowIso, labelOf } from './store.js'
import { hooks, actions, billingConfig } from './logic.js'
import { seedBase, seedChunk, seedFinish } from './seed.js'

const MAX_FILE_CHARS = 1_400_000
const DATA_URL = /^data:(image\/(?:jpeg|png|webp|gif)|application\/pdf|text\/csv|text\/plain);base64,[A-Za-z0-9+/]+=*$/
const SEARCHABLE = ['approval', 'site', 'occupier', 'pts', 'billingAccount', 'case', 'samplingEvent', 'planAssessment', 'inspection', 'invoice', 'task']
const publicUser = ({ passwordHash, ...u }) => u

// `setup` must set c.var.db (drizzle with .batch), c.var.secret and optionally c.var.wasteid.
export function createApp(setup) {
  const app = new Hono().basePath('/api')
  app.use('*', setup)
  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status)
    console.error(err)
    return c.json({ error: 'Internal error' }, 500)
  })

  app.post('/login', async (c) => {
    const { username, password } = await c.req.json()
    const [user] = await c.var.db.select().from(s.users).where(eq(s.users.username, String(username || '').trim().toLowerCase()))
    if (!user || user.status !== 'active' || !(await verifyPassword(String(password || ''), user.passwordHash))) throw bad('Invalid username or password', 401)
    const token = await signToken({ sub: user.id, name: user.displayName, role: user.role }, c.var.secret)
    return c.json({ token, user: publicUser(user) })
  })

  app.use('*', async (c, next) => {
    const user = await verifyToken((c.req.header('Authorization') || '').replace(/^Bearer /, ''), c.var.secret)
    if (!user) throw bad('Not signed in', 401)
    c.set('user', { id: user.sub, name: user.name, role: user.role })
    c.set('store', createStore(c.var.db, c.var.user, hooks))
    await next()
  })
  const coordinator = async (c, next) => {
    if (c.var.user.role !== 'coordinator') throw bad('Only a Trade Waste Coordinator can do this', 403)
    await next()
  }
  const guardMaster = (c, object) => {
    if (OBJECTS[object]?.master && c.var.user.role !== 'coordinator') throw bad('Master data is maintained by Trade Waste Coordinators', 403)
  }

  app.get('/me', (c) => c.json(c.var.user))
  app.get('/users', async (c) => c.json((await c.var.db.select().from(s.users)).map(publicUser)))

  app.get('/state', async (c) => {
    const [row] = await c.var.db.select({ n: sql`count(*)` }).from(s.records)
    return c.json({ empty: !row.n })
  })

  // Demo data is loaded in steps so each request stays inside Worker limits.
  const canReset = async (c, next) => {
    const [row] = await c.var.db.select({ n: sql`count(*)` }).from(s.records)
    if (row.n && c.var.user.role !== 'coordinator') throw bad('Only a Trade Waste Coordinator can reset the demo data', 403)
    await next()
  }
  const seeding = async (c, next) => {
    const [row] = await c.var.db.select().from(s.meta).where(eq(s.meta.key, 'seeding'))
    if (!row) throw bad('Start the reset first', 409)
    c.set('seedChunks', row.value.chunks)
    await next()
  }
  app.post('/reset/start', canReset, async (c) => {
    const out = await seedBase(c.var.db)
    await c.var.db.insert(s.meta).values({ key: 'seeding', value: { chunks: out.chunks, by: c.var.user.id } })
    return c.json(out)
  })
  app.post('/reset/chunk', seeding, async (c) => {
    const i = Number((await c.req.json()).i)
    if (!Number.isInteger(i) || i < 0 || i >= c.var.seedChunks) throw bad('Invalid chunk')
    return c.json(await seedChunk(c.var.db, i))
  })
  app.post('/reset/finish', seeding, async (c) => {
    const out = await seedFinish(c.var.db)
    await c.var.db.delete(s.meta).where(eq(s.meta.key, 'seeding'))
    return c.json(out)
  })

  app.get('/o/:object', async (c) => {
    const object = c.req.param('object')
    defOf(object)
    const q = c.req.query()
    const where = {}
    for (const k of ['parentId', 'approvalId', 'ownerId', 'status']) {
      if (q[k] === undefined) continue
      where[k] = q[k] === 'none' ? null : q[k] === 'me' ? c.var.user.id : q[k]
    }
    for (const [k, v] of Object.entries(q)) {
      if (!k.startsWith('f.')) continue
      where[k.slice(2)] = v === 'none' ? null : v === 'true' ? true : v === 'false' ? false : v
    }
    const records = await c.var.store.list(object, where, { limit: Math.min(+q.limit || 5000, 5000), order: q.order })
    return c.json({ records, names: await c.var.store.namesFor(records) })
  })

  app.get('/r/:id', async (c) => {
    const record = await c.var.store.must(c.req.param('id'))
    const counts = await c.var.db.select({ object: s.records.object, n: sql`count(*)` }).from(s.records)
      .where(sql`${s.records.parentId} = ${record.id} or ${s.records.approvalId} = ${record.id}`).groupBy(s.records.object)
    return c.json({ record, names: await c.var.store.namesFor([record]), counts: Object.fromEntries(counts.map((x) => [x.object, x.n])) })
  })

  app.post('/o/:object', async (c) => {
    const object = c.req.param('object')
    guardMaster(c, object)
    const record = await c.var.store.create(object, await c.req.json())
    return c.json({ record, names: await c.var.store.namesFor([record]) })
  })

  app.patch('/r/:id', async (c) => {
    const before = await c.var.store.must(c.req.param('id'))
    guardMaster(c, before.object)
    const record = await c.var.store.update(before.id, await c.req.json())
    return c.json({ record, names: await c.var.store.namesFor([record]) })
  })

  app.post('/bulk-assign', async (c) => {
    const { ids, ownerId } = await c.req.json()
    if (!Array.isArray(ids) || !ids.length || ids.length > 50) throw bad('Select between 1 and 50 records')
    if (ownerId) {
      const [u] = await c.var.db.select().from(s.users).where(eq(s.users.id, ownerId))
      if (!u) throw bad('Unknown user')
    }
    for (const id of ids) await c.var.store.update(id, { ownerId: ownerId || null })
    return c.json({ updated: ids.length })
  })

  app.delete('/r/:id', coordinator, async (c) => c.json({ deleted: (await c.var.store.remove(c.req.param('id'))).id }))

  app.get('/r/:id/history', async (c) => {
    const rows = await c.var.db.select().from(s.history).where(eq(s.history.recordId, c.req.param('id'))).orderBy(desc(s.history.at)).limit(500)
    return c.json(rows)
  })

  app.get('/r/:id/notes', async (c) => c.json(await c.var.db.select().from(s.notes).where(eq(s.notes.recordId, c.req.param('id'))).orderBy(desc(s.notes.at))))
  app.post('/r/:id/notes', async (c) => {
    const rec = await c.var.store.must(c.req.param('id'))
    const { kind = 'note', title, body } = await c.req.json()
    if (!['note', 'email', 'call'].includes(kind)) throw bad('Invalid note type')
    if (!String(body || '').trim()) throw bad('Note text is required')
    await c.var.store.addNote(rec.id, kind, String(title || '').slice(0, 300) || null, String(body).slice(0, 20000))
    return c.json({ ok: true })
  })

  app.get('/r/:id/files', async (c) => c.json(await c.var.db.select({ id: s.files.id, fileName: s.files.fileName, mime: s.files.mime, size: s.files.size, userName: s.files.userName, at: s.files.at })
    .from(s.files).where(eq(s.files.recordId, c.req.param('id'))).orderBy(desc(s.files.at))))
  app.post('/r/:id/files', async (c) => {
    const rec = await c.var.store.must(c.req.param('id'))
    const { fileName, data } = await c.req.json()
    const m = DATA_URL.exec(String(data || ''))
    if (!m) throw bad('Invalid file')
    if (data.length > MAX_FILE_CHARS) throw bad('File is too large for the prototype (max ~1 MB)')
    await c.var.db.insert(s.files).values({ id: uid(), recordId: rec.id, fileName: String(fileName || 'file').slice(0, 200), mime: m[1], size: Math.round(data.length * 0.75), data, userName: c.var.user.name, at: nowIso() })
    return c.json({ ok: true })
  })
  app.get('/files/:id', async (c) => {
    const [f] = await c.var.db.select().from(s.files).where(eq(s.files.id, c.req.param('id')))
    if (!f) throw bad('File not found', 404)
    return c.json(f)
  })
  app.delete('/files/:id', async (c) => {
    await c.var.db.delete(s.files).where(eq(s.files.id, c.req.param('id')))
    return c.json({ ok: true })
  })

  app.get('/search', async (c) => {
    const q = String(c.req.query('q') || '').trim()
    const scope = c.req.query('object')
    if (q.length < 2) return c.json({ groups: [] })
    const objects = scope && scope !== 'all' ? [defOf(scope).key] : SEARCHABLE
    const like = `%${q.replace(/[%_]/g, '')}%`
    const rows = await c.var.db.select().from(s.records)
      .where(and(inArray(s.records.object, objects), sql`(${s.records.name} like ${like} or ${s.records.data} like ${like})`))
      .orderBy(s.records.object, s.records.name).limit(200)
    const groups = {}
    for (const r of rows) {
      const list = (groups[r.object] ||= [])
      if (list.length < 8) list.push({ id: r.id, object: r.object, name: r.name, label: labelOf({ ...r.data, name: r.name, object: r.object }), status: r.status })
    }
    return c.json({ groups: objects.filter((o) => groups[o]).map((o) => ({ object: o, records: groups[o] })) })
  })

  app.get('/home', async (c) => {
    const st = c.var.store
    const me = c.var.user.id
    const open = (r, done) => !done.includes(r.status)
    const [myTasks, queueTasks, myCases, queueCases, myPas, queuePas, workItems, ended, nc] = await Promise.all([
      st.list('task', { ownerId: me }), st.list('task', { ownerId: null }),
      st.list('case', { ownerId: me }, { order: 'recent' }), st.list('case', { ownerId: null }, { order: 'recent' }),
      st.list('planAssessment', { ownerId: me }), st.list('planAssessment', { ownerId: null }),
      c.var.user.role === 'coordinator' ? st.list('workItem', { status: 'Pending' }) : [],
      st.list('billingAccount', { status: 'Ended' }),
      st.list('case', { caseType: 'Non-Compliance' })
    ])
    const endedIds = new Set(ended.map((b) => b.id))
    const ownershipChanges = endedIds.size ? (await st.list('approval', { status: 'Active' })).filter((a) => endedIds.has(a.billingAccountId)) : []
    const lists = {
      myTasks: myTasks.filter((t) => t.status !== 'Completed').sort((a, b) => (a.dueDate || '9').localeCompare(b.dueDate || '9')),
      queueTasks: queueTasks.filter((t) => t.status !== 'Completed'),
      myCases: myCases.filter((x) => open(x, ['Closed'])), queueCases: queueCases.filter((x) => open(x, ['Closed'])),
      myPas: myPas.filter((x) => open(x, ['Completed'])), queuePas: queuePas.filter((x) => open(x, ['Completed'])),
      workItems, ownershipChanges
    }
    const all = Object.values(lists).flat()
    return c.json({ ...lists, openNc: nc.filter((x) => x.status !== 'Closed').length, names: await st.namesFor(all) })
  })

  app.post('/actions/:name', async (c) => {
    const fn = actions[c.req.param('name')]
    if (!fn) throw bad('Unknown action', 404)
    return c.json(await fn(c.var.store, await c.req.json()))
  })

  app.get('/billing-config', async (c) => c.json(await billingConfig(c.var.db)))
  app.put('/billing-config', coordinator, async (c) => {
    const body = await c.req.json()
    const cfg = { ...(await billingConfig(c.var.db)) }
    for (const k of ['rates', 'domesticStrength']) {
      for (const p of ['ss', 'bod', 'n', 'p']) {
        const v = Number(body?.[k]?.[p])
        if (!Number.isFinite(v) || v < 0) throw bad(`Invalid ${k}.${p}`)
        cfg[k] = { ...cfg[k], [p]: v }
      }
    }
    for (const k of ['domesticLitresPerEmployeeDay', 'domesticLitresPerShowerDay']) {
      const v = Number(body?.[k])
      if (!Number.isFinite(v) || v < 0) throw bad(`Invalid ${k}`)
      cfg[k] = v
    }
    await c.var.db.insert(s.meta).values({ key: 'billingConfig', value: cfg }).onConflictDoUpdate({ target: s.meta.key, set: { value: cfg } })
    return c.json(cfg)
  })

  app.get('/prefs/:key', async (c) => {
    const [row] = await c.var.db.select().from(s.prefs).where(and(eq(s.prefs.userId, c.var.user.id), eq(s.prefs.key, c.req.param('key'))))
    return c.json(row?.value ?? null)
  })
  app.put('/prefs/:key', async (c) => {
    const value = await c.req.json()
    if (JSON.stringify(value).length > 50000) throw bad('Preference is too large')
    await c.var.db.insert(s.prefs).values({ userId: c.var.user.id, key: c.req.param('key'), value })
      .onConflictDoUpdate({ target: [s.prefs.userId, s.prefs.key], set: { value } })
    return c.json({ ok: true })
  })

  app.get('/wasteid/device/:psid', async (c) => {
    const w = c.var.wasteid
    if (!w?.url || !w?.key) return c.json({ configured: false })
    const res = await fetch(`${w.url.replace(/\/+$/, '')}/api/integration/devices/${encodeURIComponent(c.req.param('psid'))}`, { headers: { 'x-integration-key': w.key } })
    if (res.status === 404) return c.json({ configured: true, found: false, appUrl: w.url })
    if (!res.ok) throw bad(`WasteID returned ${res.status}`, 502)
    return c.json({ configured: true, found: true, appUrl: w.url, ...(await res.json()) })
  })

  return app
}
