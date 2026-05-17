import { useState } from 'react'
import { scenarios, type Scenario, type Category, type Difficulty } from './data/scenarios'
import { ScenarioChart } from './components/ScenarioChart'
import { useProgress } from './hooks/useProgress'
import './index.css'

const CAT: Record<Category,{label:string;color:string;bg:string;border:string}> = {
  'fvg':              {label:'Fair Value Gap',  color:'#f59e0b',bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.3)' },
  'order-block':      {label:'Order Block',     color:'#60a5fa',bg:'rgba(96,165,250,0.1)', border:'rgba(96,165,250,0.3)' },
  'liquidity':        {label:'Liquidity',       color:'#34d399',bg:'rgba(52,211,153,0.1)', border:'rgba(52,211,153,0.3)' },
  'market-structure': {label:'Mkt Structure',   color:'#c084fc',bg:'rgba(192,132,252,0.1)',border:'rgba(192,132,252,0.3)'},
  'amd':              {label:'AMD Cycle',        color:'#fb923c',bg:'rgba(251,146,60,0.1)', border:'rgba(251,146,60,0.3)' },
  'kill-zone':        {label:'Kill Zone',        color:'#f472b6',bg:'rgba(244,114,182,0.1)',border:'rgba(244,114,182,0.3)'},
  'judas-swing':      {label:'Judas Swing',     color:'#a78bfa',bg:'rgba(167,139,250,0.1)',border:'rgba(167,139,250,0.3)'},
  'full-model':       {label:'Full Model',      color:'#94a3b8',bg:'rgba(148,163,184,0.1)',border:'rgba(148,163,184,0.3)'},
}
const DIFF: Record<Difficulty,string> = {beginner:'#34d399',intermediate:'#f59e0b',advanced:'#f87171'}
const QS = ['q1','q2','q3','q4'] as const

// ── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const progress = useProgress()
  const [active, setActive] = useState<Scenario|null>(null)
  const handleComplete = (s: number) => { if (active) progress.saveResult(active.id, s) }
  if (active) return <Player scenario={active} onBack={() => setActive(null)} onComplete={handleComplete} />
  return <Home onStart={setActive} progress={progress} />
}

// ── Home ──────────────────────────────────────────────────────────────────────
function Home({ onStart, progress }: { onStart:(s:Scenario)=>void; progress:ReturnType<typeof useProgress> }) {
  const [filter, setFilter] = useState<Category|'all'>('all')
  const [diff,   setDiff]   = useState<Difficulty|'all'>('all')
  const cats = [...new Set(scenarios.map(s => s.category))] as Category[]
  const shown = scenarios.filter(s =>
    (filter === 'all' || s.category === filter) &&
    (diff === 'all' || s.difficulty === diff)
  )

  return (
    <div style={{ background:'#05050a', minHeight:'100vh' }}>
      <header style={{ background:'#07070e', borderBottom:'1px solid rgba(30,41,59,0.5)' }}>
        <div className="max-w-5xl mx-auto px-4 py-6">

          {/* Top row */}
          <div className="flex items-start justify-between flex-wrap gap-6 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                     style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.3)' }}>🎯</div>
                <div>
                  <p className="font-black tracking-widest text-white text-sm m-0">ICT REPLAY TRAINER</p>
                  <p className="text-slate-600 text-[9px] tracking-widest uppercase m-0">by Chronic Trading</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs max-w-xs leading-relaxed m-0">
                Study real ICT setups. Identify the concept, pick direction, name the draw, set your entry.
              </p>
            </div>
            <div className="flex gap-5">
              {[{l:'Done',v:`${progress.completed}/${scenarios.length}`},{l:'Avg',v:`${progress.avgScore}/4`},{l:'Perfect',v:`${progress.perfect}`}].map(s=>(
                <div key={s.l} className="text-center">
                  <p className="text-2xl font-black text-white m-0" style={{fontFamily:'monospace'}}>{s.v}</p>
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest mt-1 m-0">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>setFilter('all')}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${filter==='all'?'bg-slate-700 border-slate-600 text-white':'border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'}`}>
              All
            </button>
            {cats.map(c => {
              const m = CAT[c]
              return <button key={c} onClick={()=>setFilter(c)}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer"
                style={{ background:filter===c?m.bg:'transparent', borderColor:filter===c?m.border:'#1e293b', color:filter===c?m.color:'#64748b' }}>
                {m.label}
              </button>
            })}
            <span className="w-px bg-slate-800 self-stretch mx-1" />
            {(['all','beginner','intermediate','advanced'] as const).map(d => (
              <button key={d} onClick={()=>setDiff(d)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border capitalize transition-all cursor-pointer ${
                  diff===d
                    ? d==='all'          ? 'bg-slate-700 border-slate-600 text-white'
                    : d==='beginner'     ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : d==='intermediate' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    :                     'bg-red-500/15 border-red-500/30 text-red-400'
                    : 'border-slate-800 text-slate-500 hover:border-slate-700'
                }`}>{d}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map(s => {
            const m = CAT[s.category]
            const res = progress.getResult(s.id)
            const done = !!res, perfect = res?.score === 4
            return (
              <button key={s.id} onClick={()=>onStart(s)}
                className="text-left rounded-2xl border p-4 transition-all cursor-pointer"
                style={{ background:'#0b0b14', borderColor:done?m.border:'rgba(30,41,59,0.8)' }}
                onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-2px)')}
                onMouseLeave={e=>(e.currentTarget.style.transform='')}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ color:m.color, background:m.bg, border:`1px solid ${m.border}` }}>{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold capitalize" style={{ color:DIFF[s.difficulty] }}>{s.difficulty}</span>
                    {done && <span className="text-[10px] font-black" style={{ color:perfect?'#f59e0b':'#64748b' }}>{perfect?'★':`${res!.score}/4`}</span>}
                  </div>
                </div>
                <p className="text-sm font-bold text-white leading-snug mb-2">{s.title}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                  <span style={{fontFamily:'monospace'}}>{s.instrument}</span>
                  <span>·</span><span>{s.timeframe}</span><span>·</span><span>{s.session}</span>
                  <span className="ml-auto" style={{ color:perfect?'#f59e0b':done?'#475569':'rgba(245,158,11,0.6)' }}>
                    {perfect?'Perfect ✓':done?'Retry →':'Start →'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
        {shown.length === 0 && <p className="text-center text-slate-600 py-16">No scenarios match this filter.</p>}
      </main>
    </div>
  )
}

// ── Player ────────────────────────────────────────────────────────────────────
function Player({ scenario, onBack, onComplete }: { scenario:Scenario; onBack:()=>void; onComplete:(s:number)=>void }) {
  const [answers,   setAnswers]   = useState<Record<string,number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score,     setScore]     = useState(0)
  const m = CAT[scenario.category]

  const handleSubmit = () => {
    let s = 0
    QS.forEach(k => { if (answers[k] === scenario[k].correct) s++ })
    setScore(s); setSubmitted(true); onComplete(s)
  }
  const allAnswered = QS.every(k => answers[k] !== undefined)

  return (
    <div style={{ background:'#05050a', minHeight:'100vh' }}>
      {/* Nav */}
      <div style={{ background:'#07070e', borderBottom:'1px solid rgba(30,41,59,0.5)', padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack} style={{ fontSize:12, fontWeight:600, color:'#64748b', background:'none', border:'none', cursor:'pointer' }}>← Back</button>
        <span style={{ width:1, height:16, background:'#1e293b', display:'inline-block' }} />
        <span style={{ fontSize:11, color:'#475569', fontFamily:'monospace' }}>{scenario.instrument} · {scenario.timeframe} · {scenario.session}</span>
        <span style={{ marginLeft:'auto', fontSize:9, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', padding:'2px 8px', borderRadius:999, color:m.color, background:m.bg, border:`1px solid ${m.border}` }}>{m.label}</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Title */}
        <div>
          <h1 className="text-xl font-black text-white m-0">{scenario.title}</h1>
          <span className="text-[10px] font-bold uppercase" style={{ color:DIFF[scenario.difficulty] }}>{scenario.difficulty}</span>
        </div>

        {/* Context */}
        <div className="rounded-2xl border border-slate-800/50 p-4 space-y-2" style={{ background:'#0b0b14' }}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 m-0">Context</p>
          <p className="text-xs text-slate-400 leading-relaxed m-0"><span className="text-slate-300 font-semibold">HTF: </span>{scenario.htfContext}</p>
          <p className="text-xs text-slate-400 leading-relaxed m-0"><span className="text-slate-300 font-semibold">Session: </span>{scenario.sessionContext}</p>
        </div>

        {/* Chart */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">{submitted?'What happened next':'Study the chart — make your decision'}</p>
          <ScenarioChart
            mode={submitted?'after':'before'}
            beforeCandles={scenario.beforeCandles} afterCandles={scenario.afterCandles}
            beforeZones={scenario.beforeZones} afterZones={scenario.afterZones}
            beforeLines={scenario.beforeLines} afterLines={scenario.afterLines}
            scenarioId={scenario.id}
          />
        </div>

        <a href={`https://www.tradingview.com/chart/?symbol=${scenario.tvSymbol}&interval=${scenario.tvInterval}`}
           target="_blank" rel="noopener noreferrer"
           className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors">
          Verify on TradingView →
        </a>

        {/* Questions */}
        <div className="space-y-4">
          {QS.map((qKey, qi) => {
            const q = scenario[qKey]
            const selected = answers[qKey]
            const right = submitted && selected === q.correct
            return (
              <div key={qKey} className="rounded-2xl border border-slate-800/50 p-4 space-y-3 slide-up"
                   style={{ background:'#0b0b14', animationDelay:`${qi*60}ms` }}>
                <p className="text-sm font-bold text-white m-0">
                  <span className="text-slate-600 mr-2">Q{qi+1}.</span>{q.prompt}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const isSel  = selected === oi
                    const isCorr = submitted && oi === q.correct
                    const isWrong = submitted && isSel && oi !== q.correct
                    return (
                      <button key={oi}
                        onClick={() => { if (!submitted) setAnswers(p=>({...p,[qKey]:oi})) }}
                        disabled={submitted}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all"
                        style={{
                          background: isCorr?'rgba(52,211,153,0.1)':isWrong?'rgba(248,113,113,0.1)':isSel?'rgba(245,158,11,0.08)':'rgba(15,15,24,0.8)',
                          borderColor: isCorr?'rgba(52,211,153,0.4)':isWrong?'rgba(248,113,113,0.4)':isSel?'rgba(245,158,11,0.35)':'rgba(30,41,59,0.8)',
                          color: isCorr?'#34d399':isWrong?'#f87171':isSel?'#fde68a':'#94a3b8',
                          cursor: submitted?'default':'pointer',
                        }}>
                        <span className="opacity-40 mr-2 text-[10px]" style={{fontFamily:'monospace'}}>
                          {String.fromCharCode(65+oi)}.
                        </span>
                        {opt}{isCorr&&' ✓'}{isWrong&&' ✗'}
                      </button>
                    )
                  })}
                </div>
                {submitted && (
                  <div className="rounded-xl px-3 py-2.5 pop-in"
                       style={{ background:right?'rgba(52,211,153,0.06)':'rgba(248,113,113,0.06)', border:`1px solid ${right?'rgba(52,211,153,0.2)':'rgba(248,113,113,0.2)'}` }}>
                    <p className="text-[11px] leading-relaxed m-0" style={{ color:right?'#86efac':'#fca5a5' }}>{q.explanation}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Submit */}
        {!submitted && (
          <button onClick={handleSubmit} disabled={!allAnswered}
            className="w-full py-4 rounded-2xl font-bold text-sm transition-all border-0"
            style={{ background:allAnswered?'linear-gradient(135deg,#f59e0b,#d97706)':'rgba(30,41,59,0.5)', color:allAnswered?'#0a0800':'#475569', cursor:allAnswered?'pointer':'not-allowed' }}>
            Submit Answers →
          </button>
        )}

        {/* Result */}
        {submitted && (
          <div className="rounded-2xl border p-5 text-center space-y-4 pop-in"
               style={{ background:score===4?'rgba(245,158,11,0.05)':score>=3?'rgba(52,211,153,0.05)':'rgba(100,116,139,0.05)', borderColor:score===4?'rgba(245,158,11,0.3)':score>=3?'rgba(52,211,153,0.3)':'rgba(100,116,139,0.25)' }}>
            <p className="text-5xl font-black leading-none m-0"
               style={{ fontFamily:'monospace', color:score===4?'#f59e0b':score>=3?'#34d399':'#94a3b8' }}>{score}/4</p>
            <p className="text-sm font-bold m-0" style={{ color:score===4?'#fde68a':score>=3?'#6ee7b7':'#94a3b8' }}>
              {score===4?'🔥 Perfect — you read it correctly':score===3?'✓ Strong read — nearly there':score===2?'Decent — review the explanations':'Keep studying — this will click'}
            </p>
            <div className="rounded-xl px-4 py-3 text-left" style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(30,41,59,0.8)' }}>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 m-0 mb-1">What actually happened</p>
              <p className="text-xs text-slate-300 leading-relaxed m-0">{scenario.explanation}</p>
              {scenario.rAchieved && (
                <p className="text-xs font-bold mt-1.5 m-0"
                   style={{ fontFamily:'monospace', color:scenario.result==='worked'?'#34d399':'#f87171' }}>
                  {scenario.result==='worked'?`+${scenario.rAchieved}R`:`${scenario.rAchieved}R`} · {scenario.result.toUpperCase()}
                </p>
              )}
            </div>
            <button onClick={onBack}
              className="w-full py-3 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:border-slate-500 hover:text-white transition-all cursor-pointer"
              style={{ background:'transparent' }}>
              ← Back to Scenarios
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
