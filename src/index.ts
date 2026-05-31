import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { analyzeHandler } from './handlers/analyze'
import { priceHandler } from './handlers/price'

type Bindings = { ANTHROPIC_API_KEY: string; ASSETS: Fetcher }

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

app.post('/api/analyze', analyzeHandler)
app.get('/api/price/:ticker', priceHandler)
app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
