import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { serve } from '@hono/node-server'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { createApp } from './app.js'

const devVars = existsSync('.dev.vars') ? Object.fromEntries([...readFileSync('.dev.vars', 'utf8').matchAll(/^(\w+)=(.*)$/gm)].map((m) => [m[1], m[2].trim()])) : {}
const env = { ...devVars, ...process.env }
if (!env.AUTH_SECRET) throw new Error('AUTH_SECRET missing: put it in .dev.vars')
mkdirSync('.wrangler', { recursive: true })
const client = createClient({ url: env.DATABASE_URL || 'file:.wrangler/dev.db' })
const db = drizzle(client)

await client.execute('CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY)')
const done = new Set((await client.execute('SELECT name FROM _migrations')).rows.map((r) => r.name))
for (const f of readdirSync('migrations').filter((f) => f.endsWith('.sql')).sort()) {
  if (done.has(f)) continue
  const stmts = readFileSync(`migrations/${f}`, 'utf8').split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean)
  await client.batch([...stmts, { sql: 'INSERT INTO _migrations VALUES (?)', args: [f] }], 'write')
  console.log('applied', f)
}

const wasteid = { url: env.WASTEID_API_URL, key: env.WASTEID_API_KEY }
const app = createApp(async (c, next) => {
  c.set('db', db)
  c.set('secret', env.AUTH_SECRET)
  c.set('wasteid', wasteid)
  await next()
})
const port = +(env.PORT || 8789)
serve({ fetch: app.fetch, port }, () => console.log(`API on http://127.0.0.1:${port}/api`))
