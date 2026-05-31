import Anthropic from '@anthropic-ai/sdk'
import { FINANCIAL_SYSTEM_PROMPT, buildAnalysisPrompt } from '../prompts/financial'

export interface MetricValue {
  value: string
  unit: string
  yoy: string | null
  plain: string | null
}

export interface ScoreItem {
  stars: number
  reason: string
}

export interface ScoreCard {
  profitability: ScoreItem
  growth: ScoreItem
  stability: ScoreItem
  risk: ScoreItem
  conclusion: string
}

export interface QuarterData {
  period: string
  metrics: {
    revenue: { value: string; unit: string }
    operatingIncome: { value: string; unit: string }
    netIncome: { value: string; unit: string }
    eps: { value: string; unit: string }
  }
}

export interface Trends {
  revenueDirection: 'up' | 'down' | 'flat'
  strongestQuarter: string
  weakestQuarter: string
  trendSummary: string
}

export interface FinancialAnalysis {
  company: string
  stockCode: string
  periods: string[]
  isMultiQuarter: boolean
  metrics: {
    revenue: MetricValue
    operatingIncome: MetricValue
    netIncome: MetricValue
    eps: MetricValue
    roe: MetricValue
    roa: MetricValue
    debtRatio: MetricValue
    grossMargin: MetricValue
    operatingMargin: MetricValue
  }
  scoreCard: ScoreCard
  quarterly?: QuarterData[]
  trends?: Trends
  highlights: string[]
  risks: string[]
  outlook: string
}

export async function analyzeFinancialReport(params: {
  stockCode: string
  quarters: string[]
  pdfs: { quarter: string; base64: string }[]
  apiKey: string
}): Promise<FinancialAnalysis> {
  const client = new Anthropic({ apiKey: params.apiKey })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = []

  // Add each PDF as a document block
  for (const pdf of params.pdfs) {
    content.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdf.base64,
      },
    })
  }

  // Append the analysis prompt
  content.push({
    type: 'text',
    text: buildAnalysisPrompt(params.stockCode, params.quarters),
  })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8096,
    system: FINANCIAL_SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response from Claude')

  const raw = block.text.trim()
  const match = raw.match(/```json\s*([\s\S]*?)\s*```/) ?? raw.match(/(\{[\s\S]*\})/)
  if (!match) throw new Error('Claude 回傳格式錯誤，無法解析')

  return JSON.parse(match[1]) as FinancialAnalysis
}
