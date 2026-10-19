import { handle } from 'hono/cloudflare-pages'
import { drizzle } from 'drizzle-orm/d1'
import { createApp } from '../../server/app.js'

const app = createApp(async (c, next) => {
  if (!c.env.AUTH_SECRET) return c.json({ error: 'AUTH_SECRET is not configured' }, 500)
  c.set('db', drizzle(c.env.DB))
  c.set('secret', c.env.AUTH_SECRET)
  c.set('wasteid', { url: c.env.WASTEID_API_URL, key: c.env.WASTEID_API_KEY })
  await next()
})

export const onRequest = handle(app)
