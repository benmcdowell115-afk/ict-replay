// ICT concept diagrams — precise custom SVG, no third-party charting library
// Each scenario maps to a hand-crafted diagram showing the exact ICT concept
import { useMemo } from 'react'
import type { Scenario } from '../data/scenarios'

// ── Layout ────────────────────────────────────────────────────────────────────
const VW = 560          // viewBox width
const VH = 280          // viewBox height
const CT = 18           // chart top y   (price = 100)
const CB = 254          // chart bottom y (price =   0)
const CR = 488          // right edge of chart (label area: 488–560)
const SP = 24           // px between candle centers
const BW = 10           // candle body half-width (body = 2*BW-1 px wide)

// price [0–100] → SVG y
const py = (p: number) => CB - p * (CB - CT) / 100
// candle index → SVG x (center)
const cx = (i: number) => 14 + i * SP

// ── Types ─────────────────────────────────────────────────────────────────────
interface CD { o: number; h: number; l: number; c: number }   // price units [0–100]

type Ann =
  | { k: 'zone';  p1: number; p2: number; xL?: number; xR?: number; col: string; op?: number }
  | { k: 'level'; p: number;  col: string; lbl: string; dash?: boolean; xL?: number }
  | { k: 'mark';  i: number;  pos: 'above'|'below'; txt: string; col: string; shape?: 'arrow'|'circle' }
  | { k: 'badge'; txt: string; col: string; x: number; y: number }

interface DC { candles: CD[]; di: number; before: Ann[]; after: Ann[] }

// ── CSS animations ────────────────────────────────────────────────────────────
const CSS = `
  @keyframes cdIn  { from{opacity:0} to{opacity:1} }
  @keyframes revIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse { 0%,100%{opacity:1;transform:translateY(0)} 50%{opacity:.2;transform:translateY(-3px)} }
`

// ── Primitives ────────────────────────────────────────────────────────────────
function Candle({ i, d, delay }: { i: number; d: CD; delay: number }) {
  const bull = d.c >= d.o
  const col  = bull ? '#34d399' : '#f87171'
  const bTop = py(Math.max(d.o, d.c))
  const bBot = py(Math.min(d.o, d.c))
  const bH   = Math.max(bBot - bTop, 1.5)
  const x    = cx(i)
  return (
    <g style={{ animation: `cdIn .12s ${delay.toFixed(2)}s both` }}>
      <line x1={x} y1={py(d.h)} x2={x} y2={py(d.l)} stroke={col} strokeWidth={1.5} strokeLinecap="round" />
      <rect x={x - BW + 1} y={bTop} width={(BW - 1) * 2} height={bH} fill={col} rx={.5} />
    </g>
  )
}

function ZoneEl({ a }: { a: Extract<Ann, { k: 'zone' }> }) {
  const xL = a.xL ?? 2
  const xR = a.xR ?? CR - 2
  return (
    <rect x={xL} y={py(a.p2)} width={xR - xL} height={py(a.p1) - py(a.p2)}
      fill={a.col} opacity={a.op ?? .15} rx={1} />
  )
}

function LevelEl({ a, delay = 0 }: { a: Extract<Ann, { k: 'level' }>; delay?: number }) {
  const y = py(a.p)
  const xL = a.xL ?? 2
  return (
    <g style={delay ? { animation: `revIn .3s ${delay}s both` } : undefined}>
      <line x1={xL} y1={y} x2={CR - 2} y2={y}
        stroke={a.col} strokeWidth={1} strokeDasharray={a.dash !== false ? '4 3' : undefined} />
      <text x={CR + 3} y={y + 4} fill={a.col} fontSize={9} fontFamily="monospace" fontWeight={700}
        style={{ userSelect: 'none' }}>{a.lbl}</text>
    </g>
  )
}

function MarkEl({ a, candles, delay = 0 }: {
  a: Extract<Ann, { k: 'mark' }>; candles: CD[]; delay?: number
}) {
  const d = candles[a.i]
  if (!d) return null
  const x    = cx(a.i)
  const isUp = a.pos === 'above'
  const py0  = isUp ? py(d.h) - 14 : py(d.l) + 14
  const pts  = isUp
    ? `${x},${py0 + 6} ${x - 4},${py0} ${x + 4},${py0}`
    : `${x},${py0 - 6} ${x - 4},${py0} ${x + 4},${py0}`
  return (
    <g style={delay ? { animation: `revIn .3s ${delay}s both` } : undefined}>
      {a.shape !== 'circle'
        ? <polygon points={pts} fill={a.col} />
        : <circle cx={x} cy={py0} r={4} fill={a.col} opacity={.9} />
      }
      <text x={x} y={isUp ? py0 - 3 : py0 + 11}
        fill={a.col} fontSize={8} fontFamily="monospace" fontWeight={700}
        textAnchor="middle" style={{ userSelect: 'none' }}>{a.txt}</text>
    </g>
  )
}

function DecisionPulse({ di, candles }: { di: number; candles: CD[] }) {
  const d = candles[di]
  if (!d) return null
  const x = cx(di)
  const y = py(d.h) - 20
  return (
    <g style={{ animation: 'pulse 1.4s ease-in-out infinite' }}>
      <polygon points={`${x},${y + 8} ${x - 5},${y} ${x + 5},${y}`} fill="#f59e0b" />
      <text x={x} y={y - 3} fill="#f59e0b" fontSize={7.5} fontFamily="monospace"
        fontWeight={700} textAnchor="middle">DECISION</text>
    </g>
  )
}

// ── Diagram data builders ─────────────────────────────────────────────────────

// Helpers
const zone = (p1: number, p2: number, col: string, op?: number, xL?: number, xR?: number): Ann =>
  ({ k: 'zone', p1, p2, col, op, xL, xR })
const level = (p: number, col: string, lbl: string, dash = true, xL?: number): Ann =>
  ({ k: 'level', p, col, lbl, dash, xL })
const mark = (i: number, pos: 'above' | 'below', txt: string, col: string, shape?: 'arrow' | 'circle'): Ann =>
  ({ k: 'mark', i, pos, txt, col, shape })

// ─── BULL FVG ─────────────────────────────────────────────────────────────────
// SSL sweep → uptrend → C1/C2(disp)/C3 → retrace into FVG → decision
function bullFVG(): DC {
  const SSL = 36; const C1H = 60; const C3L = 76; const BSL = 94
  const candles: CD[] = [
    // uptrend context
    {o:28,h:30,l:26,c:30}, {o:30,h:33,l:28,c:32}, {o:32,h:35,l:30,c:34},
    {o:34,h:36,l:32,c:35}, {o:35,h:37,l:33,c:36}, {o:36,h:38,l:34,c:37},
    // equal lows (3 touches of SSL=36)
    {o:37,h:39,l:SSL,c:38}, {o:38,h:40,l:SSL,c:39}, {o:39,h:41,l:SSL,c:40},
    // SSL sweep: wick to 28, closes back above SSL
    {o:40,h:41,l:28,c:40},
    // recovery
    {o:40,h:45,l:38,c:44}, {o:44,h:49,l:42,c:48}, {o:48,h:54,l:46,c:53},
    // C1: small bull, high = C1H
    {o:53,h:C1H,l:51,c:58},
    // C2: massive displacement
    {o:58,h:82,l:57,c:81},
    // C3: low = C3L (gap between C1H and C3L)
    {o:81,h:84,l:C3L,c:83},
    // retrace toward FVG
    {o:83,h:84,l:77,c:78}, {o:78,h:80,l:76,c:77},
    // DECISION: price at FVG top (C3L=76), wick inside zone
    {o:77,h:78,l:66,c:70},
    // after: bull continuation to BSL
    {o:70,h:77,l:68,c:77}, {o:77,h:85,l:75,c:85}, {o:85,h:BSL,l:83,c:BSL-1},
  ]
  const before: Ann[] = [
    level(SSL,  '#f87171', 'SSL'),
    zone(C1H, C3L, '#f59e0b', .10),
  ]
  const after: Ann[] = [
    level(SSL,  '#f87171', 'SSL'),
    level(C3L,  '#f59e0b', 'FVG TOP'),
    level(C1H,  '#f59e0b', 'FVG BOT'),
    level(BSL,  '#34d399', 'BSL TARGET'),
    zone(C1H, C3L, '#f59e0b', .20),
    mark(9,  'below', 'SSL SWEEP', '#f87171'),
    mark(13, 'below', 'C1', '#94a3b8', 'circle'),
    mark(14, 'below', 'DISP', '#f59e0b'),
    mark(15, 'above', 'C3', '#94a3b8', 'circle'),
    mark(18, 'above', 'DECISION', '#f59e0b'),
  ]
  return { candles, di: 18, before, after }
}

// ─── BEAR FVG ─────────────────────────────────────────────────────────────────
function bearFVG(): DC {
  const BSL = 68; const C1L = 42; const C3H = 56; const SSL = 10
  const candles: CD[] = [
    // downtrend context
    {o:74,h:76,l:72,c:72}, {o:72,h:74,l:70,c:70}, {o:70,h:72,l:68,c:68},
    {o:68,h:70,l:66,c:66}, {o:66,h:68,l:64,c:65}, {o:65,h:67,l:63,c:64},
    // equal highs (3 touches of BSL=68)
    {o:64,h:BSL,l:62,c:63}, {o:63,h:BSL,l:61,c:62}, {o:62,h:BSL,l:60,c:61},
    // BSL sweep: wick to 74, closes back below BSL
    {o:61,h:74,l:59,c:61},
    // recovery down
    {o:61,h:63,l:57,c:58}, {o:58,h:60,l:54,c:55}, {o:55,h:57,l:51,c:52},
    // C1: small bear, low = C1L
    {o:52,h:54,l:C1L,c:44},
    // C2: massive bear displacement
    {o:44,h:45,l:20,c:21},
    // C3: high = C3H (gap between C3H and C1L)
    {o:21,h:C3H,l:18,c:19},
    // pullback up into FVG
    {o:19,h:25,l:17,c:24}, {o:24,h:30,l:22,c:29},
    // DECISION: at FVG midpoint
    {o:29,h:36,l:27,c:32},
    // after: bear continuation
    {o:32,h:34,l:25,c:26}, {o:26,h:28,l:18,c:19}, {o:19,h:21,l:SSL,c:SSL+1},
  ]
  const before: Ann[] = [
    level(BSL, '#34d399', 'BSL'),
    zone(C1L, C3H, '#f59e0b', .10),
  ]
  const after: Ann[] = [
    level(BSL, '#34d399', 'BSL'),
    level(C1L, '#f59e0b', 'FVG BOT'),
    level(C3H, '#f59e0b', 'FVG TOP'),
    level(SSL, '#f87171', 'SSL TARGET'),
    zone(C1L, C3H, '#f59e0b', .20),
    mark(9,  'above', 'BSL SWEEP', '#34d399'),
    mark(13, 'above', 'C1', '#94a3b8', 'circle'),
    mark(14, 'above', 'DISP', '#f59e0b'),
    mark(15, 'below', 'C3', '#94a3b8', 'circle'),
    mark(18, 'below', 'DECISION', '#f59e0b'),
  ]
  return { candles, di: 18, before, after }
}

// ─── BEARISH OB / JUDAS SWING ─────────────────────────────────────────────────
function bearOBJudas(): DC {
  const BSL = 76; const OB_TOP = 72; const OB_BOT = 62; const SSL = 24
  const candles: CD[] = [
    // downtrend context
    {o:65,h:67,l:63,c:64}, {o:64,h:66,l:62,c:62}, {o:62,h:64,l:60,c:61},
    {o:61,h:63,l:59,c:60}, {o:60,h:62,l:58,c:59},
    // judas spike UP to BSL
    {o:59,h:60,l:57,c:60}, {o:60,h:65,l:58,c:65}, {o:65,h:BSL,l:63,c:74},
    // OB = last bull candle before reversal
    {o:74,h:OB_TOP,l:72,c:OB_TOP-1},
    // BSL sweep wick
    {o:OB_TOP-1,h:BSL+4,l:68,c:69},
    // big bear displacement
    {o:69,h:70,l:44,c:45},
    // drift lower
    {o:45,h:48,l:42,c:43}, {o:43,h:46,l:40,c:41},
    // retrace to OB
    {o:41,h:46,l:39,c:46}, {o:46,h:52,l:44,c:51},
    {o:51,h:58,l:49,c:57}, {o:57,h:64,l:55,c:63},
    // DECISION at OB midpoint
    {o:63,h:OB_TOP+1,l:61,c:OB_BOT+5},
    // after: bear continuation
    {o:OB_BOT+5,h:68,l:52,c:53}, {o:53,h:56,l:44,c:45},
    {o:45,h:48,l:36,c:37}, {o:37,h:40,l:SSL,c:SSL+2},
  ]
  const before: Ann[] = [
    level(BSL, '#34d399', 'BSL (Prior High)'),
    zone(OB_BOT, OB_TOP, '#60a5fa', .12),
  ]
  const after: Ann[] = [
    level(BSL,     '#34d399', 'BSL (Prior High)'),
    level(OB_TOP,  '#60a5fa', 'OB TOP'),
    level(OB_BOT,  '#60a5fa', 'OB BOT'),
    level(SSL,     '#f87171', 'SSL TARGET'),
    zone(OB_BOT, OB_TOP, '#60a5fa', .22),
    mark(7,  'above', 'JUDAS SPIKE', '#a78bfa'),
    mark(9,  'above', 'BSL SWEPT', '#34d399'),
    mark(8,  'above', 'OB', '#60a5fa', 'circle'),
    mark(10, 'above', 'DISP', '#f87171'),
    mark(17, 'above', 'DECISION', '#f59e0b'),
  ]
  return { candles, di: 17, before, after }
}

// ─── SSL SWEEP → REVERSAL ─────────────────────────────────────────────────────
function sslSweep(): DC {
  const SSL = 38; const FVG_TOP = 60; const FVG_BOT = 48; const BSL = 86
  const candles: CD[] = [
    // sideways with slight drift
    {o:52,h:55,l:49,c:53}, {o:53,h:56,l:50,c:54}, {o:54,h:56,l:51,c:53},
    {o:53,h:55,l:50,c:52}, {o:52,h:54,l:50,c:51},
    // 3 equal lows (SSL=38)
    {o:51,h:53,l:SSL,c:52}, {o:52,h:54,l:SSL,c:53}, {o:53,h:55,l:SSL,c:54},
    // BIG SSL sweep: wick to 28, closes at 52 (well above SSL)
    {o:54,h:55,l:28,c:52},
    // reversal impulse: C1/C2/C3 creating bull FVG
    {o:52,h:FVG_BOT,l:50,c:FVG_BOT-1},
    {o:FVG_BOT-1,h:68,l:FVG_BOT-2,c:67},
    {o:67,h:70,l:FVG_TOP,c:69},
    // minor pullback to FVG
    {o:69,h:70,l:61,c:62}, {o:62,h:64,l:59,c:60},
    // DECISION at FVG
    {o:60,h:62,l:52,c:56},
    // after: bull run
    {o:56,h:64,l:54,c:64}, {o:64,h:73,l:62,c:73},
    {o:73,h:81,l:71,c:81}, {o:81,h:BSL,l:79,c:BSL-1},
  ]
  const before: Ann[] = [
    level(SSL, '#f87171', 'SSL (Equal Lows)'),
    zone(FVG_BOT, FVG_TOP, '#f59e0b', .10),
  ]
  const after: Ann[] = [
    level(SSL,     '#f87171', 'SSL (Equal Lows)'),
    level(FVG_TOP, '#f59e0b', 'FVG TOP'),
    level(FVG_BOT, '#f59e0b', 'FVG BOT'),
    level(BSL,     '#34d399', 'BSL TARGET'),
    zone(FVG_BOT, FVG_TOP, '#f59e0b', .20),
    mark(8,  'below', 'SSL SWEEP', '#f87171'),
    mark(9,  'below', 'C1', '#94a3b8', 'circle'),
    mark(10, 'below', 'DISP', '#f59e0b'),
    mark(11, 'above', 'C3', '#94a3b8', 'circle'),
    mark(14, 'above', 'DECISION', '#f59e0b'),
  ]
  return { candles, di: 14, before, after }
}

// ─── BSL SWEEP → REVERSAL SHORT ───────────────────────────────────────────────
function bslSweep(): DC {
  const BSL = 68; const FVG_BOT = 44; const FVG_TOP = 56; const SSL = 16
  const candles: CD[] = [
    {o:52,h:54,l:49,c:53}, {o:53,h:55,l:50,c:54}, {o:54,h:56,l:51,c:55},
    {o:55,h:57,l:52,c:56}, {o:56,h:58,l:53,c:57},
    // 3 equal highs (BSL=68)
    {o:57,h:BSL,l:55,c:58}, {o:58,h:BSL,l:56,c:59}, {o:59,h:BSL,l:57,c:60},
    // BSL sweep: wick to 76, closes at 56 (below BSL)
    {o:60,h:76,l:58,c:56},
    // bear impulse: C1/C2/C3 bearish FVG
    {o:56,h:58,l:FVG_TOP,c:FVG_TOP+1},
    {o:FVG_TOP+1,h:FVG_TOP+2,l:34,c:35},
    {o:35,h:FVG_BOT,l:32,c:33},
    // pullback to FVG
    {o:33,h:40,l:31,c:39}, {o:39,h:46,l:37,c:45},
    // DECISION
    {o:45,h:52,l:43,c:47},
    // after: bear run
    {o:47,h:49,l:38,c:38}, {o:38,h:40,l:28,c:28},
    {o:28,h:30,l:18,c:18}, {o:18,h:20,l:SSL,c:SSL+2},
  ]
  const before: Ann[] = [
    level(BSL, '#34d399', 'BSL (Equal Highs)'),
    zone(FVG_BOT, FVG_TOP, '#f59e0b', .10),
  ]
  const after: Ann[] = [
    level(BSL,     '#34d399', 'BSL (Equal Highs)'),
    level(FVG_TOP, '#f59e0b', 'FVG TOP'),
    level(FVG_BOT, '#f59e0b', 'FVG BOT'),
    level(SSL,     '#f87171', 'SSL TARGET'),
    zone(FVG_BOT, FVG_TOP, '#f59e0b', .20),
    mark(8,  'above', 'BSL SWEEP', '#34d399'),
    mark(9,  'above', 'C1', '#94a3b8', 'circle'),
    mark(10, 'above', 'DISP', '#f59e0b'),
    mark(11, 'below', 'C3', '#94a3b8', 'circle'),
    mark(14, 'below', 'DECISION', '#f59e0b'),
  ]
  return { candles, di: 14, before, after }
}

// ─── CHoCH BULLISH ────────────────────────────────────────────────────────────
function chochBull(): DC {
  const SSL = 30; const CHOCH = 58; const FVG_BOT = 62; const FVG_TOP = 74; const BSL = 88
  const candles: CD[] = [
    // downtrend: lower highs, lower lows
    {o:72,h:74,l:68,c:69}, {o:69,h:70,l:64,c:65},
    {o:65,h:67,l:61,c:62}, {o:62,h:CHOCH+2,l:58,c:59},
    {o:59,h:60,l:55,c:56}, {o:56,h:57,l:52,c:53},
    {o:53,h:54,l:49,c:50}, {o:50,h:51,l:46,c:47},
    // consolidate near SSL
    {o:47,h:48,l:43,c:44}, {o:44,h:46,l:SSL+2,c:45},
    // SSL sweep
    {o:45,h:46,l:SSL-8,c:44},
    // CHoCH: close above last lower high (CHOCH=58)
    {o:44,h:52,l:42,c:51}, {o:51,h:60,l:49,c:60},
    // CHOCH BREAK bar
    {o:60,h:66,l:58,c:65},
    // FVG left by CHoCH impulse: C1=idx11, C2=12, C3=13
    // FVG zone: FVG_BOT to FVG_TOP
    // Retrace
    {o:65,h:67,l:63,c:64}, {o:64,h:65,l:62,c:63},
    // DECISION at FVG
    {o:63,h:65,l:68-6,c:66},
    // after: bull run
    {o:66,h:74,l:64,c:74}, {o:74,h:82,l:72,c:82}, {o:82,h:BSL,l:80,c:BSL-1},
  ]
  const before: Ann[] = [
    level(SSL,   '#f87171', 'SSL'),
    level(CHOCH, '#34d399', 'CHoCH Level', true),
    zone(FVG_BOT, FVG_TOP, '#f59e0b', .10),
  ]
  const after: Ann[] = [
    level(SSL,     '#f87171', 'SSL'),
    level(CHOCH,   '#34d399', 'CHoCH Level'),
    level(FVG_TOP, '#f59e0b', 'FVG TOP'),
    level(FVG_BOT, '#f59e0b', 'FVG BOT'),
    level(BSL,     '#34d399', 'BSL TARGET'),
    zone(FVG_BOT, FVG_TOP, '#f59e0b', .20),
    mark(10, 'below', 'SSL SWEEP', '#f87171'),
    mark(13, 'below', 'CHoCH BREAK', '#34d399'),
    mark(16, 'above', 'DECISION', '#f59e0b'),
  ]
  return { candles, di: 16, before, after }
}

// ─── AMD BULLISH ──────────────────────────────────────────────────────────────
function amdBull(): DC {
  const ASIA_L = 42; const ASIA_H = 62; const FVG_BOT = 68; const FVG_TOP = 78; const BSL = 92
  const candles: CD[] = [
    // ACCUMULATION: asia range (tight sideways)
    {o:50,h:ASIA_H,l:ASIA_L,c:52}, {o:52,h:ASIA_H,l:ASIA_L,c:54},
    {o:54,h:ASIA_H,l:ASIA_L,c:52}, {o:52,h:ASIA_H,l:ASIA_L,c:50},
    {o:50,h:ASIA_H,l:ASIA_L,c:52}, {o:52,h:ASIA_H,l:ASIA_L,c:54},
    {o:54,h:ASIA_H,l:ASIA_L,c:56}, {o:56,h:ASIA_H,l:ASIA_L,c:54},
    // MANIPULATION: spike below Asia low (SSL sweep)
    {o:54,h:55,l:28,c:52},
    // recovery back above Asia low
    {o:52,h:57,l:50,c:56}, {o:56,h:62,l:54,c:61},
    // DISTRIBUTION: big bull run, FVG created
    {o:61,h:70,l:59,c:70}, {o:70,h:76,l:68,c:75},
    // C1 = 12, C2 disp = 13, C3 = 14
    {o:75,h:FVG_BOT,l:73,c:FVG_BOT-1},
    {o:FVG_BOT-1,h:84,l:FVG_BOT-2,c:83},
    {o:83,h:85,l:FVG_TOP,c:84},
    // retrace to FVG
    {o:84,h:85,l:79,c:80}, {o:80,h:82,l:78,c:79},
    // DECISION
    {o:79,h:80,l:72,c:74},
    // after: bull run to BSL
    {o:74,h:80,l:72,c:80}, {o:80,h:88,l:78,c:88}, {o:88,h:BSL,l:86,c:BSL-1},
  ]
  const before: Ann[] = [
    level(ASIA_L, '#f87171', 'Asia Low (SSL)', true),
    level(ASIA_H, '#34d399', 'Asia High (BSL)', true),
    zone(FVG_BOT, FVG_TOP, '#f59e0b', .10),
  ]
  const after: Ann[] = [
    level(ASIA_L, '#f87171', 'Asia Low (SSL)'),
    level(ASIA_H, '#34d399', 'Asia High (BSL)'),
    level(FVG_TOP, '#f59e0b', 'FVG TOP'),
    level(FVG_BOT, '#f59e0b', 'FVG BOT'),
    level(BSL,     '#34d399', 'BSL TARGET'),
    zone(FVG_BOT, FVG_TOP, '#f59e0b', .20),
    mark(0,  'above', 'ACCUMULATION', '#94a3b8', 'circle'),
    mark(8,  'below', 'MANIPULATION', '#a78bfa'),
    mark(11, 'above', 'DISTRIBUTION', '#34d399', 'circle'),
    mark(18, 'above', 'DECISION', '#f59e0b'),
  ]
  return { candles, di: 18, before, after }
}

// ─── AMD BEARISH ──────────────────────────────────────────────────────────────
function amdBear(): DC {
  const ASIA_L = 42; const ASIA_H = 62; const FVG_TOP = 38; const FVG_BOT = 26; const SSL = 10
  const candles: CD[] = [
    {o:54,h:ASIA_H,l:ASIA_L,c:52}, {o:52,h:ASIA_H,l:ASIA_L,c:54},
    {o:54,h:ASIA_H,l:ASIA_L,c:52}, {o:52,h:ASIA_H,l:ASIA_L,c:50},
    {o:50,h:ASIA_H,l:ASIA_L,c:52}, {o:52,h:ASIA_H,l:ASIA_L,c:54},
    {o:54,h:ASIA_H,l:ASIA_L,c:52}, {o:52,h:ASIA_H,l:ASIA_L,c:50},
    // MANIPULATION: judas spike above Asia high
    {o:50,h:78,l:48,c:50},
    // recovery back below Asia high
    {o:50,h:56,l:48,c:49}, {o:49,h:52,l:44,c:45},
    // DISTRIBUTION: big bear, FVG created
    {o:45,h:47,l:34,c:35}, {o:35,h:37,l:28,c:29},
    // C1=12, C2=13, C3=14 bear FVG
    {o:29,h:31,l:FVG_BOT,c:28},
    {o:28,h:30,l:18,c:19},
    {o:19,h:FVG_TOP,l:17,c:18},
    // pullback
    {o:18,h:24,l:16,c:23}, {o:23,h:28,l:21,c:27},
    // DECISION
    {o:27,h:34,l:25,c:29},
    // after: bear continuation
    {o:29,h:31,l:20,c:20}, {o:20,h:22,l:12,c:12}, {o:12,h:14,l:SSL,c:SSL+2},
  ]
  const before: Ann[] = [
    level(ASIA_L, '#f87171', 'Asia Low (SSL)', true),
    level(ASIA_H, '#34d399', 'Asia High (BSL)', true),
    zone(FVG_BOT, FVG_TOP, '#f59e0b', .10),
  ]
  const after: Ann[] = [
    level(ASIA_L, '#f87171', 'Asia Low (SSL)'),
    level(ASIA_H, '#34d399', 'Asia High (BSL)'),
    level(FVG_TOP, '#f59e0b', 'FVG TOP'),
    level(FVG_BOT, '#f59e0b', 'FVG BOT'),
    level(SSL,     '#f87171', 'SSL TARGET'),
    zone(FVG_BOT, FVG_TOP, '#f59e0b', .20),
    mark(0,  'above', 'ACCUMULATION', '#94a3b8', 'circle'),
    mark(8,  'above', 'MANIPULATION', '#a78bfa'),
    mark(11, 'above', 'DISTRIBUTION', '#f87171', 'circle'),
    mark(18, 'below', 'DECISION', '#f59e0b'),
  ]
  return { candles, di: 18, before, after }
}

// ─── JUDAS SHORT ──────────────────────────────────────────────────────────────
function judasShort(): DC {
  const BSL = 74; const OB_TOP = 69; const OB_BOT = 61; const SSL = 24
  const candles: CD[] = [
    // downtrend showing bearish context
    {o:68,h:70,l:65,c:66}, {o:66,h:68,l:63,c:64}, {o:64,h:66,l:61,c:62},
    {o:62,h:64,l:59,c:60}, {o:60,h:62,l:57,c:58},
    // prior high visible
    {o:58,h:60,l:56,c:59}, {o:59,h:61,l:57,c:60},
    // NY OPEN: Judas spike UP to BSL
    {o:60,h:62,l:58,c:62}, {o:62,h:BSL,l:60,c:72},
    // OB = last bull candle
    {o:72,h:OB_TOP,l:70,c:OB_TOP-1},
    // BSL spike wick
    {o:OB_TOP-1,h:BSL+4,l:66,c:67},
    // BIG bear displacement
    {o:67,h:68,l:42,c:43},
    // drift lower
    {o:43,h:46,l:40,c:41},
    // rally back to OB
    {o:41,h:46,l:39,c:46}, {o:46,h:52,l:44,c:52},
    {o:52,h:58,l:50,c:57}, {o:57,h:63,l:55,c:62},
    // DECISION at OB
    {o:62,h:OB_TOP,l:60,c:(OB_TOP+OB_BOT)/2|0},
    // after: bear run to SSL
    {o:(OB_TOP+OB_BOT)/2|0,h:64,l:52,c:53},
    {o:53,h:56,l:42,c:43}, {o:43,h:46,l:34,c:35}, {o:35,h:38,l:SSL,c:SSL+2},
  ]
  const before: Ann[] = [
    level(BSL,    '#34d399', 'Prior Day High'),
    zone(OB_BOT, OB_TOP, '#60a5fa', .12),
  ]
  const after: Ann[] = [
    level(BSL,    '#34d399', 'BSL (Prior High)'),
    level(OB_TOP, '#60a5fa', 'OB TOP'),
    level(OB_BOT, '#60a5fa', 'OB BOT'),
    level(SSL,    '#f87171', 'SSL TARGET'),
    zone(OB_BOT, OB_TOP, '#60a5fa', .22),
    mark(8,  'above', 'JUDAS SPIKE', '#a78bfa'),
    mark(9,  'above', 'OB', '#60a5fa', 'circle'),
    mark(10, 'above', 'BSL SWEEP', '#34d399'),
    mark(11, 'above', 'DISP', '#f87171'),
    mark(17, 'above', 'DECISION', '#f59e0b'),
  ]
  return { candles, di: 17, before, after }
}

// ─── SILVER BULLET (1m — long or short) ─────────────────────────────────────
function silverBullet(dir: 'long' | 'short' = 'long'): DC {
  const bull = dir === 'long'
  if (bull) {
    const SSL = 40; const FVG_TOP = 62; const FVG_BOT = 52; const BSL = 80
    const candles: CD[] = [
      // time context (small choppy candles = 1m)
      {o:54,h:56,l:52,c:55},{o:55,h:57,l:53,c:54},{o:54,h:55,l:51,c:52},
      {o:52,h:53,l:49,c:50},{o:50,h:51,l:48,c:49},{o:49,h:51,l:48,c:50},
      {o:50,h:52,l:SSL+2,c:51},{o:51,h:53,l:SSL,c:52},{o:52,h:53,l:SSL,c:51},
      // SSL sweep
      {o:51,h:52,l:28,c:50},
      // 1m FVG: C1/C2/C3
      {o:50,h:FVG_BOT,l:48,c:FVG_BOT-1},
      {o:FVG_BOT-1,h:68,l:FVG_BOT-2,c:67},
      {o:67,h:69,l:FVG_TOP,c:68},
      // retrace
      {o:68,h:69,l:63,c:64},{o:64,h:65,l:62,c:63},
      // DECISION
      {o:63,h:64,l:55,c:58},
      // after
      {o:58,h:66,l:56,c:66},{o:66,h:74,l:64,c:74},{o:74,h:BSL,l:72,c:BSL-1},
    ]
    const before: Ann[] = [
      level(SSL, '#f87171', 'SSL'),
      zone(FVG_BOT, FVG_TOP, '#f59e0b', .10),
    ]
    const after: Ann[] = [
      level(SSL,     '#f87171', 'SSL'),
      level(FVG_TOP, '#f59e0b', 'FVG TOP'),
      level(FVG_BOT, '#f59e0b', 'FVG BOT'),
      level(BSL,     '#34d399', 'BSL TARGET'),
      zone(FVG_BOT, FVG_TOP, '#f59e0b', .20),
      mark(9,  'below', 'SSL SWEEP', '#f87171'),
      mark(10, 'below', 'C1', '#94a3b8', 'circle'),
      mark(11, 'below', 'DISP', '#f59e0b'),
      mark(12, 'above', 'C3', '#94a3b8', 'circle'),
      mark(15, 'above', 'DECISION', '#f59e0b'),
    ]
    return { candles, di: 15, before, after }
  } else {
    const BSL = 66; const FVG_BOT = 44; const FVG_TOP = 54; const SSL = 24
    const candles: CD[] = [
      {o:52,h:54,l:50,c:53},{o:53,h:55,l:51,c:54},{o:54,h:56,l:52,c:55},
      {o:55,h:57,l:53,c:56},{o:56,h:58,l:54,c:57},{o:57,h:59,l:55,c:58},
      {o:58,h:BSL,l:56,c:59},{o:59,h:BSL,l:57,c:60},{o:60,h:BSL,l:58,c:61},
      // BSL sweep
      {o:61,h:76,l:59,c:60},
      // 1m bearish FVG
      {o:60,h:62,l:FVG_TOP,c:FVG_TOP+1},
      {o:FVG_TOP+1,h:FVG_TOP+2,l:34,c:35},
      {o:35,h:FVG_BOT,l:32,c:33},
      // pullback
      {o:33,h:40,l:31,c:39},{o:39,h:46,l:37,c:45},
      // DECISION
      {o:45,h:52,l:43,c:47},
      // after
      {o:47,h:49,l:37,c:38},{o:38,h:40,l:28,c:28},{o:28,h:30,l:SSL,c:SSL+2},
    ]
    const before: Ann[] = [
      level(BSL, '#34d399', 'BSL'),
      zone(FVG_BOT, FVG_TOP, '#f59e0b', .10),
    ]
    const after: Ann[] = [
      level(BSL,     '#34d399', 'BSL'),
      level(FVG_TOP, '#f59e0b', 'FVG TOP'),
      level(FVG_BOT, '#f59e0b', 'FVG BOT'),
      level(SSL,     '#f87171', 'SSL TARGET'),
      zone(FVG_BOT, FVG_TOP, '#f59e0b', .20),
      mark(9,  'above', 'BSL SWEEP', '#34d399'),
      mark(10, 'above', 'C1', '#94a3b8', 'circle'),
      mark(11, 'above', 'DISP', '#f59e0b'),
      mark(12, 'below', 'C3', '#94a3b8', 'circle'),
      mark(15, 'below', 'DECISION', '#f59e0b'),
    ]
    return { candles, di: 15, before, after }
  }
}

// ─── BREAKER BLOCK ────────────────────────────────────────────────────────────
function breaker(dir: 'bear' | 'bull' = 'bear'): DC {
  const bull = dir === 'bull'
  if (!bull) {
    // Bear breaker: bullish OB flips to resistance after being violated
    const OB_TOP = 68; const OB_BOT = 58; const SSL = 22
    const candles: CD[] = [
      // OB held → rally (shows OB was bullish)
      {o:52,h:55,l:50,c:55},{o:55,h:60,l:53,c:60},{o:60,h:65,l:58,c:64},
      {o:64,h:OB_TOP+2,l:62,c:OB_TOP+1},
      // OB zone context candles
      {o:OB_TOP+1,h:OB_TOP+3,l:OB_BOT,c:OB_BOT+2},
      // original OB was here, shows bullish context
      {o:OB_BOT+2,h:OB_BOT+4,l:OB_BOT-2,c:OB_BOT+3},
      // VIOLATION: close below OB zone
      {o:OB_BOT+3,h:OB_BOT+5,l:42,c:44},
      {o:44,h:46,l:38,c:40},{o:40,h:42,l:34,c:36},
      // drift
      {o:36,h:38,l:32,c:34},{o:34,h:36,l:30,c:32},
      // rally back to breaker (former OB)
      {o:32,h:36,l:30,c:36},{o:36,h:42,l:34,c:42},
      {o:42,h:48,l:40,c:48},{o:48,h:54,l:46,c:54},
      {o:54,h:60,l:52,c:59},{o:59,h:64,l:57,c:63},
      // DECISION at breaker zone midpoint
      {o:63,h:OB_TOP,l:61,c:(OB_TOP+OB_BOT)/2|0},
      // after: bear
      {o:(OB_TOP+OB_BOT)/2|0,h:64,l:50,c:51},
      {o:51,h:54,l:40,c:41},{o:41,h:44,l:SSL,c:SSL+2},
    ]
    const before: Ann[] = [
      zone(OB_BOT, OB_TOP, '#60a5fa', .14),
    ]
    const after: Ann[] = [
      level(OB_TOP, '#60a5fa', 'BREAKER TOP'),
      level(OB_BOT, '#60a5fa', 'BREAKER BOT'),
      level(SSL,    '#f87171', 'SSL TARGET'),
      zone(OB_BOT, OB_TOP, '#60a5fa', .22),
      mark(5,  'below', 'BULL OB (was support)', '#60a5fa', 'circle'),
      mark(6,  'above', 'OB VIOLATED', '#f87171'),
      mark(17, 'above', 'DECISION', '#f59e0b'),
    ]
    return { candles, di: 17, before, after }
  } else {
    // Bull breaker: bearish OB flips to support
    const OB_TOP = 48; const OB_BOT = 38; const BSL = 82
    const candles: CD[] = [
      {o:54,h:56,l:52,c:52},{o:52,h:54,l:50,c:50},{o:50,h:52,l:48,c:48},
      {o:48,h:OB_TOP+2,l:OB_BOT,c:OB_BOT+2},
      {o:OB_BOT+2,h:OB_TOP,l:OB_BOT-2,c:OB_BOT-2},
      // VIOLATION: close above OB zone
      {o:OB_BOT-2,h:56,l:OB_TOP-2,c:56},
      {o:56,h:62,l:54,c:62},{o:62,h:68,l:60,c:68},
      {o:68,h:72,l:66,c:70},{o:70,h:74,l:68,c:72},
      // pullback to breaker
      {o:72,h:74,l:66,c:66},{o:66,h:68,l:60,c:60},
      {o:60,h:62,l:54,c:54},{o:54,h:56,l:46,c:47},
      {o:47,h:50,l:44,c:45},{o:45,h:48,l:42,c:44},
      // DECISION at breaker
      {o:44,h:48,l:42,c:(OB_TOP+OB_BOT)/2|0},
      // after: bull
      {o:(OB_TOP+OB_BOT)/2|0,h:54,l:42,c:54},
      {o:54,h:64,l:52,c:64},{o:64,h:74,l:62,c:74},{o:74,h:BSL,l:72,c:BSL-1},
    ]
    const before: Ann[] = [
      zone(OB_BOT, OB_TOP, '#60a5fa', .14),
    ]
    const after: Ann[] = [
      level(OB_TOP, '#60a5fa', 'BREAKER TOP'),
      level(OB_BOT, '#60a5fa', 'BREAKER BOT'),
      level(BSL,    '#34d399', 'BSL TARGET'),
      zone(OB_BOT, OB_TOP, '#60a5fa', .22),
      mark(3,  'above', 'BEAR OB (was resist)', '#60a5fa', 'circle'),
      mark(5,  'below', 'OB VIOLATED', '#34d399'),
      mark(16, 'below', 'DECISION', '#f59e0b'),
    ]
    return { candles, di: 16, before, after }
  }
}

// ─── OTE ZONE ────────────────────────────────────────────────────────────────
function oteZone(): DC {
  const SWL = 28; const SWH = 78; const BSL = 90
  const OTE_T = 58; const OTE_B = 48
  const EQUIL = 53  // 50% midpoint
  const candles: CD[] = [
    // establish swing low
    {o:30,h:32,l:SWL,c:32},
    // impulse up (establishes swing)
    {o:32,h:38,l:30,c:38},{o:38,h:46,l:36,c:45},{o:45,h:54,l:43,c:54},
    {o:54,h:63,l:52,c:62},{o:62,h:70,l:60,c:70},{o:70,h:SWH,l:68,c:SWH-1},
    // retracement into OTE zone
    {o:SWH-1,h:SWH,l:72,c:72},{o:72,h:74,l:68,c:69},{o:69,h:70,l:65,c:65},
    {o:65,h:66,l:61,c:62},{o:62,h:63,l:58,c:59},{o:59,h:60,l:55,c:56},
    {o:56,h:57,l:OTE_T+1,c:OTE_T-1},
    // in OTE zone
    {o:OTE_T-1,h:OTE_T,l:OTE_B+2,c:OTE_B+3},
    // DECISION
    {o:OTE_B+3,h:OTE_T+1,l:OTE_B,c:OTE_B+5},
    // after: bull delivery to BSL
    {o:OTE_B+5,h:58,l:OTE_B+3,c:58},{o:58,h:66,l:56,c:66},
    {o:66,h:74,l:64,c:74},{o:74,h:82,l:72,c:82},{o:82,h:BSL,l:80,c:BSL-1},
  ]
  const before: Ann[] = [
    level(SWH,   '#34d399', 'Swing High', false),
    level(SWL,   '#f87171', 'Swing Low', false),
    level(EQUIL, '#64748b', 'Equilibrium 50%', true),
    zone(OTE_B, OTE_T, '#a78bfa', .14),
  ]
  const after: Ann[] = [
    level(SWH,   '#34d399', 'Swing High', false),
    level(SWL,   '#f87171', 'Swing Low', false),
    level(EQUIL, '#64748b', 'Equilibrium'),
    level(OTE_T, '#a78bfa', 'OTE 62%'),
    level(OTE_B, '#a78bfa', 'OTE 79%'),
    level(BSL,   '#34d399', 'BSL TARGET'),
    zone(OTE_B, OTE_T, '#a78bfa', .20),
    mark(6,  'above', 'SWING HIGH', '#34d399', 'circle'),
    mark(15, 'below', 'DECISION', '#f59e0b'),
  ]
  return { candles, di: 15, before, after }
}

// ─── BOS RETEST ───────────────────────────────────────────────────────────────
function bosRetest(): DC {
  const BOS = 56; const OB_TOP = 60; const OB_BOT = 50; const SSL = 22
  const candles: CD[] = [
    // downtrend context
    {o:72,h:74,l:70,c:71},{o:71,h:73,l:69,c:70},{o:70,h:72,l:68,c:69},
    {o:69,h:71,l:67,c:68},{o:68,h:70,l:66,c:67},
    // prior swing low = BOS level
    {o:67,h:68,l:BOS,c:BOS+2},{o:BOS+2,h:BOS+4,l:BOS,c:BOS+3},
    // BOS: big displacement candle breaks below BOS level
    {o:BOS+3,h:BOS+4,l:34,c:36},
    // OB = last candle before displacement (idx 6)
    // drift lower
    {o:36,h:38,l:32,c:34},{o:34,h:36,l:30,c:32},
    // rally back to OB / BOS level
    {o:32,h:36,l:30,c:36},{o:36,h:42,l:34,c:42},
    {o:42,h:48,l:40,c:48},{o:48,h:54,l:46,c:53},
    {o:53,h:57,l:51,c:56},{o:56,h:60,l:54,c:58},
    // DECISION at OB
    {o:58,h:OB_TOP,l:56,c:(OB_TOP+OB_BOT)/2|0},
    // after: bear continuation
    {o:(OB_TOP+OB_BOT)/2|0,h:56,l:44,c:45},
    {o:45,h:48,l:36,c:37},{o:37,h:40,l:SSL,c:SSL+2},
  ]
  const before: Ann[] = [
    level(BOS,    '#a78bfa', 'BOS Level', true),
    zone(OB_BOT, OB_TOP, '#60a5fa', .12),
  ]
  const after: Ann[] = [
    level(BOS,    '#a78bfa', 'BOS Level'),
    level(OB_TOP, '#60a5fa', 'OB TOP'),
    level(OB_BOT, '#60a5fa', 'OB BOT'),
    level(SSL,    '#f87171', 'SSL TARGET'),
    zone(OB_BOT, OB_TOP, '#60a5fa', .22),
    mark(7,  'above', 'BOS', '#a78bfa'),
    mark(6,  'above', 'OB', '#60a5fa', 'circle'),
    mark(16, 'above', 'DECISION', '#f59e0b'),
  ]
  return { candles, di: 16, before, after }
}

// ─── OB IN DISCOUNT ───────────────────────────────────────────────────────────
function bullOBDiscount(): DC {
  const SWH = 84; const EQUIL = 52; const OB_TOP = 44; const OB_BOT = 34; const BSL = 90
  const candles: CD[] = [
    // establishes swing (1H style)
    {o:28,h:32,l:26,c:32},{o:32,h:38,l:30,c:38},{o:38,h:46,l:36,c:46},
    {o:46,h:56,l:44,c:56},{o:56,h:66,l:54,c:65},{o:65,h:SWH,l:63,c:SWH-1},
    // pullback from high
    {o:SWH-1,h:SWH,l:74,c:74},{o:74,h:76,l:66,c:67},{o:67,h:68,l:60,c:60},
    {o:60,h:61,l:54,c:54},{o:54,h:55,l:48,c:49},{o:49,h:50,l:44,c:44},
    // OB in discount (below equilibrium)
    {o:44,h:OB_TOP,l:OB_BOT,c:OB_BOT+2},
    // retrace to OB
    {o:OB_BOT+2,h:OB_BOT+4,l:OB_BOT,c:OB_BOT+3},
    // DECISION
    {o:OB_BOT+3,h:OB_TOP,l:OB_BOT-1,c:(OB_TOP+OB_BOT)/2|0},
    // after: bull
    {o:(OB_TOP+OB_BOT)/2|0,h:50,l:38,c:50},{o:50,h:60,l:48,c:60},
    {o:60,h:70,l:58,c:70},{o:70,h:80,l:68,c:80},{o:80,h:BSL,l:78,c:BSL-1},
  ]
  const before: Ann[] = [
    level(SWH,   '#34d399', 'Swing High', false),
    level(EQUIL, '#64748b', 'Equilibrium 50%', true),
    zone(OB_BOT, OB_TOP, '#60a5fa', .14),
  ]
  const after: Ann[] = [
    level(SWH,   '#34d399', 'Swing High (BSL)', false),
    level(EQUIL, '#64748b', 'Equilibrium (50%)'),
    level(OB_TOP, '#60a5fa', 'OB TOP (Discount)'),
    level(OB_BOT, '#60a5fa', 'OB BOT'),
    level(BSL,   '#34d399', 'BSL TARGET'),
    zone(OB_BOT, OB_TOP, '#60a5fa', .22),
    mark(12, 'above', 'OB in DISCOUNT', '#60a5fa', 'circle'),
    mark(14, 'below', 'DECISION', '#f59e0b'),
  ]
  return { candles, di: 14, before, after }
}

// ─── NO SETUP (FOMC / choppy) ─────────────────────────────────────────────────
function noSetup(): DC {
  const EQL = 62; const EQH = 72; const MID = 67
  // seeded pseudo-random for consistent but organic-looking chop
  const rng = (() => { let s=42; return () => { s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff } })()
  const candles: CD[] = Array.from({length:22}, (_) => {
    const o = MID + (rng()-0.5)*8
    const c = MID + (rng()-0.5)*8
    const h = Math.min(Math.max(o,c) + rng()*5, EQH+3)
    const l = Math.max(Math.min(o,c) - rng()*5, EQL-3)
    return {o,h,l,c}
  })
  const before: Ann[] = [
    level(EQH, '#34d399', 'Equal Highs (BSL)', true),
    level(EQL, '#f87171', 'Equal Lows (SSL)', true),
  ]
  const after: Ann[] = [
    level(EQH, '#34d399', 'Equal Highs (BSL)'),
    level(EQL, '#f87171', 'Equal Lows (SSL)'),
    mark(21, 'above', 'NO CLEAR SETUP', '#64748b', 'circle'),
  ]
  return { candles, di: 21, before, after }
}

// ── Scenario → diagram mapping ────────────────────────────────────────────────
function getDiagram(s: Scenario): DC {
  switch (s.id) {
    case 's01': return bullFVG()
    case 's02': return bearFVG()
    case 's03': return bearOBJudas()
    case 's04': return sslSweep()
    case 's05': return chochBull()
    case 's06': return amdBull()
    case 's07': return judasShort()
    case 's08': return silverBullet('long')
    case 's09': return breaker('bear')
    case 's10': return bullOBDiscount()
    case 's11': return noSetup()
    case 's12': return bearFVG()
    case 's13': return oteZone()
    case 's14': return bslSweep()
    case 's15': return silverBullet('short')
    case 's16': return bosRetest()
    case 's17': return bslSweep()
    case 's18': return amdBull()
    case 's19': return amdBear()
    case 's20': return silverBullet('short')
    case 's21': return bslSweep()
    case 's22': return bullFVG()
    case 's23': return sslSweep()
    case 's24': return breaker('bull')
    case 's25': return chochBull()
    case 's26': return silverBullet('long')
    case 's27': return bullFVG()
    case 's28': return bullFVG()
    case 's29': return sslSweep()
    case 's30': return noSetup()
    default:    return bullFVG()
  }
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props { mode: 'before' | 'after'; scenario: Scenario }

export function ConceptDiagram({ mode, scenario }: Props) {
  const { candles, di, before, after } = useMemo(() => getDiagram(scenario), [scenario.id])

  const showCount    = mode === 'before' ? di + 1 : candles.length
  const visCandles   = candles.slice(0, showCount)
  const annots       = mode === 'before' ? before : after

  const zones  = annots.filter(a => a.k === 'zone')  as Extract<Ann,{k:'zone'}>[]
  const levels = annots.filter(a => a.k === 'level') as Extract<Ann,{k:'level'}>[]
  const marks  = annots.filter(a => a.k === 'mark')  as Extract<Ann,{k:'mark'}>[]

  return (
    <div className="rounded-2xl border border-slate-800/50 overflow-hidden relative"
         style={{ background: '#06060e', height: 360 }}>

      {/* Info bar */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-500" style={{ fontFamily: 'monospace' }}>
          {scenario.instrument}
        </span>
        <span className="text-[9px] text-slate-700">{scenario.timeframe}</span>
      </div>

      {/* Badge */}
      {mode === 'before' && (
        <div className="absolute bottom-3 right-4 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 tracking-wide">DECISION POINT</span>
          </div>
        </div>
      )}
      {mode === 'after' && (
        <div className="absolute bottom-3 right-4 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 tracking-wide">CONCEPT REVEALED</span>
          </div>
        </div>
      )}

      {/* SVG */}
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet"
           style={{ width: '100%', height: '100%' }}>
        <defs><style>{CSS}</style></defs>

        {/* Background */}
        <rect width={VW} height={VH} fill="#06060e" />

        {/* Grid lines */}
        {[25, 50, 75].map(p => (
          <line key={p} x1={2} y1={py(p)} x2={CR - 2} y2={py(p)}
            stroke="#1e293b" strokeWidth={1} />
        ))}

        {/* Zones (behind candles) */}
        {zones.map((a, i) => <ZoneEl key={i} a={a} />)}

        {/* Candles */}
        {visCandles.map((d, i) => (
          <Candle key={i} i={i} d={d} delay={i * 0.018} />
        ))}

        {/* Decision pulse (before mode only) */}
        {mode === 'before' && <DecisionPulse di={di} candles={candles} />}

        {/* Level lines */}
        {levels.map((a, i) => (
          <LevelEl key={i} a={a} delay={mode === 'after' ? i * 0.07 : 0} />
        ))}

        {/* Marks */}
        {marks.map((a, i) => (
          <MarkEl key={i} a={a} candles={candles}
            delay={mode === 'after' ? 0.3 + i * 0.07 : 0} />
        ))}
      </svg>
    </div>
  )
}
