// Fetches real OHLCV data from Twelve Data for all 30 ICT Replay scenarios.
// Run once: node scripts/fetchChartData.mjs
// Output: public/chart-data/s01.json ... s30.json

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT   = join(__dir, '../public/chart-data')
const KEY   = '15109472f1454236874033eb5ef3c785'
const BASE  = 'https://api.twelvedata.com/time_series'

// Each scenario: symbol, interval, start_date (UTC), outputsize, decisionIndex
// decisionIndex = how many bars = the "before" cutoff; remaining bars = the "after" reveal
const SCENARIOS = [
  { id:'s01', symbol:'EUR/USD', interval:'15min', start:'2024-01-09 08:00:00', size:120, di:80 },
  { id:'s02', symbol:'GBP/USD', interval:'5min',  start:'2024-01-10 13:30:00', size:150, di:100 },
  { id:'s03', symbol:'EUR/USD', interval:'15min', start:'2024-01-11 08:00:00', size:120, di:80 },
  { id:'s04', symbol:'USD/JPY', interval:'15min', start:'2024-01-12 08:00:00', size:120, di:80 },
  { id:'s05', symbol:'EUR/USD', interval:'5min',  start:'2024-01-16 06:00:00', size:150, di:100 },
  { id:'s06', symbol:'GBP/JPY', interval:'15min', start:'2024-01-17 08:00:00', size:120, di:80 },
  { id:'s07', symbol:'EUR/USD', interval:'5min',  start:'2024-01-18 13:30:00', size:150, di:100 },
  { id:'s08', symbol:'GBP/USD', interval:'1min',  start:'2024-01-19 14:00:00', size:200, di:150 },
  { id:'s09', symbol:'EUR/USD', interval:'15min', start:'2024-01-22 08:00:00', size:120, di:80 },
  { id:'s10', symbol:'XAU/USD', interval:'1h',    start:'2024-01-23 00:00:00', size:80,  di:55 },
  { id:'s11', symbol:'EUR/USD', interval:'15min', start:'2024-01-31 08:00:00', size:120, di:80 },
  { id:'s12', symbol:'GBP/USD', interval:'5min',  start:'2024-02-01 14:00:00', size:150, di:100 },
  { id:'s13', symbol:'EUR/USD', interval:'15min', start:'2024-02-05 06:00:00', size:120, di:80 },
  { id:'s14', symbol:'XAU/USD', interval:'15min', start:'2024-02-06 06:00:00', size:120, di:80 },
  { id:'s15', symbol:'GBP/USD', interval:'1min',  start:'2024-02-07 18:00:00', size:200, di:150 },
  { id:'s16', symbol:'EUR/USD', interval:'5min',  start:'2024-02-08 13:30:00', size:150, di:100 },
  { id:'s17', symbol:'GBP/USD', interval:'15min', start:'2024-02-09 08:00:00', size:120, di:80 },
  { id:'s18', symbol:'EUR/USD', interval:'15min', start:'2024-02-12 08:00:00', size:120, di:80 },
  { id:'s19', symbol:'GBP/JPY', interval:'15min', start:'2024-02-13 08:00:00', size:120, di:80 },
  { id:'s20', symbol:'EUR/USD', interval:'1min',  start:'2024-02-14 14:30:00', size:200, di:150 },
  { id:'s21', symbol:'GBP/USD', interval:'5min',  start:'2024-02-15 13:30:00', size:150, di:100 },
  { id:'s22', symbol:'EUR/USD', interval:'15min', start:'2024-02-16 08:00:00', size:120, di:80 },
  { id:'s23', symbol:'XAG/USD', interval:'15min', start:'2024-02-20 06:00:00', size:120, di:80 },
  { id:'s24', symbol:'GBP/USD', interval:'15min', start:'2024-02-21 08:00:00', size:120, di:80 },
  { id:'s25', symbol:'EUR/USD', interval:'1h',    start:'2024-02-22 00:00:00', size:80,  di:55 },
  { id:'s26', symbol:'XAU/USD', interval:'1min',  start:'2024-02-23 06:30:00', size:200, di:150 },
  { id:'s27', symbol:'EUR/USD', interval:'15min', start:'2024-02-26 08:00:00', size:120, di:80 },
  { id:'s28', symbol:'GBP/USD', interval:'5min',  start:'2024-02-27 13:30:00', size:150, di:100 },
  { id:'s29', symbol:'EUR/USD', interval:'15min', start:'2024-02-28 08:00:00', size:120, di:80 },
  { id:'s30', symbol:'GBP/USD', interval:'15min', start:'2024-02-29 08:00:00', size:120, di:80 },
]

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchOne(s) {
  const url = `${BASE}?symbol=${encodeURIComponent(s.symbol)}&interval=${s.interval}` +
    `&start_date=${encodeURIComponent(s.start)}&outputsize=${s.size}` +
    `&apikey=${KEY}&timezone=UTC&format=JSON`

  const res  = await fetch(url)
  const data = await res.json()

  if (data.status === 'error') throw new Error(data.message)
  if (!Array.isArray(data.values) || data.values.length === 0) throw new Error('no data returned')

  const bars = data.values.reverse().map(v => ({
    time:  Math.floor(new Date(v.datetime + 'Z').getTime() / 1000),
    open:  parseFloat(v.open),
    high:  parseFloat(v.high),
    low:   parseFloat(v.low),
    close: parseFloat(v.close),
  }))

  return { id: s.id, symbol: s.symbol, interval: s.interval, decisionIndex: s.di, bars }
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  let ok = 0, fail = 0

  for (let i = 0; i < SCENARIOS.length; i++) {
    const s = SCENARIOS[i]
    try {
      process.stdout.write(`[${i+1}/30] ${s.id} ${s.symbol} ${s.interval} ... `)
      const data = await fetchOne(s)
      writeFileSync(join(OUT, `${s.id}.json`), JSON.stringify(data))
      console.log(`✓ ${data.bars.length} bars`)
      ok++
    } catch (e) {
      console.log(`✗ ${e.message}`)
      fail++
    }
    if (i < SCENARIOS.length - 1) await sleep(8000)
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`)
}

main()
