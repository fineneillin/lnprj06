const METRIC_LABELS = {
  revenue:         '營業收入',
  operatingIncome: '營業利益',
  netIncome:       '稅後淨利',
  eps:             'EPS',
  roe:             'ROE',
  roa:             'ROA',
  debtRatio:       '負債比率',
  grossMargin:     '毛利率',
  operatingMargin: '營業利益率',
}

const QUARTER_KEYS = ['q1', 'q2', 'q3', 'q4']

// ── Quarter zone setup ──────────────────────────────────────────
QUARTER_KEYS.forEach(q => {
  const input  = document.getElementById(`pdf_${q}`)
  const zone   = document.getElementById(`zone_${q}`)
  const nameEl = document.getElementById(`qname_${q}`)

  const applyFile = (file) => {
    if (!file || file.type !== 'application/pdf') return
    const dt = new DataTransfer()
    dt.items.add(file)
    input.files = dt.files
    nameEl.textContent = file.name.length > 22 ? file.name.slice(0, 20) + '…' : file.name
    zone.classList.add('has-file')
  }

  input.addEventListener('change', () => {
    const file = input.files[0]
    if (file) {
      nameEl.textContent = file.name.length > 22 ? file.name.slice(0, 20) + '…' : file.name
      zone.classList.add('has-file')
    } else {
      nameEl.textContent = '選填，點擊上傳'
      zone.classList.remove('has-file')
    }
  })

  zone.addEventListener('dragover',  e  => { e.preventDefault(); zone.classList.add('drag-over') })
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'))
  zone.addEventListener('drop', e => {
    e.preventDefault()
    zone.classList.remove('drag-over')
    applyFile(e.dataTransfer.files[0])
  })
})

// ── Form submit ─────────────────────────────────────────────────
document.getElementById('analyzeForm').addEventListener('submit', async e => {
  e.preventDefault()

  const hasAny = QUARTER_KEYS.some(q => document.getElementById(`pdf_${q}`).files[0])

  setError('')
  if (!hasAny) return setError('請至少上傳一份財報 PDF')

  showLoading(true)

  try {
    const fd = new FormData()
    QUARTER_KEYS.forEach(q => {
      const file = document.getElementById(`pdf_${q}`).files[0]
      if (file) fd.append(`pdf_${q}`, file)
    })

    const res  = await fetch('/api/analyze', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? '分析失敗')
    renderResults(data)
  } catch (err) {
    setError(err.message)
  } finally {
    showLoading(false)
  }
})

// ── Render ──────────────────────────────────────────────────────
function renderResults(data) {
  const resultsEl = document.getElementById('results')
  resultsEl.style.display = 'block'
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // 股價走勢圖
  if (data.tickerSymbol) {
    fetchAndRenderChart(data.tickerSymbol)
  }

  // Header
  document.getElementById('companyName').textContent = `${data.company}（${data.stockCode}）`
  document.getElementById('periodLabel').textContent  = (data.periods ?? []).join(' · ')

  // Metrics
  const grid = document.getElementById('metricsGrid')
  grid.innerHTML = ''
  for (const [key, label] of Object.entries(METRIC_LABELS)) {
    const m = data.metrics?.[key]
    if (!m) continue
    const yoyNum = parseFloat(m.yoy)
    const yoyHtml = m.yoy
      ? `<div class="metric-yoy ${yoyNum >= 0 ? 'yoy-positive' : 'yoy-negative'}">
           ${yoyNum >= 0 ? '▲' : '▼'} ${Math.abs(yoyNum).toFixed(1)}% YoY
         </div>`
      : ''
    const plainHtml = m.plain
      ? `<div class="metric-plain">${m.plain}</div>`
      : ''
    grid.insertAdjacentHTML('beforeend', `
      <div class="metric-card">
        <div class="metric-name">${label}</div>
        <div class="metric-value">${m.value}</div>
        <div class="metric-unit">${m.unit}</div>
        ${yoyHtml}
        ${plainHtml}
      </div>`)
  }

  // Score card
  document.getElementById('scoreCard').innerHTML = renderScoreCard(data.scoreCard)

  // Quarterly
  const qSec = document.getElementById('quarterlySection')
  qSec.innerHTML = (data.isMultiQuarter && data.quarterly?.length)
    ? renderQuarterly(data.quarterly, data.trends)
    : ''

  // Highlights & Risks
  document.getElementById('highlightsList').innerHTML =
    (data.highlights ?? []).map(h => `<li>${h}</li>`).join('')
  document.getElementById('risksList').innerHTML =
    (data.risks ?? []).map(r => `<li>${r}</li>`).join('')

  // Outlook
  document.getElementById('outlookText').textContent = data.outlook ?? ''
}

// ── Score Card ──────────────────────────────────────────────────
function stars(n) {
  const filled = Math.max(0, Math.min(5, Math.round(n)))
  return '★'.repeat(filled) + '☆'.repeat(5 - filled)
}

function renderScoreCard(sc) {
  if (!sc) return ''
  const dims = [
    { key: 'profitability', label: '獲利能力' },
    { key: 'growth',        label: '成長動能' },
    { key: 'stability',     label: '財務穩健' },
    { key: 'risk',          label: '風險程度' },
  ]
  const items = dims.map(d => {
    const item = sc[d.key]
    if (!item) return ''
    return `
      <div class="sc-item">
        <div class="sc-dim">${d.label}</div>
        <div class="sc-stars">${stars(item.stars)}</div>
        <div class="sc-reason">${item.reason}</div>
      </div>`
  }).join('')

  return `
    <div class="scorecard">
      ${items}
      <div class="sc-conclusion">
        <span class="sc-conclusion-label">綜合結論</span>${sc.conclusion ?? ''}
      </div>
    </div>`
}

// ── Quarterly Table ─────────────────────────────────────────────
function renderQuarterly(quarterly, trends) {
  const COLS = [
    { key: 'revenue',         label: '營業收入' },
    { key: 'operatingIncome', label: '營業利益' },
    { key: 'netIncome',       label: '稅後淨利' },
    { key: 'eps',             label: 'EPS' },
  ]
  const periods  = quarterly.map(q => q.period)
  const dirIcon  = { up: '↑', down: '↓', flat: '→' }

  let trendMetaHtml = ''
  if (trends) {
    const dir = trends.revenueDirection ?? 'flat'
    trendMetaHtml = `
      <div class="trend-meta">
        <span class="trend-dir trend-dir-${dir}">${dirIcon[dir] ?? '→'} ${trends.trendSummary ?? ''}</span>
        <span class="trend-tags">
          <span class="trend-best">最強 ${trends.strongestQuarter}</span>
          <span class="trend-worst">最弱 ${trends.weakestQuarter}</span>
        </span>
      </div>`
  }

  const headerCells = periods.map(p => `<th>${p}</th>`).join('')
  const rows = COLS.map(col => {
    const cells = quarterly.map(q => `<td>${q.metrics?.[col.key]?.value ?? 'N/A'}</td>`).join('')
    return `<tr><td>${col.label}</td>${cells}</tr>`
  }).join('')

  return `
    <div class="quarterly-wrap">
      <h4>季度比較</h4>
      ${trendMetaHtml}
      <table class="quarterly-table">
        <thead><tr><th></th>${headerCells}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
}

// ── Helpers ─────────────────────────────────────────────────────
function showLoading(on) {
  document.getElementById('loading').style.display = on ? 'block' : 'none'
  const btn = document.getElementById('submitBtn')
  btn.disabled  = on
  btn.innerHTML = on
    ? '<span class="btn-spinner"></span>分析中…'
    : '開始分析'
  if (on) document.getElementById('results').style.display = 'none'
}

function setError(msg) {
  const el = document.getElementById('errorBox')
  el.textContent   = msg
  el.style.display = msg ? 'block' : 'none'
}

// ── Price Chart ─────────────────────────────────────────────────
async function fetchAndRenderChart(ticker) {
  const section = document.getElementById('priceChartSection')
  section.style.display = 'block'
  const container = document.getElementById('priceChart')
  container.innerHTML = '<p style="color:#999;padding:1rem">載入股價資料中…</p>'

  try {
    const symbol = ticker + '.TW'
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=6mo`
    const res = await fetch(url)
    const json = await res.json()
    const result = json.chart?.result?.[0]
    if (!result) throw new Error('no data')

    const timestamps = result.timestamp
    const closes = result.indicators.quote[0].close

    const chartData = timestamps.map((t, i) => ({
      time: t,
      value: closes[i] ?? null
    })).filter(d => d.value !== null)

    container.innerHTML = ''
    const chart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: 260,
      layout: {
        background: { color: 'transparent' },
        textColor: '#888',
      },
      grid: {
        vertLines: { color: 'rgba(0,0,0,0.05)' },
        horzLines: { color: 'rgba(0,0,0,0.05)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
    })

    const lineSeries = chart.addLineSeries({
      color: '#2563eb',
      lineWidth: 2,
    })
    lineSeries.setData(chartData)
    chart.timeScale().fitContent()

    window.addEventListener('resize', () => {
      chart.applyOptions({ width: container.clientWidth })
    })
  } catch {
    container.innerHTML = '<p style="color:#999;padding:1rem">股價資料暫時無法載入</p>'
  }
}
