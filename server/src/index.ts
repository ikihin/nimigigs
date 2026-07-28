import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { api } from './routes/index.js'
import { seedDemo } from './seed.js'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

app.route('/api/v1', api)
app.get('/', (c) => c.json({ name: 'NimGigs API', docs: '/api/v1/health' }))

const port = Number(process.env.PORT || 8787)

await seedDemo()

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`NimGigs API http://localhost:${info.port}`)
})
