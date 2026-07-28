import { handle } from 'hono/vercel'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { api } from '../server/src/routes/index.js'
import { useSupabase } from '../server/src/db/supabase.js'
import { config } from '../server/src/config.js'

const app = new Hono().basePath('/api')

app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

app.route('/v1', api)

app.get('/v1', (c) => {
  const sb = useSupabase()
  return c.json({
    status: 'ok',
    message: 'NimGigs API is alive',
    database: sb ? 'supabase' : 'memory',
    supabaseConfigured: Boolean(config.supabase.url && config.supabase.serviceRoleKey),
    url: config.supabase.url ? 'Set' : 'Missing',
  })
})

export const vConfig = {
  runtime: 'edge'
}

export default handle(app)
