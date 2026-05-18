// Strips beforeCandles/afterCandles/beforeZones/afterZones/beforeLines/afterLines
// from scenarios.ts — these are replaced by fetched JSON chart data.
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir  = dirname(fileURLToPath(import.meta.url))
const target = join(__dir, '../src/data/scenarios.ts')
const lines  = readFileSync(target, 'utf8').split('\n')
const result = []
let skip  = false
let depth = 0

const FIELDS = /^\s+(before|after)(Candles|Zones|Lines)\s*:/

for (const line of lines) {
  if (!skip && FIELDS.test(line)) {
    skip  = true
    depth = (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length
    if (depth <= 0) { skip = false; depth = 0 } // single-line (shouldn't happen)
    continue
  }
  if (skip) {
    depth += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length
    if (depth <= 0) { skip = false; depth = 0 }
    continue
  }
  result.push(line)
}

writeFileSync(target, result.join('\n'))
console.log(`Done. Removed candle/zone/line blocks. Lines: ${lines.length} → ${result.length}`)
