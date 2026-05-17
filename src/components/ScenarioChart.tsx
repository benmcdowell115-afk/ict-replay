// Renders the SVG candlestick chart for a scenario.
// "before" mode: shows a blinking ? cursor at the right edge.
// "after" mode: shows the full outcome with a result banner.

type CS = [number, number, number, number, number]
interface Zone { x:number; y:number; w:number; h:number; type:'amber'|'blue'|'green'|'red'|'purple'|'slate' }
interface Line { x1:number; y1:number; x2:number; y2:number; color:string; dashed?:boolean; label?:string; lx?:number; ly?:number }

const ZC = {
  amber:  { fill:'rgba(245,158,11,0.13)',  stroke:'rgba(245,158,11,0.6)'  },
  blue:   { fill:'rgba(96,165,250,0.12)',  stroke:'rgba(96,165,250,0.55)' },
  green:  { fill:'rgba(52,211,153,0.12)',  stroke:'rgba(52,211,153,0.55)' },
  red:    { fill:'rgba(248,113,113,0.12)', stroke:'rgba(248,113,113,0.55)'},
  purple: { fill:'rgba(192,132,252,0.12)', stroke:'rgba(192,132,252,0.55)'},
  slate:  { fill:'rgba(100,116,139,0.10)', stroke:'rgba(100,116,139,0.4)' },
}

const BULL = '#34d399'
const BEAR = '#f87171'
const W    = 22

function Candle({ c }: { c: CS }) {
  const [x, oy, cy, hy, ly] = c
  const bull  = oy > cy
  const color = bull ? BULL : BEAR
  const bTop  = Math.min(oy, cy)
  const bH    = Math.max(Math.abs(oy - cy), 2.5)
  return (
    <g>
      <line x1={x+W/2} y1={hy} x2={x+W/2} y2={ly}
        stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.65} />
      <rect x={x} y={bTop} width={W} height={bH} rx={1.5}
        fill={bull ? color : `${color}22`} stroke={color} strokeWidth={1.5} opacity={0.95} />
    </g>
  )
}

interface Props {
  mode: 'before' | 'after'
  beforeCandles: CS[]
  afterCandles?: CS[]
  beforeZones?: Zone[]
  afterZones?: Zone[]
  beforeLines?: Line[]
  afterLines?: Line[]
  scenarioId: string
}

export function ScenarioChart({
  mode, beforeCandles, afterCandles = [],
  beforeZones, afterZones, beforeLines, afterLines, scenarioId,
}: Props) {
  const zones = mode === 'after' ? (afterZones ?? beforeZones) : beforeZones
  const lines = mode === 'after' ? (afterLines ?? beforeLines) : beforeLines
  const uid = `sc${scenarioId.replace(/[^a-z0-9]/g,'')}${mode}`

  // Find the x position for the decision-point cursor (after last before candle)
  const lastBefore = beforeCandles.at(-1)
  const cursorX = lastBefore ? lastBefore[0] + W + 8 : 220

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-800/50"
         style={{ background: '#06060e' }}>
      <style>{`
        @keyframes ${uid}p{0%,100%{opacity:.65}50%{opacity:1}}
        .${uid}z{animation:${uid}p 2.4s ease-in-out infinite}
        @keyframes ${uid}blink{0%,100%{opacity:1}50%{opacity:0}}
        .${uid}cur{animation:${uid}blink 1s ease-in-out infinite}
      `}</style>

      <svg viewBox="0 0 340 150" className="w-full" style={{ display: 'block' }}>
        {/* Grid */}
        {[35,60,85,110,135].map(y => (
          <line key={y} x1={8} y1={y} x2={332} y2={y}
            stroke="rgba(255,255,255,0.025)" strokeWidth={1} />
        ))}

        {/* Zones */}
        {zones?.map((z, i) => {
          const c = ZC[z.type]
          return (
            <rect key={i} x={z.x} y={z.y} width={z.w} height={z.h} rx={3}
              fill={c.fill} stroke={c.stroke} strokeWidth={1}
              className={`${uid}z`} />
          )
        })}

        {/* Lines */}
        {lines?.map((l, i) => (
          <g key={i}>
            <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={l.color} strokeWidth={1}
              strokeDasharray={l.dashed ? '4 3' : undefined} />
            {l.label && (
              <text x={l.lx ?? l.x1} y={l.ly ?? l.y1 - 3}
                fill={l.color} fontSize={7.5} fontWeight={700} fontFamily="system-ui">
                {l.label}
              </text>
            )}
          </g>
        ))}

        {/* Before candles */}
        {beforeCandles.map((c, i) => <Candle key={i} c={c} />)}

        {/* Decision cursor (before mode) */}
        {mode === 'before' && (
          <g className={`${uid}cur`}>
            <line x1={cursorX} y1={12} x2={cursorX} y2={138}
              stroke="rgba(245,158,11,0.7)" strokeWidth={1.5} strokeDasharray="3 3" />
            <rect x={cursorX - 10} y={60} width={20} height={16} rx={3}
              fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.5)" strokeWidth={1} />
            <text x={cursorX} y={71} textAnchor="middle"
              fill="#f59e0b" fontSize={9} fontWeight={800} fontFamily="system-ui">?</text>
          </g>
        )}

        {/* After candles (outcome) */}
        {mode === 'after' && afterCandles.map((c, i) => (
          <Candle key={`a${i}`} c={c} />
        ))}

        {/* After mode: separator line */}
        {mode === 'after' && (
          <line x1={cursorX - 4} y1={12} x2={cursorX - 4} y2={138}
            stroke="rgba(245,158,11,0.4)" strokeWidth={1} strokeDasharray="2 2" />
        )}
      </svg>
    </div>
  )
}
