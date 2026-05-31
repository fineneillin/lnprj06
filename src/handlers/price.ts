import type { Context } from 'hono'

type Bindings = { ASSETS: Fetcher }

export async function priceHandler(c: Context<{ Bindings: Bindings }>) {
  const ticker = c.req.param('ticker')
  if (!ticker || !/^\d{4,6}$/.test(ticker)) {
    return c.json({ error: '無效的股票代碼' }, 400)
  }

  const symbol = ticker + '.TW'
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=6mo`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; stock-analyzer/1.0)',
        'Accept': 'application/json',
      },
    })

    if (!res.ok) {
      return c.json({ error: `Yahoo Finance 回應 ${res.status}` }, 502)
    }

    const json = await res.json() as {
      chart?: { result?: Array<{ timestamp: number[]; indicators: { quote: Array<{ close: (number | null)[] }> } }> }
    }
    const result = json.chart?.result?.[0]
    if (!result) {
      return c.json({ error: '找不到此股票的股價資料' }, 404)
    }

    const timestamps = result.timestamp
    const closes = result.indicators.quote[0].close

    const data = timestamps
      .map((t, i) => ({ time: t, value: closes[i] ?? null }))
      .filter((d): d is { time: number; value: number } => d.value !== null)

    return c.json({ ticker, symbol, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : '無法取得股價資料'
    return c.json({ error: message }, 500)
  }
}
