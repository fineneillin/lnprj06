import type { Context } from 'hono'
import { analyzeFinancialReport } from '../services/claude'

type Bindings = { ANTHROPIC_API_KEY: string; ASSETS: Fetcher }

const MAX_PDF_BYTES = 10 * 1024 * 1024
const QUARTER_KEYS = ['q1', 'q2', 'q3', 'q4'] as const

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export async function analyzeHandler(c: Context<{ Bindings: Bindings }>) {
  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: '請求格式錯誤' }, 400)
  }

  const stockCode = (formData.get('stockCode') as string | null)?.trim() ?? ''

  const pdfs: { quarter: string; base64: string }[] = []
  const quarters: string[] = []

  for (const q of QUARTER_KEYS) {
    const file = formData.get(`pdf_${q}`) as File | null
    if (!file || file.size === 0) continue
    if (!file.type.includes('pdf')) return c.json({ error: `${q.toUpperCase()} 僅接受 PDF 格式` }, 400)
    if (file.size > MAX_PDF_BYTES) return c.json({ error: `${q.toUpperCase()} 檔案不得超過 10MB` }, 400)
    const buffer = await file.arrayBuffer()
    const base64 = toBase64(buffer)
    quarters.push(q.toUpperCase())
    pdfs.push({ quarter: q.toUpperCase(), base64 })
  }

  if (pdfs.length === 0) return c.json({ error: '請至少上傳一份財報 PDF' }, 400)

  const apiKey = c.env.ANTHROPIC_API_KEY
  if (!apiKey) return c.json({ error: 'API 金鑰未設定，請聯絡管理員' }, 500)

  try {
    const result = await analyzeFinancialReport({
      stockCode,
      quarters,
      pdfs,
      apiKey,
    })
    return c.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '分析失敗，請稍後再試'
    return c.json({ error: message }, 500)
  }
}
