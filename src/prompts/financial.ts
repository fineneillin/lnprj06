export const FINANCIAL_SYSTEM_PROMPT = `你是一位專業的台灣股票市場財務分析師，專精於台股上市公司財報解讀。
你的分析客觀、精確，使用繁體中文。
你必須嚴格以 JSON 格式回傳分析結果，不含任何額外說明文字或 markdown 符號。`

export function buildAnalysisPrompt(stockCode: string, quarters: string[]): string {
  const isMulti = quarters.length > 1
  const orderNote = `以上 ${quarters.length} 份文件依序為：${quarters.join('、')} 季度財報。`

  return `${orderNote}

請分析股票代碼 ${stockCode} 的財務報表，嚴格以下列 JSON 格式回傳（不含任何 markdown 包裝或說明文字）：

{
  "company": "公司完整中文名稱",
  "stockCode": "${stockCode}",
  "periods": ${JSON.stringify(quarters)},
  "isMultiQuarter": ${isMulti},
  "metrics": {
    "revenue":         { "value": "數值（含千分位逗號）", "unit": "單位", "yoy": "如+33.76%，無則null", "plain": "用完全不懂財務的人也看得懂的一句話說明，含具體數字，15-25字，例：全年收入近3兆，比去年多賺三成多" },
    "operatingIncome": { "value": "", "unit": "", "yoy": null, "plain": "例：本業實際賺到的錢，扣掉營業成本後剩下的" },
    "netIncome":       { "value": "", "unit": "", "yoy": null, "plain": "例：全年最終入袋的純利潤，比去年多N成" },
    "eps":             { "value": "", "unit": "元/股", "yoy": null, "plain": "例：每張股票（1000股）賺了X萬元，比去年多賺N成" },
    "roe":             { "value": "", "unit": "%", "yoy": null, "plain": "例：股東每投入100元，一年幫公司賺了X元" },
    "roa":             { "value": "", "unit": "%", "yoy": null, "plain": "例：公司用全部資產，每100元賺了X元" },
    "debtRatio":       { "value": "", "unit": "%", "yoy": null, "plain": "例：公司X成靠借錢經營，Y成用自己的錢" },
    "grossMargin":     { "value": "", "unit": "%", "yoy": null, "plain": "例：賣出100元的產品，扣掉直接成本後還剩X元" },
    "operatingMargin": { "value": "", "unit": "%", "yoy": null, "plain": "例：每賺100元營收，本業操作後實際留下X元" }
  },
  "scoreCard": {
    "profitability": { "stars": 整數1到5, "reason": "一句具體理由，15字以內" },
    "growth":        { "stars": 整數1到5, "reason": "一句具體理由，15字以內" },
    "stability":     { "stars": 整數1到5, "reason": "一句具體理由，15字以內" },
    "risk":          { "stars": 整數1到5, "reason": "5星=風險極低，1星=風險極高，15字以內" },
    "conclusion": "綜合一句話判斷，說明核心依據，不超過40字"
  },${isMulti ? `
  "quarterly": [
    ${quarters.map(q => `{ "period": "${q}", "metrics": { "revenue": { "value": "", "unit": "" }, "operatingIncome": { "value": "", "unit": "" }, "netIncome": { "value": "", "unit": "" }, "eps": { "value": "", "unit": "" } } }`).join(',\n    ')}
  ],
  "trends": {
    "revenueDirection": "up或down或flat",
    "strongestQuarter": "如Q3",
    "weakestQuarter": "如Q1",
    "trendSummary": "一句話說明跨季整體趨勢，20字以內"
  },` : ''}
  "highlights": ["財務亮點1（25字以內）", "亮點2", "亮點3"],
  "risks": ["風險因素1（25字以內）", "風險2"],
  "outlook": "整體展望2-3句，盡量白話，避免過多術語"
}

注意：
- plain 欄位必須避免使用 ROE、毛利率、EPS 等縮寫或術語，改用生活化的比喻或具體數字讓一般人理解
- scoreCard 的 stars 必須是 1 到 5 之間的整數
- 若某指標無法從報表取得，value 填 "N/A"，yoy 與 plain 填 null`
}
