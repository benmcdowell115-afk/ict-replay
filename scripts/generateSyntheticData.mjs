// Generates synthetic OHLCV + embedded ICT annotations for all 30 scenarios
// Run: node scripts/generateSyntheticData.mjs
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dir, '../public/chart-data')
mkdirSync(OUT, { recursive: true })

// ── PRNG ──────────────────────────────────────────────────────────────────────
function mkRng(seed) {
  let s = (seed >>> 0) || 1
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000 }
}

// ── helpers ───────────────────────────────────────────────────────────────────
const rd = (v, n) => parseFloat(v.toFixed(n))
const ts  = (base, i, step) => base + i * step

function mkBar(t, o, c, wU, wD, dec) {
  return {
    time:  t,
    open:  rd(o, dec),
    high:  rd(Math.max(o, c) + Math.max(0, wU), dec),
    low:   rd(Math.min(o, c) - Math.max(0, wD), dec),
    close: rd(c, dec),
  }
}

function driftBar(t, p, dir, vol, r, dec) {
  const body = vol * (0.15 + r() * 0.85)
  return mkBar(t, p, rd(p + dir * body, dec), vol * r() * 0.4, vol * r() * 0.4, dec)
}

function annotLine(price, color, title, style = 'dashed', axisLabel = true) {
  return { type: 'line', price, color, title, style, axisLabel }
}

function annotMark(barIndex, position, text, color, shape = 'circle', size = 1) {
  return { barIndex, position, text, color, shape, size }
}

// ── PATTERN: Bullish FVG ──────────────────────────────────────────────────────
// SSL sweep → C1/C2(disp)/C3 → retracement into FVG → decision → bull run
function bullFVG({ base, vol, dec, di, size, step, startTs, seed = 1 }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base - vol * 5, dec)
  const t = i => ts(startTs, i, step)

  // Uptrend context
  for (let i = 0; i < di - 18; i++) {
    const b = driftBar(t(i), price, 0.4, vol, r, dec)
    bars.push(b); price = b.close
  }
  // Equal lows (SSL)
  const sslLevel = rd(price - vol * 2, dec)
  for (let i = di - 18; i < di - 13; i++) {
    const o = rd(price + (r() - 0.5) * vol * 0.4, dec)
    const c = rd(price + (r() - 0.5) * vol * 0.4, dec)
    bars.push({ time: t(i), open: o, high: rd(Math.max(o,c) + vol*r()*0.3, dec), low: rd(sslLevel - vol*r()*0.15, dec), close: c })
    price = c
  }
  bA.push(annotLine(sslLevel, '#f87171', '', 'dashed', false))
  aA.push(annotLine(sslLevel, '#f87171', 'SSL', 'dashed'))

  // SSL sweep
  const sweepI = di - 13
  const sweepO = price, sweepC = rd(price + vol * 0.8, dec)
  bars.push({ time: t(sweepI), open: rd(sweepO,dec), high: rd(sweepC + vol*0.2,dec), low: rd(sslLevel - vol*2.5,dec), close: rd(sweepC,dec) })
  price = sweepC
  aM.push(annotMark(sweepI, 'below', 'SSL SWEEP', '#f87171', 'arrowUp', 2))

  // Recovery
  for (let i = di - 12; i < di - 5; i++) {
    const b = driftBar(t(i), price, 0.65, vol * 0.7, r, dec)
    bars.push(b); price = b.close
  }

  // C1 (small bull)
  const c1O = price, c1C = rd(price + vol*0.45, dec), c1H = rd(c1C + vol*0.35, dec)
  bars.push({ time: t(di-5), open: rd(c1O,dec), high: c1H, low: rd(c1O - vol*0.15,dec), close: rd(c1C,dec) })
  const fvgBot = c1H

  // C2 displacement
  const c2O = c1C, c2C = rd(c2O + vol * 4.0, dec)
  bars.push({ time: t(di-4), open: rd(c2O,dec), high: rd(c2C + vol*0.25,dec), low: rd(c2O - vol*0.2,dec), close: rd(c2C,dec) })

  // C3 — low > fvgBot (FVG gap)
  const fvgTop = rd(fvgBot + vol*1.8, dec)
  const c3C = rd(fvgTop + vol*0.6, dec)
  bars.push({ time: t(di-3), open: rd(fvgTop+vol*0.1,dec), high: rd(c3C+vol*0.25,dec), low: fvgTop, close: rd(c3C,dec) })
  price = c3C

  aM.push(annotMark(di-5, 'below', 'C1', '#94a3b8', 'circle'))
  aM.push(annotMark(di-4, 'below', 'DISP', '#f59e0b', 'arrowUp', 2))
  aM.push(annotMark(di-3, 'above', 'C3', '#94a3b8', 'circle'))
  bA.push(annotLine(fvgTop, '#f59e0b', '', 'dashed', false))
  bA.push(annotLine(fvgBot, '#f59e0b', '', 'dashed', false))
  aA.push(annotLine(fvgTop, '#f59e0b', 'FVG TOP', 'dashed'))
  aA.push(annotLine(fvgBot, '#f59e0b', 'FVG BOT', 'dashed'))

  // Retracement di-2, di-1
  const b1 = driftBar(t(di-2), price, -0.9, vol*1.1, r, dec); bars.push(b1); price = b1.close
  const ri1O = price, ri1C = rd(fvgTop + vol*0.35, dec)
  bars.push({ time: t(di-1), open: rd(ri1O,dec), high: rd(Math.max(ri1O,ri1C)+vol*0.2,dec), low: rd(Math.min(ri1O,ri1C)-vol*0.5,dec), close: rd(ri1C,dec) })
  price = ri1C

  // Decision bar — at FVG midpoint
  const fvgMid = rd((fvgTop + fvgBot) / 2, dec)
  const dO = price, dC = rd(fvgMid + vol*0.1, dec)
  bars.push({ time: t(di), open: rd(dO,dec), high: rd(Math.max(dO,dC)+vol*0.3,dec), low: rd(fvgBot - vol*0.15,dec), close: rd(dC,dec) })
  price = dC
  aM.push(annotMark(di, 'above', 'DECISION', '#f59e0b', 'arrowDown', 2))

  const bslTarget = rd(c2C + vol*3, dec)
  aA.push(annotLine(bslTarget, '#34d399', 'BSL TARGET', 'dashed'))

  // After: bull run
  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, 0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations: bA, afterAnnotations: aA, afterMarkers: aM }
}

// ── PATTERN: Bearish FVG ──────────────────────────────────────────────────────
function bearFVG({ base, vol, dec, di, size, step, startTs, seed = 2 }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base + vol * 5, dec)
  const t = i => ts(startTs, i, step)

  // Downtrend context
  for (let i = 0; i < di - 18; i++) {
    const b = driftBar(t(i), price, -0.35, vol, r, dec)
    bars.push(b); price = b.close
  }
  // Equal highs (BSL)
  const bslLevel = rd(price + vol * 2, dec)
  for (let i = di - 18; i < di - 13; i++) {
    const o = rd(price + (r()-0.5)*vol*0.4, dec)
    const c = rd(price + (r()-0.5)*vol*0.4, dec)
    bars.push({ time: t(i), open: o, high: rd(bslLevel + vol*r()*0.15, dec), low: rd(Math.min(o,c) - vol*r()*0.3, dec), close: c })
    price = c
  }
  bA.push(annotLine(bslLevel, '#34d399', '', 'dashed', false))
  aA.push(annotLine(bslLevel, '#34d399', 'BSL', 'dashed'))

  // BSL sweep
  const sweepI = di - 13
  const sweepO = price, sweepC = rd(price - vol*0.8, dec)
  bars.push({ time: t(sweepI), open: rd(sweepO,dec), high: rd(bslLevel + vol*2.5,dec), low: rd(sweepC - vol*0.2,dec), close: rd(sweepC,dec) })
  price = sweepC
  aM.push(annotMark(sweepI, 'above', 'BSL SWEEP', '#34d399', 'arrowDown', 2))

  // Recovery down
  for (let i = di - 12; i < di - 5; i++) {
    const b = driftBar(t(i), price, -0.65, vol*0.7, r, dec)
    bars.push(b); price = b.close
  }

  // C1 (small bear)
  const c1O = price, c1C = rd(price - vol*0.45, dec), c1L = rd(c1C - vol*0.35, dec)
  bars.push({ time: t(di-5), open: rd(c1O,dec), high: rd(c1O+vol*0.15,dec), low: c1L, close: rd(c1C,dec) })
  const fvgTop = c1L

  // C2 displacement bear
  const c2O = c1C, c2C = rd(c2O - vol*4.0, dec)
  bars.push({ time: t(di-4), open: rd(c2O,dec), high: rd(c2O+vol*0.2,dec), low: rd(c2C - vol*0.25,dec), close: rd(c2C,dec) })

  // C3 — high < fvgTop (FVG gap)
  const fvgBot = rd(fvgTop - vol*1.8, dec)
  const c3C = rd(fvgBot - vol*0.6, dec)
  bars.push({ time: t(di-3), open: rd(fvgBot-vol*0.1,dec), high: fvgBot, low: rd(c3C - vol*0.25,dec), close: rd(c3C,dec) })
  price = c3C

  aM.push(annotMark(di-5, 'above', 'C1', '#94a3b8', 'circle'))
  aM.push(annotMark(di-4, 'above', 'DISP', '#f59e0b', 'arrowDown', 2))
  aM.push(annotMark(di-3, 'below', 'C3', '#94a3b8', 'circle'))
  bA.push(annotLine(fvgTop, '#f59e0b', '', 'dashed', false))
  bA.push(annotLine(fvgBot, '#f59e0b', '', 'dashed', false))
  aA.push(annotLine(fvgTop, '#f59e0b', 'FVG TOP', 'dashed'))
  aA.push(annotLine(fvgBot, '#f59e0b', 'FVG BOT', 'dashed'))

  // Retracement up into FVG
  const b1 = driftBar(t(di-2), price, 0.9, vol*1.1, r, dec); bars.push(b1); price = b1.close
  const fvgMid = rd((fvgTop + fvgBot) / 2, dec)
  const ri1O = price, ri1C = rd(fvgBot - vol*0.35, dec)
  bars.push({ time: t(di-1), open: rd(ri1O,dec), high: rd(Math.max(ri1O,ri1C)+vol*0.5,dec), low: rd(Math.min(ri1O,ri1C)-vol*0.2,dec), close: rd(ri1C,dec) })
  price = ri1C

  const dO = price, dC = rd(fvgMid - vol*0.1, dec)
  bars.push({ time: t(di), open: rd(dO,dec), high: rd(fvgTop+vol*0.15,dec), low: rd(Math.min(dO,dC)-vol*0.3,dec), close: rd(dC,dec) })
  price = dC
  aM.push(annotMark(di, 'below', 'DECISION', '#f59e0b', 'arrowUp', 2))

  const sslTarget = rd(c2C - vol*3, dec)
  aA.push(annotLine(sslTarget, '#f87171', 'SSL TARGET', 'dashed'))

  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, -0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations: bA, afterAnnotations: aA, afterMarkers: aM }
}

// ── PATTERN: Bearish OB (Judas swing high → OB → short) ─────────────────────
function bearOB({ base, vol, dec, di, size, step, startTs, seed = 3 }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base - vol*3, dec)
  const t = i => ts(startTs, i, step)

  // Bearish downtrend context
  for (let i = 0; i < di - 16; i++) {
    const b = driftBar(t(i), price, -0.3, vol, r, dec)
    bars.push(b); price = b.close
  }
  // BSL forms (prior day high area)
  const bslLevel = rd(price + vol*3, dec)
  aA.push(annotLine(bslLevel, '#34d399', 'BSL (Prior Day High)', 'dashed'))
  bA.push(annotLine(bslLevel, '#34d399', '', 'dashed', false))

  // Judas spike — runs to BSL
  for (let i = di - 16; i < di - 10; i++) {
    const b = driftBar(t(i), price, 0.55, vol, r, dec)
    bars.push(b); price = b.close
  }
  aM.push(annotMark(di-10, 'above', 'JUDAS SPIKE', '#a78bfa', 'arrowUp', 2))

  // Last bull candle = OB (di-8)
  const obI = di - 8
  const obO = price, obC = rd(price + vol*0.6, dec)
  const obTop = rd(obC + vol*0.2, dec), obBot = rd(obO - vol*0.2, dec)
  bars.push({ time: t(obI), open: rd(obO,dec), high: obTop, low: rd(obO-vol*0.2,dec), close: rd(obC,dec) })
  price = obC

  // BSL sweep spike (di-7): wick above BSL
  bars.push({ time: t(di-7), open: rd(price,dec), high: rd(bslLevel + vol*1.5,dec), low: rd(price - vol*0.1,dec), close: rd(price - vol*0.4,dec) })
  price = rd(price - vol*0.4, dec)
  aM.push(annotMark(di-7, 'above', 'BSL SWEEP', '#34d399', 'arrowDown', 2))

  // Big bear displacement (di-6)
  const dispC = rd(price - vol*3.5, dec)
  bars.push({ time: t(di-6), open: rd(price,dec), high: rd(price+vol*0.2,dec), low: rd(dispC - vol*0.3,dec), close: rd(dispC,dec) })
  price = dispC

  // Drift down di-5..di-3
  for (let i = di-5; i < di-2; i++) {
    const b = driftBar(t(i), price, -0.4, vol*0.6, r, dec)
    bars.push(b); price = b.close
  }

  // Retracement toward OB di-2, di-1
  const b1 = driftBar(t(di-2), price, 0.8, vol*1.0, r, dec); bars.push(b1); price = b1.close
  const ri1C = rd(obBot + vol*0.4, dec)
  bars.push({ time: t(di-1), open: rd(price,dec), high: rd(Math.max(price,ri1C)+vol*0.4,dec), low: rd(Math.min(price,ri1C)-vol*0.2,dec), close: rd(ri1C,dec) })
  price = ri1C

  // Decision — at OB midpoint
  const obMid = rd((obTop + obBot) / 2, dec)
  bars.push({ time: t(di), open: rd(price,dec), high: rd(obTop + vol*0.15,dec), low: rd(Math.min(price,obMid)-vol*0.3,dec), close: rd(obMid,dec) })
  price = obMid
  aM.push(annotMark(di, 'above', 'DECISION', '#f59e0b', 'arrowDown', 2))

  bA.push(annotLine(obTop, '#60a5fa', '', 'dashed', false))
  bA.push(annotLine(obBot, '#60a5fa', '', 'dashed', false))
  aA.push(annotLine(obTop, '#60a5fa', 'OB TOP', 'dashed'))
  aA.push(annotLine(obBot, '#60a5fa', 'OB BOT', 'dashed'))
  aM.push(annotMark(obI, 'above', 'OB', '#60a5fa', 'circle'))

  const sslTarget = rd(dispC - vol*3, dec)
  aA.push(annotLine(sslTarget, '#f87171', 'SSL TARGET', 'dashed'))

  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, -0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations: bA, afterAnnotations: aA, afterMarkers: aM }
}

// ── PATTERN: SSL Sweep → Bullish Reversal ────────────────────────────────────
function sslSweep({ base, vol, dec, di, size, step, startTs, seed = 4 }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base + vol*2, dec)
  const t = i => ts(startTs, i, step)

  for (let i = 0; i < di - 20; i++) {
    const b = driftBar(t(i), price, 0.1, vol, r, dec)
    bars.push(b); price = b.close
  }
  // 3 x equal lows
  const sslLevel = rd(price - vol*2, dec)
  for (let k = 0; k < 3; k++) {
    for (let j = 0; j < 5; j++) {
      const i = di - 20 + k*5 + j
      const o = rd(price + (r()-0.5)*vol*0.5, dec)
      const c = rd(price + (r()-0.5)*vol*0.5, dec)
      bars.push({ time: t(i), open: o, high: rd(Math.max(o,c)+vol*r()*0.3,dec), low: rd(sslLevel - vol*r()*0.12, dec), close: c })
      price = c
    }
  }
  bA.push(annotLine(sslLevel, '#f87171', 'SSL (Equal Lows)', 'dashed'))
  aA.push(annotLine(sslLevel, '#f87171', 'SSL (Equal Lows)', 'dashed'))

  // SSL sweep
  const sweepI = di - 5
  bars.push({ time: t(sweepI), open: rd(price,dec), high: rd(price+vol*0.15,dec), low: rd(sslLevel - vol*3,dec), close: rd(price + vol*0.9,dec) })
  price = rd(price + vol*0.9, dec)
  aM.push(annotMark(sweepI, 'below', 'SSL SWEEP', '#f87171', 'arrowUp', 2))

  // Strong reversal candle
  const revI = di - 4
  const revC = rd(price + vol*2.5, dec)
  bars.push({ time: t(revI), open: rd(price,dec), high: rd(revC+vol*0.3,dec), low: rd(price-vol*0.2,dec), close: rd(revC,dec) })
  price = revC
  aM.push(annotMark(revI, 'below', 'REVERSAL', '#34d399', 'arrowUp', 2))

  // FVG from reversal — C1=sweepI, C2=revI, C3=di-3
  const fvgBot = rd(price + vol*0.5, dec) // simplify: use a visible FVG
  const fvgTop = rd(fvgBot + vol*1.4, dec)
  bars.push({ time: t(di-3), open: rd(fvgTop+vol*0.1,dec), high: rd(fvgTop+vol*0.8,dec), low: fvgTop, close: rd(fvgTop+vol*0.5,dec) })
  price = rd(fvgTop+vol*0.5, dec)

  bA.push(annotLine(fvgTop, '#f59e0b', '', 'dashed', false))
  bA.push(annotLine(fvgBot, '#f59e0b', '', 'dashed', false))
  aA.push(annotLine(fvgTop, '#f59e0b', 'FVG TOP', 'dashed'))
  aA.push(annotLine(fvgBot, '#f59e0b', 'FVG BOT', 'dashed'))

  // Small pullback to FVG
  const pb = driftBar(t(di-2), price, -0.7, vol*0.8, r, dec); bars.push(pb); price = pb.close
  const ri = rd(fvgTop + vol*0.2, dec)
  bars.push({ time: t(di-1), open: rd(price,dec), high: rd(Math.max(price,ri)+vol*0.3,dec), low: rd(fvgBot-vol*0.1,dec), close: rd(ri,dec) })
  price = ri

  bars.push({ time: t(di), open: rd(price,dec), high: rd(price+vol*0.5,dec), low: rd(fvgBot-vol*0.2,dec), close: rd(fvgBot+vol*0.4,dec) })
  price = rd(fvgBot+vol*0.4, dec)
  aM.push(annotMark(di, 'above', 'DECISION', '#f59e0b', 'arrowDown', 2))

  const bslTarget = rd(price + vol*6, dec)
  aA.push(annotLine(bslTarget, '#34d399', 'BSL TARGET', 'dashed'))

  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, 0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations: bA, afterAnnotations: aA, afterMarkers: aM }
}

// ── PATTERN: BSL Sweep → Bearish Reversal ────────────────────────────────────
function bslSweep({ base, vol, dec, di, size, step, startTs, seed = 5 }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base - vol*2, dec)
  const t = i => ts(startTs, i, step)

  for (let i = 0; i < di - 20; i++) {
    const b = driftBar(t(i), price, -0.1, vol, r, dec)
    bars.push(b); price = b.close
  }
  const bslLevel = rd(price + vol*2, dec)
  for (let k = 0; k < 3; k++) {
    for (let j = 0; j < 5; j++) {
      const i = di - 20 + k*5 + j
      const o = rd(price + (r()-0.5)*vol*0.5, dec)
      const c = rd(price + (r()-0.5)*vol*0.5, dec)
      bars.push({ time: t(i), open: o, high: rd(bslLevel + vol*r()*0.12, dec), low: rd(Math.min(o,c)-vol*r()*0.3,dec), close: c })
      price = c
    }
  }
  bA.push(annotLine(bslLevel, '#34d399', 'BSL (Equal Highs)', 'dashed'))
  aA.push(annotLine(bslLevel, '#34d399', 'BSL (Equal Highs)', 'dashed'))

  const sweepI = di - 5
  bars.push({ time: t(sweepI), open: rd(price,dec), high: rd(bslLevel + vol*3,dec), low: rd(price-vol*0.15,dec), close: rd(price - vol*0.9,dec) })
  price = rd(price - vol*0.9, dec)
  aM.push(annotMark(sweepI, 'above', 'BSL SWEEP', '#34d399', 'arrowDown', 2))

  const revI = di - 4
  const revC = rd(price - vol*2.5, dec)
  bars.push({ time: t(revI), open: rd(price,dec), high: rd(price+vol*0.2,dec), low: rd(revC-vol*0.3,dec), close: rd(revC,dec) })
  price = revC
  aM.push(annotMark(revI, 'above', 'REVERSAL', '#f87171', 'arrowDown', 2))

  const fvgTop = rd(price - vol*0.5, dec)
  const fvgBot = rd(fvgTop - vol*1.4, dec)
  bars.push({ time: t(di-3), open: rd(fvgBot-vol*0.1,dec), high: fvgBot, low: rd(fvgBot-vol*0.8,dec), close: rd(fvgBot-vol*0.5,dec) })
  price = rd(fvgBot-vol*0.5, dec)

  bA.push(annotLine(fvgTop, '#f59e0b', '', 'dashed', false))
  bA.push(annotLine(fvgBot, '#f59e0b', '', 'dashed', false))
  aA.push(annotLine(fvgTop, '#f59e0b', 'FVG TOP', 'dashed'))
  aA.push(annotLine(fvgBot, '#f59e0b', 'FVG BOT', 'dashed'))

  const pb = driftBar(t(di-2), price, 0.7, vol*0.8, r, dec); bars.push(pb); price = pb.close
  const ri = rd(fvgBot - vol*0.2, dec)
  bars.push({ time: t(di-1), open: rd(price,dec), high: rd(fvgTop+vol*0.1,dec), low: rd(Math.min(price,ri)-vol*0.3,dec), close: rd(ri,dec) })
  price = ri

  bars.push({ time: t(di), open: rd(price,dec), high: rd(fvgTop+vol*0.2,dec), low: rd(price-vol*0.5,dec), close: rd(fvgTop-vol*0.4,dec) })
  price = rd(fvgTop-vol*0.4, dec)
  aM.push(annotMark(di, 'below', 'DECISION', '#f59e0b', 'arrowUp', 2))

  const sslTarget = rd(price - vol*6, dec)
  aA.push(annotLine(sslTarget, '#f87171', 'SSL TARGET', 'dashed'))

  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, -0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations: bA, afterAnnotations: aA, afterMarkers: aM }
}

// ── PATTERN: CHoCH Bullish ────────────────────────────────────────────────────
// Bearish lower highs/lows → SSL sweep → CHoCH breaks last lower high
function chochBull({ base, vol, dec, di, size, step, startTs, seed = 5 }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base + vol*8, dec)
  const t = i => ts(startTs, i, step)

  // Downtrend: lower highs, lower lows
  const lhPrices = []
  for (let i = 0; i < di - 18; i++) {
    const b = driftBar(t(i), price, -0.35, vol, r, dec)
    bars.push(b); price = b.close
    if (i % 8 === 7) lhPrices.push({ i, price: b.high })
  }
  // Last lower high = CHoCH level
  const chochLevel = lhPrices.length > 0 ? rd(lhPrices[lhPrices.length-1].price, dec) : rd(price + vol*3, dec)
  const sslLevel = rd(price - vol*2, dec)

  bA.push(annotLine(sslLevel, '#f87171', 'SSL', 'dashed'))
  bA.push(annotLine(chochLevel, '#34d399', 'CHoCH Level', 'dashed'))
  aA.push(annotLine(sslLevel, '#f87171', 'SSL', 'dashed'))
  aA.push(annotLine(chochLevel, '#34d399', 'CHoCH Level', 'dashed'))

  // SSL sweep
  const sweepI = di - 13
  for (let i = sweepI - 5; i < sweepI; i++) {
    bars.push({ time: t(i), open: rd(price+(r()-0.5)*vol*0.3,dec), high: rd(price+vol*0.2,dec), low: rd(sslLevel-vol*0.1,dec), close: rd(price+(r()-0.5)*vol*0.3,dec) })
  }
  bars.push({ time: t(sweepI), open: rd(price,dec), high: rd(price+vol*0.2,dec), low: rd(sslLevel - vol*2.5,dec), close: rd(price + vol*0.8,dec) })
  price = rd(price + vol*0.8, dec)
  aM.push(annotMark(sweepI, 'below', 'SSL SWEEP', '#f87171', 'arrowUp', 2))

  // Rally — breaks CHoCH level
  for (let i = di-12; i < di-8; i++) {
    const b = driftBar(t(i), price, 0.7, vol, r, dec)
    bars.push(b); price = b.close
  }
  const chochBreakI = di - 8
  const chochC = rd(chochLevel + vol*0.9, dec)
  bars.push({ time: t(chochBreakI), open: rd(price,dec), high: rd(chochC+vol*0.3,dec), low: rd(price-vol*0.1,dec), close: rd(chochC,dec) })
  price = chochC
  aM.push(annotMark(chochBreakI, 'below', 'CHoCH BREAK', '#34d399', 'arrowUp', 2))

  // FVG from CHoCH impulse
  const fvgBot = rd(price - vol*2, dec)
  const fvgTop = rd(fvgBot + vol*1.5, dec)
  for (let i = di-7; i < di-3; i++) {
    const b = driftBar(t(i), price, 0.3, vol*0.5, r, dec)
    bars.push(b); price = b.close
  }
  bA.push(annotLine(fvgTop, '#f59e0b', '', 'dashed', false))
  bA.push(annotLine(fvgBot, '#f59e0b', '', 'dashed', false))
  aA.push(annotLine(fvgTop, '#f59e0b', 'FVG TOP', 'dashed'))
  aA.push(annotLine(fvgBot, '#f59e0b', 'FVG BOT', 'dashed'))

  // Pullback to FVG
  const pb = driftBar(t(di-2), price, -0.8, vol*1.0, r, dec); bars.push(pb); price = pb.close
  bars.push({ time: t(di-1), open: rd(price,dec), high: rd(price+vol*0.3,dec), low: rd(fvgBot-vol*0.1,dec), close: rd(fvgTop+vol*0.2,dec) })
  price = rd(fvgTop+vol*0.2, dec)

  bars.push({ time: t(di), open: rd(price,dec), high: rd(price+vol*0.4,dec), low: rd(fvgBot-vol*0.2,dec), close: rd(fvgBot+vol*0.6,dec) })
  price = rd(fvgBot+vol*0.6, dec)
  aM.push(annotMark(di, 'above', 'DECISION', '#f59e0b', 'arrowDown', 2))

  const bslTarget = rd(chochLevel + vol*5, dec)
  aA.push(annotLine(bslTarget, '#34d399', 'BSL TARGET', 'dashed'))

  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, 0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations: bA, afterAnnotations: aA, afterMarkers: aM }
}

// ── PATTERN: AMD Bullish ──────────────────────────────────────────────────────
function amdBull({ base, vol, dec, di, size, step, startTs, seed = 6 }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base, dec)
  const t = i => ts(startTs, i, step)

  // Accumulation (Asia range) — sideways
  const asiaLow = rd(price - vol*2, dec)
  const asiaHigh = rd(price + vol*2, dec)
  for (let i = 0; i < di - 20; i++) {
    const o = rd(price + (r()-0.5)*vol*1.2, dec)
    const c = rd(price + (r()-0.5)*vol*1.2, dec)
    bars.push({ time: t(i), open: o, high: rd(Math.min(Math.max(o,c)+vol*r()*0.4, asiaHigh+vol*0.2),dec), low: rd(Math.max(Math.min(o,c)-vol*r()*0.4, asiaLow-vol*0.2),dec), close: c })
    price = c
  }
  bA.push(annotLine(asiaLow, '#f87171', 'Asia Low (SSL)', 'dashed'))
  bA.push(annotLine(asiaHigh, '#34d399', 'Asia High (BSL)', 'dashed'))
  aA.push(annotLine(asiaLow, '#f87171', 'Asia Low (SSL)', 'dashed'))
  aA.push(annotLine(asiaHigh, '#34d399', 'Asia High (BSL)', 'dashed'))
  aM.push(annotMark(di-20, 'above', 'ACCUMULATION', '#94a3b8', 'circle'))

  // Manipulation: drop below Asia low (SSL sweep)
  const manI = di - 12
  for (let i = di-20; i < manI; i++) {
    const b = driftBar(t(i), price, -0.5, vol, r, dec)
    bars.push(b); price = b.close
  }
  bars.push({ time: t(manI), open: rd(price,dec), high: rd(price+vol*0.15,dec), low: rd(asiaLow - vol*2.5,dec), close: rd(price + vol*0.7,dec) })
  price = rd(price + vol*0.7, dec)
  aM.push(annotMark(manI, 'below', 'MANIPULATION', '#a78bfa', 'arrowUp', 2))

  // Distribution — big bull run
  for (let i = di-11; i < di-3; i++) {
    const b = driftBar(t(i), price, 0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  // FVG during distribution
  const fvgBot = rd(price - vol*3, dec)
  const fvgTop = rd(fvgBot + vol*1.5, dec)

  // Pullback to FVG
  const pb = driftBar(t(di-2), price, -0.8, vol*1.2, r, dec); bars.push(pb); price = pb.close
  bars.push({ time: t(di-1), open: rd(price,dec), high: rd(price+vol*0.3,dec), low: rd(fvgBot-vol*0.1,dec), close: rd(fvgTop+vol*0.2,dec) })
  price = rd(fvgTop+vol*0.2, dec)

  bars.push({ time: t(di), open: rd(price,dec), high: rd(price+vol*0.4,dec), low: rd(fvgBot-vol*0.2,dec), close: rd(fvgBot+vol*0.5,dec) })
  price = rd(fvgBot+vol*0.5, dec)
  aM.push(annotMark(di, 'above', 'DECISION', '#f59e0b', 'arrowDown', 2))

  bA.push(annotLine(fvgTop, '#f59e0b', '', 'dashed', false))
  bA.push(annotLine(fvgBot, '#f59e0b', '', 'dashed', false))
  aA.push(annotLine(fvgTop, '#f59e0b', 'FVG TOP', 'dashed'))
  aA.push(annotLine(fvgBot, '#f59e0b', 'FVG BOT', 'dashed'))
  aA.push(annotLine(asiaHigh, '#34d399', 'BSL TARGET', 'dashed'))

  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, 0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations: bA, afterAnnotations: aA, afterMarkers: aM }
}

// ── PATTERN: AMD Bearish ──────────────────────────────────────────────────────
function amdBear({ base, vol, dec, di, size, step, startTs, seed = 7 }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base, dec)
  const t = i => ts(startTs, i, step)

  const asiaLow = rd(price - vol*2, dec), asiaHigh = rd(price + vol*2, dec)
  for (let i = 0; i < di - 20; i++) {
    const o = rd(price + (r()-0.5)*vol*1.2, dec), c = rd(price + (r()-0.5)*vol*1.2, dec)
    bars.push({ time: t(i), open: o, high: rd(Math.min(Math.max(o,c)+vol*r()*0.4,asiaHigh+vol*0.2),dec), low: rd(Math.max(Math.min(o,c)-vol*r()*0.4,asiaLow-vol*0.2),dec), close: c })
    price = c
  }
  bA.push(annotLine(asiaHigh, '#34d399', 'Asia High (BSL)', 'dashed'))
  bA.push(annotLine(asiaLow,  '#f87171', 'Asia Low (SSL)', 'dashed'))
  aA.push(annotLine(asiaHigh, '#34d399', 'Asia High (BSL)', 'dashed'))
  aA.push(annotLine(asiaLow,  '#f87171', 'Asia Low (SSL)', 'dashed'))
  aM.push(annotMark(di-20, 'above', 'ACCUMULATION', '#94a3b8', 'circle'))

  // Judas spike above Asia high (manipulation)
  const manI = di - 12
  for (let i = di-20; i < manI; i++) {
    const b = driftBar(t(i), price, 0.5, vol, r, dec)
    bars.push(b); price = b.close
  }
  bars.push({ time: t(manI), open: rd(price,dec), high: rd(asiaHigh + vol*2.5,dec), low: rd(price-vol*0.15,dec), close: rd(price - vol*0.7,dec) })
  price = rd(price - vol*0.7, dec)
  aM.push(annotMark(manI, 'above', 'MANIPULATION', '#a78bfa', 'arrowDown', 2))

  // Distribution down
  for (let i = di-11; i < di-3; i++) {
    const b = driftBar(t(i), price, -0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  const fvgTop = rd(price + vol*3, dec), fvgBot = rd(fvgTop - vol*1.5, dec)
  const pb = driftBar(t(di-2), price, 0.8, vol*1.2, r, dec); bars.push(pb); price = pb.close
  bars.push({ time: t(di-1), open: rd(price,dec), high: rd(fvgTop+vol*0.1,dec), low: rd(Math.min(price,fvgBot)-vol*0.3,dec), close: rd(fvgBot-vol*0.2,dec) })
  price = rd(fvgBot-vol*0.2, dec)

  bars.push({ time: t(di), open: rd(price,dec), high: rd(fvgTop+vol*0.2,dec), low: rd(price-vol*0.4,dec), close: rd(fvgTop-vol*0.5,dec) })
  price = rd(fvgTop-vol*0.5, dec)
  aM.push(annotMark(di, 'below', 'DECISION', '#f59e0b', 'arrowUp', 2))

  bA.push(annotLine(fvgTop, '#f59e0b', '', 'dashed', false))
  bA.push(annotLine(fvgBot, '#f59e0b', '', 'dashed', false))
  aA.push(annotLine(fvgTop, '#f59e0b', 'FVG TOP', 'dashed'))
  aA.push(annotLine(fvgBot, '#f59e0b', 'FVG BOT', 'dashed'))
  aA.push(annotLine(asiaLow, '#f87171', 'SSL TARGET', 'dashed'))

  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, -0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations: bA, afterAnnotations: aA, afterMarkers: aM }
}

// ── PATTERN: Judas Short (BSL spike → OB → short) ────────────────────────────
function judasShort({ base, vol, dec, di, size, step, startTs, seed = 7 }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base, dec)
  const t = i => ts(startTs, i, step)

  for (let i = 0; i < di - 16; i++) {
    const b = driftBar(t(i), price, -0.2, vol, r, dec)
    bars.push(b); price = b.close
  }
  const bslLevel = rd(price + vol*4, dec)
  bA.push(annotLine(bslLevel, '#34d399', 'Prior High (BSL)', 'dashed'))
  aA.push(annotLine(bslLevel, '#34d399', 'Prior High (BSL)', 'dashed'))

  // Judas spike at open — runs to BSL
  const judasI = di - 10
  for (let i = di-16; i < judasI; i++) {
    const b = driftBar(t(i), price, 0.6, vol, r, dec)
    bars.push(b); price = b.close
  }
  // Sweep above BSL
  const spikeC = rd(price + vol*0.3, dec)
  bars.push({ time: t(judasI), open: rd(price,dec), high: rd(bslLevel + vol*1.8,dec), low: rd(price-vol*0.1,dec), close: rd(spikeC,dec) })
  price = spikeC
  aM.push(annotMark(judasI, 'above', 'JUDAS SPIKE', '#a78bfa', 'arrowDown', 2))

  // OB = last bull candle before reversal (di-9)
  const obI = di - 9
  const obO = price, obC = rd(price - vol*0.4, dec) // small bear or doji
  const obTop = rd(Math.max(obO,obC) + vol*0.2, dec), obBot = rd(Math.min(obO,obC) - vol*0.15, dec)
  bars.push({ time: t(obI), open: rd(obO,dec), high: obTop, low: obBot, close: rd(obC,dec) })
  price = obC

  // Big displacement bear (di-8)
  const dispC = rd(price - vol*3.5, dec)
  bars.push({ time: t(di-8), open: rd(price,dec), high: rd(price+vol*0.2,dec), low: rd(dispC-vol*0.3,dec), close: rd(dispC,dec) })
  price = dispC

  // Bearish FVG left
  const fvgTop = rd(obBot, dec), fvgBot = rd(fvgTop - vol*1.6, dec)
  bA.push(annotLine(obTop, '#60a5fa', '', 'dashed', false))
  bA.push(annotLine(obBot, '#60a5fa', '', 'dashed', false))
  aA.push(annotLine(obTop, '#60a5fa', 'OB TOP', 'dashed'))
  aA.push(annotLine(obBot, '#60a5fa', 'OB BOT', 'dashed'))
  aM.push(annotMark(obI, 'above', 'OB', '#60a5fa', 'circle'))

  // Drift down, then retrace up to OB
  for (let i = di-7; i < di-3; i++) {
    const b = driftBar(t(i), price, -0.3, vol*0.6, r, dec)
    bars.push(b); price = b.close
  }
  const pb = driftBar(t(di-2), price, 0.85, vol*1.1, r, dec); bars.push(pb); price = pb.close
  const ri = rd(obMid(obTop, obBot) + vol*0.2, dec)
  bars.push({ time: t(di-1), open: rd(price,dec), high: rd(obTop+vol*0.1,dec), low: rd(Math.min(price,ri)-vol*0.2,dec), close: rd(ri,dec) })
  price = ri

  const dC = rd(obMid(obTop, obBot), dec)
  bars.push({ time: t(di), open: rd(price,dec), high: rd(obTop+vol*0.15,dec), low: rd(Math.min(price,dC)-vol*0.3,dec), close: rd(dC,dec) })
  price = dC
  aM.push(annotMark(di, 'above', 'DECISION', '#f59e0b', 'arrowDown', 2))

  const sslTarget = rd(dispC - vol*3, dec)
  aA.push(annotLine(sslTarget, '#f87171', 'SSL TARGET', 'dashed'))

  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, -0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations: bA, afterAnnotations: aA, afterMarkers: aM }
}
const obMid = (top, bot) => rd((top + bot) / 2, 2)

// ── PATTERN: Silver Bullet (1m FVG after sweep in time window) ────────────────
function silverBullet({ base, vol, dec, di, size, step, startTs, seed = 8, dir = 'long' }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base + (dir === 'long' ? -vol*4 : vol*4), dec)
  const t = i => ts(startTs, i, step)
  const bull = dir === 'long'

  // Context — choppy, then directional
  for (let i = 0; i < di - 20; i++) {
    const b = driftBar(t(i), price, bull ? 0.1 : -0.1, vol, r, dec)
    bars.push(b); price = b.close
  }

  const sweepLevel = bull ? rd(price - vol*2, dec) : rd(price + vol*2, dec)
  bA.push(annotLine(sweepLevel, bull ? '#f87171' : '#34d399', bull ? 'SSL' : 'BSL', 'dashed'))
  aA.push(annotLine(sweepLevel, bull ? '#f87171' : '#34d399', bull ? 'SSL' : 'BSL', 'dashed'))

  // 5 bars consolidating near sweep level
  for (let i = di-20; i < di-14; i++) {
    const o = rd(price + (r()-0.5)*vol*0.5,dec), c = rd(price + (r()-0.5)*vol*0.5,dec)
    bars.push({ time:t(i), open:o, high:rd(Math.max(o,c)+vol*r()*0.3,dec), low:rd(bull ? sweepLevel-vol*r()*0.15 : Math.min(o,c)-vol*r()*0.3, dec), close:c })
    price = c
  }

  // Sweep
  const sweepI = di - 14
  if (bull) {
    bars.push({ time:t(sweepI), open:rd(price,dec), high:rd(price+vol*0.15,dec), low:rd(sweepLevel-vol*2,dec), close:rd(price+vol*0.9,dec) })
    price = rd(price+vol*0.9, dec)
    aM.push(annotMark(sweepI, 'below', 'SSL SWEEP', '#f87171', 'arrowUp', 2))
  } else {
    bars.push({ time:t(sweepI), open:rd(price,dec), high:rd(sweepLevel+vol*2,dec), low:rd(price-vol*0.15,dec), close:rd(price-vol*0.9,dec) })
    price = rd(price-vol*0.9, dec)
    aM.push(annotMark(sweepI, 'above', 'BSL SWEEP', '#34d399', 'arrowDown', 2))
  }

  // FVG — C1/C2/C3
  const c2mag = vol * 3.0
  if (bull) {
    const c1H = rd(price + vol*0.5, dec)
    bars.push({ time:t(di-13), open:rd(price,dec), high:c1H, low:rd(price-vol*0.1,dec), close:rd(price+vol*0.3,dec) })
    const c2C = rd(price + c2mag, dec)
    bars.push({ time:t(di-12), open:rd(price+vol*0.3,dec), high:rd(c2C+vol*0.2,dec), low:rd(price+vol*0.1,dec), close:rd(c2C,dec) })
    const fvgBot = c1H, fvgTop = rd(fvgBot + vol*1.4, dec), c3C = rd(fvgTop + vol*0.5, dec)
    bars.push({ time:t(di-11), open:rd(fvgTop+vol*0.1,dec), high:rd(c3C+vol*0.2,dec), low:fvgTop, close:rd(c3C,dec) })
    price = c3C
    bA.push(annotLine(fvgTop, '#f59e0b','','dashed',false)); bA.push(annotLine(fvgBot,'#f59e0b','','dashed',false))
    aA.push(annotLine(fvgTop,'#f59e0b','FVG TOP','dashed')); aA.push(annotLine(fvgBot,'#f59e0b','FVG BOT','dashed'))
    aM.push(annotMark(di-13,'below','C1','#94a3b8','circle')); aM.push(annotMark(di-12,'below','DISP','#f59e0b','arrowUp',2)); aM.push(annotMark(di-11,'above','C3','#94a3b8','circle'))

    // Retrace to FVG
    for (let i = di-10; i < di-2; i++) { const b = driftBar(t(i),price,bull?-0.6:0.6,vol*0.7,r,dec); bars.push(b); price = b.close }
    bars.push({ time:t(di-1), open:rd(price,dec), high:rd(price+vol*0.3,dec), low:rd(fvgBot-vol*0.1,dec), close:rd(fvgTop+vol*0.2,dec) })
    price = rd(fvgTop+vol*0.2,dec)
    bars.push({ time:t(di), open:rd(price,dec), high:rd(price+vol*0.4,dec), low:rd(fvgBot-vol*0.2,dec), close:rd(fvgBot+vol*0.5,dec) })
    price = rd(fvgBot+vol*0.5,dec)
    aA.push(annotLine(rd(c2C+vol*3,dec),'#34d399','BSL TARGET','dashed'))
  } else {
    const c1L = rd(price - vol*0.5, dec)
    bars.push({ time:t(di-13), open:rd(price,dec), high:rd(price+vol*0.1,dec), low:c1L, close:rd(price-vol*0.3,dec) })
    const c2C = rd(price - c2mag, dec)
    bars.push({ time:t(di-12), open:rd(price-vol*0.3,dec), high:rd(price-vol*0.1,dec), low:rd(c2C-vol*0.2,dec), close:rd(c2C,dec) })
    const fvgTop = c1L, fvgBot = rd(fvgTop - vol*1.4, dec), c3C = rd(fvgBot - vol*0.5, dec)
    bars.push({ time:t(di-11), open:rd(fvgBot-vol*0.1,dec), high:fvgBot, low:rd(c3C-vol*0.2,dec), close:rd(c3C,dec) })
    price = c3C
    bA.push(annotLine(fvgTop,'#f59e0b','','dashed',false)); bA.push(annotLine(fvgBot,'#f59e0b','','dashed',false))
    aA.push(annotLine(fvgTop,'#f59e0b','FVG TOP','dashed')); aA.push(annotLine(fvgBot,'#f59e0b','FVG BOT','dashed'))
    aM.push(annotMark(di-13,'above','C1','#94a3b8','circle')); aM.push(annotMark(di-12,'above','DISP','#f59e0b','arrowDown',2)); aM.push(annotMark(di-11,'below','C3','#94a3b8','circle'))
    for (let i = di-10; i < di-2; i++) { const b = driftBar(t(i),price,0.6,vol*0.7,r,dec); bars.push(b); price = b.close }
    bars.push({ time:t(di-1), open:rd(price,dec), high:rd(fvgTop+vol*0.1,dec), low:rd(Math.min(price,fvgBot)-vol*0.3,dec), close:rd(fvgBot-vol*0.2,dec) })
    price = rd(fvgBot-vol*0.2,dec)
    bars.push({ time:t(di), open:rd(price,dec), high:rd(fvgTop+vol*0.2,dec), low:rd(price-vol*0.4,dec), close:rd(fvgTop-vol*0.5,dec) })
    price = rd(fvgTop-vol*0.5,dec)
    aA.push(annotLine(rd(c2C-vol*3,dec),'#f87171','SSL TARGET','dashed'))
  }
  aM.push(annotMark(di, bull?'above':'below', 'DECISION', '#f59e0b', bull?'arrowDown':'arrowUp', 2))

  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, bull?0.75:-0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations:bA, afterAnnotations:aA, afterMarkers:aM }
}

// ── PATTERN: Breaker Block ────────────────────────────────────────────────────
// dir='bear': bull OB → violated → retest → short
// dir='bull': bear OB → violated → retest → long
function breaker({ base, vol, dec, di, size, step, startTs, seed = 9, dir = 'bear' }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base + (dir==='bear'?vol*3:-vol*3), dec)
  const t = i => ts(startTs, i, step)
  const bull = dir === 'bull'

  // Establish original OB direction then move
  for (let i = 0; i < di - 22; i++) {
    const b = driftBar(t(i), price, bull?-0.4:0.4, vol, r, dec)
    bars.push(b); price = b.close
  }

  // Original OB candle
  const obI = di - 22
  const obO = price
  const obC = rd(price + (bull?-vol:vol)*0.8, dec)
  const obTop = rd(Math.max(obO,obC)+vol*0.25, dec), obBot = rd(Math.min(obO,obC)-vol*0.25, dec)
  bars.push({ time:t(obI), open:rd(obO,dec), high:obTop, low:obBot, close:rd(obC,dec) })
  price = obC
  aA.push(annotLine(obTop, '#60a5fa', bull?'BREAKER TOP (was OB)':'BREAKER TOP (was OB)', 'dashed'))
  aA.push(annotLine(obBot, '#60a5fa', bull?'BREAKER BOT':'BREAKER BOT', 'dashed'))
  bA.push(annotLine(obTop,'#60a5fa','','dashed',false)); bA.push(annotLine(obBot,'#60a5fa','','dashed',false))

  // Big move in OB direction — then violation
  for (let i = di-21; i < di-14; i++) {
    const b = driftBar(t(i), price, bull?-0.7:0.7, vol, r, dec)
    bars.push(b); price = b.close
  }
  // VIOLATION: big candle through OB
  const vioI = di - 14
  const vioC = rd(price + (bull?vol:-vol)*4.5, dec)
  bars.push({ time:t(vioI), open:rd(price,dec), high:rd(Math.max(price,vioC)+vol*0.3,dec), low:rd(Math.min(price,vioC)-vol*0.3,dec), close:rd(vioC,dec) })
  price = vioC
  aM.push(annotMark(vioI, bull?'below':'above', 'OB VIOLATED', '#f87171', bull?'arrowUp':'arrowDown', 2))

  // Continue then retrace back to breaker zone
  for (let i = di-13; i < di-4; i++) {
    const b = driftBar(t(i), price, bull?0.3:-0.3, vol*0.6, r, dec)
    bars.push(b); price = b.close
  }
  const pbMid = rd((obTop+obBot)/2, dec)
  const pb1 = driftBar(t(di-3), price, bull?-0.8:0.8, vol*1.2, r, dec); bars.push(pb1); price = pb1.close
  const ri1 = rd(pbMid + (bull?vol:-vol)*0.3, dec)
  bars.push({ time:t(di-2), open:rd(price,dec), high:rd(Math.max(price,ri1)+vol*0.4,dec), low:rd(Math.min(price,ri1)-vol*0.4,dec), close:rd(ri1,dec) })
  price = ri1
  bars.push({ time:t(di-1), open:rd(price,dec), high:rd(Math.max(price,pbMid)+vol*0.3,dec), low:rd(Math.min(price,pbMid)-vol*0.3,dec), close:rd(pbMid+vol*0.1,dec) })
  price = rd(pbMid+vol*0.1, dec)

  bars.push({ time:t(di), open:rd(price,dec), high:rd(obTop+vol*0.15,dec), low:rd(obBot-vol*0.15,dec), close:rd(pbMid,dec) })
  price = pbMid
  aM.push(annotMark(di, bull?'below':'above', 'DECISION', '#f59e0b', bull?'arrowUp':'arrowDown', 2))
  aM.push(annotMark(obI, bull?'above':'below', bull?'BEAR OB (Flipped)':'BULL OB (Flipped)', '#60a5fa', 'circle'))

  const target = rd(price + (bull?vol:-vol)*5, dec)
  aA.push(annotLine(target, bull?'#34d399':'#f87171', bull?'BSL TARGET':'SSL TARGET', 'dashed'))

  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, bull?0.75:-0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations:bA, afterAnnotations:aA, afterMarkers:aM }
}

// ── PATTERN: OTE Retracement ──────────────────────────────────────────────────
function ote({ base, vol, dec, di, size, step, startTs, seed = 13, dir = 'bull' }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base + (dir==='bull'?-vol*6:vol*6), dec)
  const t = i => ts(startTs, i, step)
  const bull = dir === 'bull'

  // Swing low/high establishes
  for (let i = 0; i < di - 25; i++) {
    const b = driftBar(t(i), price, bull?0.3:-0.3, vol, r, dec)
    bars.push(b); price = b.close
  }
  const swingLow = rd(price - (bull?vol*3:0), dec)
  const swingHigh = rd(price + (bull?vol*8:vol*3), dec)
  // Mark swing with a rally then pullback
  if (bull) {
    for (let i = di-25; i < di-18; i++) {
      const b = driftBar(t(i), price, 0.8, vol, r, dec); bars.push(b); price = b.close
    }
  } else {
    for (let i = di-25; i < di-18; i++) {
      const b = driftBar(t(i), price, -0.8, vol, r, dec); bars.push(b); price = b.close
    }
  }
  const swingHighActual = rd(price, dec), swingLowActual = rd(base - vol*6, dec)
  const oteTop = rd(swingHighActual - (swingHighActual - swingLowActual) * 0.62, dec)
  const oteBot = rd(swingHighActual - (swingHighActual - swingLowActual) * 0.79, dec)
  const range = swingHighActual - swingLowActual
  const equil = rd(swingHighActual - range*0.5, dec)

  bA.push(annotLine(oteTop, '#a78bfa', '62% OTE Zone', 'dashed'))
  bA.push(annotLine(oteBot, '#a78bfa', '79% OTE Zone', 'dashed'))
  bA.push(annotLine(equil,  '#64748b', 'Equilibrium', 'dashed'))
  aA.push(annotLine(oteTop, '#a78bfa', 'OTE 62%', 'dashed'))
  aA.push(annotLine(oteBot, '#a78bfa', 'OTE 79%', 'dashed'))
  aA.push(annotLine(equil,  '#64748b', 'Equilibrium (50%)', 'dashed'))

  // Pullback into OTE
  for (let i = di-17; i < di-3; i++) {
    const b = driftBar(t(i), price, bull?-0.6:0.6, vol*0.8, r, dec)
    bars.push(b); price = b.close
  }
  const oteMid = rd((oteTop+oteBot)/2, dec)
  bars.push({ time:t(di-2), open:rd(price,dec), high:rd(Math.max(price,oteMid)+vol*0.3,dec), low:rd(Math.min(price,oteMid)-vol*0.3,dec), close:rd(oteBot+vol*0.3,dec) })
  price = rd(oteBot+vol*0.3, dec)
  bars.push({ time:t(di-1), open:rd(price,dec), high:rd(oteTop+vol*0.1,dec), low:rd(oteBot-vol*0.2,dec), close:rd(oteMid,dec) })
  price = oteMid
  bars.push({ time:t(di), open:rd(price,dec), high:rd(oteTop+vol*0.2,dec), low:rd(oteBot-vol*0.15,dec), close:rd(oteMid+vol*0.1,dec) })
  price = rd(oteMid+vol*0.1, dec)
  aM.push(annotMark(di, bull?'above':'below', 'DECISION', '#f59e0b', bull?'arrowDown':'arrowUp', 2))
  aA.push(annotLine(rd(swingHighActual+vol*2,dec), '#34d399', 'BSL TARGET', 'dashed'))

  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, bull?0.75:-0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations:bA, afterAnnotations:aA, afterMarkers:aM }
}

// ── PATTERN: BOS Retest (continuation short/long) ────────────────────────────
function bosRetest({ base, vol, dec, di, size, step, startTs, seed = 16, dir = 'bear' }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base + (dir==='bear'?vol*6:-vol*6), dec)
  const t = i => ts(startTs, i, step)
  const bull = dir === 'bull'

  for (let i = 0; i < di-20; i++) {
    const b = driftBar(t(i), price, bull?0.3:-0.3, vol, r, dec)
    bars.push(b); price = b.close
  }
  // Prior swing low = BOS level
  const bosLevel = rd(price + (bull?-vol*2:vol*2), dec)
  bA.push(annotLine(bosLevel, '#a78bfa', 'Prior Swing (BOS Level)', 'dashed'))
  aA.push(annotLine(bosLevel, '#a78bfa', 'BOS Level', 'dashed'))

  // BOS displacement
  const dispI = di-12
  for (let i = di-20; i < dispI; i++) {
    const b = driftBar(t(i), price, bull?0.5:-0.5, vol, r, dec); bars.push(b); price = b.close
  }
  const dispC = rd(price + (bull?vol*4:-vol*4), dec)
  bars.push({ time:t(dispI), open:rd(price,dec), high:rd(Math.max(price,dispC)+vol*0.3,dec), low:rd(Math.min(price,dispC)-vol*0.3,dec), close:rd(dispC,dec) })
  price = dispC
  aM.push(annotMark(dispI, bull?'below':'above', 'BOS', '#a78bfa', bull?'arrowUp':'arrowDown', 2))

  // OB = last candle before displacement
  const obTop = rd(Math.max(price-vol*4, price-vol*5) + vol*0.3, dec)
  const obBot = rd(obTop - vol*0.8, dec)
  bA.push(annotLine(obTop,'#60a5fa','','dashed',false)); bA.push(annotLine(obBot,'#60a5fa','','dashed',false))
  aA.push(annotLine(obTop,'#60a5fa','OB TOP','dashed')); aA.push(annotLine(obBot,'#60a5fa','OB BOT','dashed'))

  // Retrace to OB
  for (let i = di-11; i < di-3; i++) {
    const b = driftBar(t(i), price, bull?-0.5:0.5, vol*0.8, r, dec); bars.push(b); price = b.close
  }
  const obMidPrice = rd((obTop+obBot)/2, dec)
  bars.push({ time:t(di-2), open:rd(price,dec), high:rd(obTop+vol*0.2,dec), low:rd(obBot-vol*0.1,dec), close:rd(obMidPrice+vol*0.2,dec) })
  price = rd(obMidPrice+vol*0.2, dec)
  bars.push({ time:t(di-1), open:rd(price,dec), high:rd(obTop+vol*0.1,dec), low:rd(obBot,dec), close:rd(obMidPrice,dec) })
  price = obMidPrice
  bars.push({ time:t(di), open:rd(price,dec), high:rd(obTop+vol*0.15,dec), low:rd(obBot-vol*0.15,dec), close:rd(obMidPrice,dec) })
  price = obMidPrice
  aM.push(annotMark(di, bull?'below':'above', 'DECISION', '#f59e0b', bull?'arrowUp':'arrowDown', 2))

  const target = rd(dispC + (bull?vol*4:-vol*4), dec)
  aA.push(annotLine(target, bull?'#34d399':'#f87171', bull?'BSL TARGET':'SSL TARGET', 'dashed'))

  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, bull?0.75:-0.75, vol, r, dec)
    bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations:bA, afterAnnotations:aA, afterMarkers:aM }
}

// ── PATTERN: FOMC / No setup ──────────────────────────────────────────────────
function noSetup({ base, vol, dec, di, size, step, startTs, seed = 11 }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base, dec)
  const t = i => ts(startTs, i, step)

  const eqHigh = rd(base + vol*2.5, dec), eqLow = rd(base - vol*2.5, dec)
  bA.push(annotLine(eqHigh,'#34d399','Equal Highs (BSL)','dashed'))
  bA.push(annotLine(eqLow, '#f87171','Equal Lows (SSL)','dashed'))
  aA.push(annotLine(eqHigh,'#34d399','Equal Highs (BSL)','dashed'))
  aA.push(annotLine(eqLow, '#f87171','Equal Lows (SSL)','dashed'))

  for (let i = 0; i < size; i++) {
    const drift = Math.sin(i * 0.25) * 0.3 + (r()-0.5)*0.4
    const b = driftBar(t(i), price, drift, vol*0.8, r, dec)
    bars.push(b); price = rd(Math.max(Math.min(b.close, base+vol*3.5), base-vol*3.5), dec)
  }
  aM.push(annotMark(di, 'above', 'DECISION', '#f59e0b', 'arrowDown', 2))
  aM.push(annotMark(Math.floor(di*0.3), 'above', 'NO CLEAR SETUP', '#64748b', 'circle'))
  return { bars, beforeAnnotations:bA, afterAnnotations:aA, afterMarkers:aM }
}

// ── PATTERN: OB in Discount (P/D zone) ───────────────────────────────────────
function bullOBdiscount({ base, vol, dec, di, size, step, startTs, seed = 10 }) {
  const r = mkRng(seed)
  const bars = [], bA = [], aA = [], aM = []
  let price = rd(base - vol*8, dec)
  const t = i => ts(startTs, i, step)

  // Range swing: low → high established
  for (let i = 0; i < di-20; i++) {
    const b = driftBar(t(i), price, 0.5, vol, r, dec)
    bars.push(b); price = b.close
  }
  const swingLow = rd(base - vol*8, dec), swingHigh = rd(price, dec)
  const range = swingHigh - swingLow
  const equilib = rd(swingLow + range*0.5, dec)
  const discountLine = rd(swingLow + range*0.3, dec) // 30% = deep discount

  bA.push(annotLine(equilib,'#64748b','Equilibrium (50%)','dashed'))
  bA.push(annotLine(discountLine,'#60a5fa','Discount Zone','dashed'))
  aA.push(annotLine(equilib,'#64748b','Equilibrium (50%)','dashed'))
  aA.push(annotLine(discountLine,'#60a5fa','Discount Zone','dashed'))
  aA.push(annotLine(swingHigh,'#34d399','BSL (Premium Target)','dashed'))

  // Pullback from swing high into discount
  for (let i = di-20; i < di-6; i++) {
    const b = driftBar(t(i), price, -0.55, vol*0.8, r, dec); bars.push(b); price = b.close
  }

  // OB in discount — last bear candle before bull rejection
  const obI = di-6
  const obO = price, obC = rd(price - vol*0.5, dec)
  const obTop = rd(obO + vol*0.2, dec), obBot = rd(obC - vol*0.2, dec)
  bars.push({ time:t(obI), open:rd(obO,dec), high:obTop, low:obBot, close:rd(obC,dec) })
  price = obC
  bA.push(annotLine(obTop,'#60a5fa','','dashed',false)); bA.push(annotLine(obBot,'#60a5fa','','dashed',false))
  aA.push(annotLine(obTop,'#60a5fa','OB TOP (Discount)','dashed')); aA.push(annotLine(obBot,'#60a5fa','OB BOT','dashed'))
  aM.push(annotMark(obI,'above','OB (in Discount)','#60a5fa','circle'))

  // Drift to OB
  for (let i = di-5; i < di-1; i++) {
    const b = driftBar(t(i), price, -0.3, vol*0.5, r, dec); bars.push(b); price = b.close
  }
  const obMidP = rd((obTop+obBot)/2,dec)
  bars.push({ time:t(di-1), open:rd(price,dec), high:rd(obTop+vol*0.1,dec), low:rd(obBot-vol*0.1,dec), close:rd(obMidP,dec) })
  price = obMidP
  bars.push({ time:t(di), open:rd(price,dec), high:rd(obTop+vol*0.15,dec), low:rd(obBot-vol*0.15,dec), close:rd(obMidP,dec) })
  price = obMidP
  aM.push(annotMark(di,'above','DECISION','#f59e0b','arrowDown',2))

  for (let i = di+1; i < size; i++) {
    const b = driftBar(t(i), price, 0.8, vol, r, dec); bars.push(b); price = b.close
  }
  return { bars, beforeAnnotations:bA, afterAnnotations:aA, afterMarkers:aM }
}

// ── 30 SCENARIO DEFINITIONS ───────────────────────────────────────────────────
// startTs: Unix seconds. Use todays-ish dates spread across 2024-2025
const S = (y,mo,d,h,m=0) => Math.floor(new Date(`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00Z`).getTime()/1000)

const NQ  = { base:17500, vol:20, dec:2, symbol:'NQ' }
const ES  = { base:4850,  vol:6,  dec:2, symbol:'ES' }
const GOLD= { base:2020,  vol:10, dec:2, symbol:'XAU/USD' }
const GBP = { base:1.2720, vol:0.0014, dec:5, symbol:'GBP/USD' }

const TF15 = { step:900, di:80, size:120 }
const TF5  = { step:300, di:100, size:150 }
const TF1  = { step:60,  di:150, size:200 }
const TF1H = { step:3600, di:55, size:80 }

const CONFIGS = [
  // id,  pattern fn,                args                                                               interval  symbol  seed
  { id:'s01', fn:bullFVG,           p:{...NQ,...TF15, startTs:S(2024,9,16,19), seed:101} },
  { id:'s02', fn:bearFVG,           p:{...ES,...TF5,  startTs:S(2024,9,17,8),  seed:102} },
  { id:'s03', fn:bearOB,            p:{...NQ,...TF15, startTs:S(2024,9,23,19), seed:103} },
  { id:'s04', fn:sslSweep,          p:{...NQ,...TF15, startTs:S(2024,9,30,19), seed:104} },
  { id:'s05', fn:chochBull,         p:{...ES,...TF5,  startTs:S(2024,10,1,8),  seed:105} },
  { id:'s06', fn:amdBull,           p:{...NQ,...TF15, startTs:S(2024,10,7,14), seed:106} },
  { id:'s07', fn:judasShort,        p:{...NQ,...TF5,  startTs:S(2024,10,8,13), seed:107} },
  { id:'s08', fn:silverBullet,      p:{...ES,...TF1,  startTs:S(2024,10,9,13), seed:108, dir:'long'} },
  { id:'s09', fn:breaker,           p:{...NQ,...TF15, startTs:S(2024,10,14,19),seed:109, dir:'bear'} },
  { id:'s10', fn:bullOBdiscount,    p:{...GOLD,...TF1H,startTs:S(2024,9,10,9), seed:110} },
  { id:'s11', fn:noSetup,           p:{...NQ,...TF15, startTs:S(2024,10,21,19),seed:111} },
  { id:'s12', fn:bearFVG,           p:{...NQ,...TF5,  startTs:S(2024,10,22,13),seed:112, vol:22} },
  { id:'s13', fn:ote,               p:{...ES,...TF15, startTs:S(2024,10,28,14),seed:113, dir:'bull'} },
  { id:'s14', fn:bslSweep,          p:{...GOLD,...TF15,startTs:S(2024,11,4,3), seed:114} },
  { id:'s15', fn:silverBullet,      p:{...ES,...TF1,  startTs:S(2024,11,5,18), seed:115, dir:'short'} },
  { id:'s16', fn:bosRetest,         p:{...NQ,...TF5,  startTs:S(2024,11,11,13),seed:116, dir:'bear'} },
  { id:'s17', fn:bslSweep,          p:{...NQ,...TF15, startTs:S(2024,11,18,19),seed:117} },
  { id:'s18', fn:amdBull,           p:{...NQ,...TF15, startTs:S(2024,11,25,14),seed:118} },
  { id:'s19', fn:amdBear,           p:{...NQ,...TF15, startTs:S(2024,12,2,19), seed:119} },
  { id:'s20', fn:silverBullet,      p:{...ES,...TF1,  startTs:S(2024,12,3,13), seed:120, dir:'short'} },
  { id:'s21', fn:bslSweep,          p:{...NQ,...TF15, startTs:S(2024,12,9,19), seed:121} },
  { id:'s22', fn:bullFVG,           p:{...NQ,...TF15, startTs:S(2024,12,16,19),seed:122} },
  { id:'s23', fn:sslSweep,          p:{...NQ,...TF15, startTs:S(2024,12,17,3), seed:123} },
  { id:'s24', fn:breaker,           p:{...NQ,...TF15, startTs:S(2024,12,23,19),seed:124, dir:'bull'} },
  { id:'s25', fn:chochBull,         p:{...ES,...TF1H, startTs:S(2025,1,6,9),   seed:125} },
  { id:'s26', fn:silverBullet,      p:{...GBP,...TF1, startTs:S(2025,1,7,1),   seed:126, dir:'long'} },
  { id:'s27', fn:bullFVG,           p:{...NQ,...TF15, startTs:S(2025,1,13,19), seed:127, vol:22} },
  { id:'s28', fn:bullFVG,           p:{...NQ,...TF15, startTs:S(2025,1,20,19), seed:128} },
  { id:'s29', fn:sslSweep,          p:{...NQ,...TF15, startTs:S(2025,1,21,19), seed:129} },
  { id:'s30', fn:noSetup,           p:{...ES,...TF15, startTs:S(2025,1,27,14), seed:130} },
]

// ── interval label ─────────────────────────────────────────────────────────────
function intervalLabel(step) {
  if (step === 60)   return '1min'
  if (step === 300)  return '5min'
  if (step === 900)  return '15min'
  if (step === 3600) return '1h'
  return `${step}s`
}

// ── Generate ──────────────────────────────────────────────────────────────────
let ok = 0
for (const cfg of CONFIGS) {
  try {
    const result = cfg.fn(cfg.p)
    const out = {
      id:          cfg.id,
      symbol:      cfg.p.symbol,
      interval:    intervalLabel(cfg.p.step),
      decisionIndex: cfg.p.di,
      bars:        result.bars,
      beforeAnnotations: result.beforeAnnotations,
      afterAnnotations:  result.afterAnnotations,
      afterMarkers:      result.afterMarkers,
    }
    writeFileSync(join(OUT, `${cfg.id}.json`), JSON.stringify(out))
    console.log(`✓ ${cfg.id}  ${cfg.p.symbol} ${intervalLabel(cfg.p.step)}  ${result.bars.length} bars`)
    ok++
  } catch (e) {
    console.error(`✗ ${cfg.id}: ${e.message}`)
    console.error(e.stack)
  }
}
console.log(`\nDone: ${ok}/30`)
