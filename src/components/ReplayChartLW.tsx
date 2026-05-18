import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CandlestickSeries, LineStyle } from 'lightweight-charts'
import type { Category } from '../data/scenarios'

interface Bar { time: number; open: number; high: number; low: number; close: number }
interface ChartFile { id: string; symbol: string; interval: string; decisionIndex: number; bars: Bar[] }

interface Props {
  mode:       'before' | 'after'
  scenarioId: string
  category:   Category
}

// ── annotation helpers ────────────────────────────────────────────────────────

function annotate(series: any, bars: Bar[], di: number, category: Category) {
  const markers: any[] = []

  // Decision-point arrow always shown (last bar before reveal)
  const diBar = bars[di] ?? bars[bars.length - 1]
  markers.push({
    time:     diBar.time,
    position: 'aboveBar',
    color:    '#f59e0b',
    shape:    'arrowDown',
    text:     'DECISION',
    size:     2,
  })

  if (category === 'fvg' || category === 'full-model' || category === 'amd') {
    const fvg = findFVG(bars, di)
    if (fvg) {
      series.createPriceLine({ price: fvg.top, color: '#f59e0b', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'FVG TOP' })
      series.createPriceLine({ price: fvg.bot, color: '#f59e0b', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'FVG BOT' })
      const above = fvg.type === 'bear'
      markers.push(
        { time: bars[fvg.c1i].time, position: above ? 'aboveBar' : 'belowBar', color: '#94a3b8', shape: 'circle', text: 'C1', size: 1 },
        { time: bars[fvg.c2i].time, position: above ? 'aboveBar' : 'belowBar', color: '#f59e0b', shape: above ? 'arrowDown' : 'arrowUp', text: 'DISP', size: 2 },
        { time: bars[fvg.c3i].time, position: above ? 'aboveBar' : 'belowBar', color: '#94a3b8', shape: 'circle', text: 'C3', size: 1 },
      )
    }
  }

  if (category === 'order-block') {
    const ob = findOB(bars, di)
    if (ob) {
      series.createPriceLine({ price: ob.top, color: '#60a5fa', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'OB HIGH' })
      series.createPriceLine({ price: ob.bot, color: '#60a5fa', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'OB LOW' })
      markers.push({ time: bars[ob.idx].time, position: ob.bull ? 'belowBar' : 'aboveBar', color: '#60a5fa', shape: ob.bull ? 'arrowUp' : 'arrowDown', text: 'OB', size: 2 })
    }
  }

  if (category === 'market-structure') {
    const level = findChoCH(bars, di)
    if (level) {
      series.createPriceLine({ price: level.price, color: '#34d399', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'CHoCH' })
      markers.push({ time: bars[level.idx].time, position: level.bull ? 'belowBar' : 'aboveBar', color: '#34d399', shape: level.bull ? 'arrowUp' : 'arrowDown', text: 'BREAK', size: 2 })
    }
  }

  if (category === 'liquidity' || category === 'judas-swing') {
    const sweep = findSweep(bars, di)
    if (sweep) {
      series.createPriceLine({ price: sweep.price, color: '#f87171', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: sweep.label })
      markers.push({ time: bars[sweep.idx].time, position: sweep.above ? 'aboveBar' : 'belowBar', color: '#f87171', shape: sweep.above ? 'arrowDown' : 'arrowUp', text: 'SWEEP', size: 2 })
    }
  }

  if (category === 'kill-zone') {
    // Just show the decision point — the kill zone is the time context, not a price level
    const kzStart = Math.max(0, di - 8)
    markers.push({ time: bars[kzStart].time, position: 'belowBar', color: '#f472b6', shape: 'circle', text: 'KZ', size: 1 })
  }

  series.setMarkers(markers.sort((a: any, b: any) => a.time - b.time))
}

// Find the FVG (bull or bear) closest to bars[di].close before di
function findFVG(bars: Bar[], di: number) {
  const target = bars[di]?.close ?? bars[bars.length - 1].close
  let best: { type: 'bull' | 'bear'; c1i: number; c2i: number; c3i: number; top: number; bot: number } | null = null
  let bestDist = Infinity
  for (let i = 2; i < di; i++) {
    const c1 = bars[i - 2], c3 = bars[i]
    if (c3.low > c1.high) {
      const dist = Math.min(Math.abs(target - c3.low), Math.abs(target - c1.high))
      if (dist < bestDist) { bestDist = dist; best = { type: 'bull', c1i: i-2, c2i: i-1, c3i: i, top: c3.low, bot: c1.high } }
    }
    if (c3.high < c1.low) {
      const dist = Math.min(Math.abs(target - c3.high), Math.abs(target - c1.low))
      if (dist < bestDist) { bestDist = dist; best = { type: 'bear', c1i: i-2, c2i: i-1, c3i: i, top: c1.low, bot: c3.high } }
    }
  }
  return best
}

// Find the last candle that acts as an Order Block (last opposite candle before big move)
function findOB(bars: Bar[], di: number) {
  const avgBody = bars.slice(Math.max(0, di - 20), di).reduce((s, b) => s + Math.abs(b.close - b.open), 0) / 20
  for (let i = di - 2; i >= Math.max(0, di - 25); i--) {
    const next = bars[i + 1]
    if (!next) continue
    const nextBody = Math.abs(next.close - next.open)
    if (nextBody > avgBody * 1.8) {
      const bull = next.close > next.open
      const b = bars[i]
      return { idx: i, bull, top: Math.max(b.open, b.close), bot: Math.min(b.open, b.close) }
    }
  }
  return null
}

// Find the CHoCH level — last swing high broken to upside or swing low broken to downside
function findChoCH(bars: Bar[], di: number) {
  const window = bars.slice(Math.max(0, di - 30), di + 1)
  const base   = Math.max(0, di - 30)
  // Find all swing highs
  for (let i = window.length - 3; i >= 1; i--) {
    if (window[i].high >= window[i - 1].high && window[i].high >= window[i + 1].high) {
      // Check if a later bar's close exceeded this high (CHoCH up)
      for (let j = i + 1; j < window.length; j++) {
        if (window[j].close > window[i].high) {
          return { price: window[i].high, idx: base + j, bull: true }
        }
      }
    }
    if (window[i].low <= window[i - 1].low && window[i].low <= window[i + 1].low) {
      for (let j = i + 1; j < window.length; j++) {
        if (window[j].close < window[i].low) {
          return { price: window[i].low, idx: base + j, bull: false }
        }
      }
    }
  }
  return null
}

// Find the liquidity sweep — equal highs/lows that were broken
function findSweep(bars: Bar[], di: number) {
  const window = bars.slice(Math.max(0, di - 30), di + 1)
  const base   = Math.max(0, di - 30)
  const tol    = window.reduce((s, b) => s + (b.high - b.low), 0) / window.length * 0.2

  // Look for a candle that wicks below prior equal lows (SSL sweep)
  const lows = window.map(b => b.low)
  const minLow = Math.min(...lows)
  const sweepIdxL = lows.findIndex(l => l === minLow)
  // Find the equal-low level: 2nd lowest within tol
  const secondLow = lows.filter(l => l > minLow && l - minLow < tol * 3)
  if (secondLow.length >= 1) {
    const lvl = Math.min(...secondLow)
    return { price: lvl, idx: base + sweepIdxL, label: 'SSL', above: false }
  }

  // BSL sweep: max high + second-highest within tol
  const highs = window.map(b => b.high)
  const maxHigh = Math.max(...highs)
  const sweepIdxH = highs.findIndex(h => h === maxHigh)
  const secondHigh = highs.filter(h => h < maxHigh && maxHigh - h < tol * 3)
  if (secondHigh.length >= 1) {
    const lvl = Math.max(...secondHigh)
    return { price: lvl, idx: base + sweepIdxH, label: 'BSL', above: true }
  }

  return null
}

// ── component ─────────────────────────────────────────────────────────────────

export function ReplayChartLW({ mode, scenarioId, category }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<ReturnType<typeof createChart> | null>(null)
  const seriesRef    = useRef<any>(null)
  const [data,    setData]    = useState<ChartFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${import.meta.env.BASE_URL}chart-data/${scenarioId}.json`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [scenarioId])

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#06060e' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.025)' },
        horzLines: { color: 'rgba(255,255,255,0.025)' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor:         '#34d399',
      downColor:       '#f87171',
      borderUpColor:   '#34d399',
      borderDownColor: '#f87171',
      wickUpColor:     '#34d399',
      wickDownColor:   '#f87171',
    })

    chartRef.current  = chart
    seriesRef.current = series

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    })
    ro.observe(containerRef.current)

    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; seriesRef.current = null }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !data) return
    const visible = mode === 'before'
      ? data.bars.slice(0, data.decisionIndex)
      : data.bars
    seriesRef.current.setData(visible)

    if (mode === 'after') {
      annotate(seriesRef.current, data.bars, data.decisionIndex, category)
    }

    chartRef.current?.timeScale().scrollToRealTime()
  }, [data, mode, category])

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-800/50 relative"
         style={{ background: '#06060e', height: 360 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[11px] text-slate-600 animate-pulse">Loading chart…</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[11px] text-red-400">Chart unavailable</div>
        </div>
      )}
      {!loading && !error && data && mode === 'before' && (
        <div className="absolute bottom-3 right-4 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 tracking-wide">DECISION POINT</span>
          </div>
        </div>
      )}
      {!loading && !error && data && mode === 'after' && (
        <div className="absolute bottom-3 right-4 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 tracking-wide">CONCEPT REVEALED</span>
          </div>
        </div>
      )}
      {!loading && !error && data && (
        <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {data.symbol}
          </span>
          <span className="text-[9px] text-slate-700">{data.interval}</span>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
