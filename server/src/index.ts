import { config as loadEnv } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Load server/.env then root .env
const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })
loadEnv({ path: resolve(__dirname, '../../.env') })

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { api } from './routes/index.js'
import { seedDemo } from './seed.js'
import { config } from './config.js'
import { useSupabase } from './db/supabase.js'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: [config.appUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

app.route('/api/v1', api)
app.get('/', (c) =>
  c.json({
    name: 'NimGigs API',
    docs: '/api/v1/health',
    database: useSupabase() ? 'supabase' : 'memory',
    oauth: {
      github: config.github.enabled(),
      twitter: config.twitter.enabled(),
    },
  }),
)

const port = config.port

await seedDemo()

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`NimGigs API http://localhost:${info.port}`)
  console.log(`Database: ${useSupabase() ? 'Supabase' : 'in-memory (set SUPABASE_URL + SERVICE_ROLE_KEY)'}`)
  console.log(
    `OAuth GitHub: ${config.github.enabled() ? 'on' : 'off'} · Twitter: ${config.twitter.enabled() ? 'on' : 'off'}`,
  )
})
