# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**LNPRJ06 — 台股財報分析**
Cloudflare Workers app：用戶上傳財報 PDF + 輸入股票代碼，透過 Claude API 分析財務數據並顯示結果。

## Commands

```bash
npm install          # 安裝依賴
npm run dev          # 本地開發（wrangler dev，http://localhost:8787）
npm run deploy       # 部署到 Cloudflare Workers
npm run type-check   # TypeScript 型別檢查

# 設定 API key（只需執行一次）
wrangler secret put ANTHROPIC_API_KEY
```

## Architecture

```
src/
├── index.ts              # Hono app entry；路由：POST /api/analyze, GET /api/health, GET *（靜態）
├── handlers/analyze.ts   # 解析 multipart form、驗證、呼叫 claude service
├── services/claude.ts    # Anthropic SDK 整合；PDF 以 base64 document 形式送入 claude-sonnet-4-6
└── prompts/financial.ts  # System prompt + JSON 格式指令

public/                   # 靜態前端，由 Workers ASSETS binding 服務
├── index.html
├── css/style.css         # 深色主題，CSS 變數
└── js/app.js             # 表單處理、drag-and-drop、結果渲染
```

**Request flow：**
1. 前端 POST `/api/analyze`（multipart：`stockCode` + `pdf`）
2. Worker 將 PDF ArrayBuffer → base64
3. 送入 Claude API（`type: "document"` content block）
4. Claude 回傳 JSON，Worker 解析後轉發前端
5. 前端渲染 metrics cards、highlights/risks、outlook、rating badge

**Key constraint：** PDF 直接以 base64 送 Claude，不使用 pdf-parse（Workers 不支援 Node.js fs）。

## Environment

- `ANTHROPIC_API_KEY` — Wrangler secret（必填）
- 靜態資料 PDF 放在 `tsmc/`（本機測試用，不部署）

## Deployment

```bash
wrangler deploy
# Worker 名稱：stock-analyzer → stock-analyzer.neillin-lct.workers.dev
# 部署後記得更新主 repo 的 projects.json 加入此專案
```
