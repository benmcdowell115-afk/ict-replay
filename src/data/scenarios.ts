// ICT Replay Trainer — 30 curated scenarios.
// Candle spec: [x, openY, closeY, highY, lowY] — bull = openY > closeY
// SVG canvas: 340 × 150, chart area y 12→138

export type Category = 'fvg' | 'order-block' | 'liquidity' | 'market-structure' | 'amd' | 'kill-zone' | 'judas-swing' | 'full-model'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type Instrument = 'NQ' | 'ES' | 'GC' | 'SI'
export type TF = '1m' | '5m' | '15m' | '1H' | '4H'
export type Session = 'Asia' | 'London' | 'NY AM' | 'NY PM'
export type Direction = 'long' | 'short' | 'wait'
export type Result = 'worked' | 'partial' | 'failed'

type CS = [number, number, number, number, number]

interface Zone  { x:number; y:number; w:number; h:number; type:'amber'|'blue'|'green'|'red'|'purple'|'slate' }
interface Line  { x1:number; y1:number; x2:number; y2:number; color:string; dashed?:boolean; label?:string; lx?:number; ly?:number }

export interface Question {
  prompt: string
  options: string[]
  correct: number  // index into options
  explanation: string
}

export interface Scenario {
  id: string
  title: string
  category: Category
  difficulty: Difficulty
  instrument: Instrument
  timeframe: TF
  session: Session

  // Context shown before answering
  htfContext: string
  sessionContext: string

  // "Before" chart — up to the decision point
  beforeCandles: CS[]
  beforeZones?: Zone[]
  beforeLines?: Line[]

  // "After" chart — what happened
  afterCandles: CS[]
  afterZones?: Zone[]
  afterLines?: Line[]

  // 4 quiz questions
  q1: Question  // What concept is forming?
  q2: Question  // What direction?
  q3: Question  // Draw on Liquidity?
  q4: Question  // Best entry approach?

  // Outcome
  result: Result
  rAchieved: number | null
  explanation: string

  // Optional TradingView reference
  tvSymbol: string
  tvInterval: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared shorthand colours for zones
const ZA = 'amber' as const
const ZB = 'blue'  as const
const ZG = 'green' as const
const ZR = 'red'   as const
const ZS = 'slate' as const

export const scenarios: Scenario[] = [

  // ── 1. FVG BEGINNER LONG ──────────────────────────────────────────────────
  {
    id: 's01',
    title: 'Classic Bullish FVG Retracement',
    category: 'fvg',
    difficulty: 'beginner',
    instrument: 'NQ',
    timeframe: '15m',
    session: 'NY AM',
    htfContext: 'Daily structure is bullish. Price is above the 4H OB. No major red events today.',
    sessionContext: 'NY AM kill zone. Prior Asia session formed equal lows below that were swept by London. NQ is now in distribution upward.',
    beforeCandles: [
      [10,88,70,82,94],[34,68,50,62,74],[58,48,30,42,54],
      [82,28,50,22,54],[106,48,65,42,70],[130,62,78,56,84],
      [154,75,55,68,80],[178,52,32,46,58],[202,30,18,24,36],
    ],
    beforeZones: [{ x:58,y:54,w:220,h:30,type:ZA }],
    beforeLines: [
      { x1:58,y1:54,x2:278,y2:54,color:'rgba(245,158,11,0.4)',dashed:true },
      { x1:58,y1:84,x2:278,y2:84,color:'rgba(245,158,11,0.4)',dashed:true,label:'FVG',lx:62,ly:50 },
    ],
    afterCandles: [
      [226,20,12,8,26],[250,14,32,10,36],[274,30,15,11,34],[298,16,8,4,20],
    ],
    afterZones: [{ x:58,y:54,w:268,h:30,type:ZA }],
    afterLines: [
      { x1:58,y1:54,x2:318,y2:54,color:'rgba(245,158,11,0.4)',dashed:true },
      { x1:58,y1:84,x2:318,y2:84,color:'rgba(245,158,11,0.4)',dashed:true },
    ],
    q1: {
      prompt: 'What ICT concept is highlighted at the arrow?',
      options: ['Order Block (OB)', 'Fair Value Gap (FVG)', 'Breaker Block', 'Premium/Discount Zone', 'Inducement'],
      correct: 1,
      explanation: 'The amber zone is a Fair Value Gap — the gap between candle 1\'s low and candle 3\'s high left by a displacement move. Price is pulling back into it.',
    },
    q2: {
      prompt: 'Given the HTF context and this setup, which direction do you trade?',
      options: ['Long — buy from the FVG', 'Short — sell the retracement', 'Wait — no clear setup'],
      correct: 0,
      explanation: 'Daily structure is bullish, Asia lows were swept, and price is in the NY AM kill zone pulling back into a bullish FVG. Long is the correct direction.',
    },
    q3: {
      prompt: 'What is the most likely Draw on Liquidity (DOL) for this move?',
      options: ['SSL below the Asia session low', 'BSL at the prior day high (equal highs above)', 'Equilibrium of the daily range'],
      correct: 1,
      explanation: 'With bullish bias and SSL already swept, the draw is the BSL above — the equal highs / prior day high. That\'s where buy-stop orders rest.',
    },
    q4: {
      prompt: 'Where is the optimal ICT entry for this long trade?',
      options: ['At market — enter immediately', 'Limit order at 50% of the FVG (consequent encroachment)', 'Wait for price to fully close the FVG then buy'],
      correct: 1,
      explanation: 'The 50% level of the FVG (consequent encroachment) is the highest-probability entry. It provides the tightest risk while giving price room to retrace.',
    },
    result: 'worked',
    rAchieved: 3.2,
    explanation: 'Price pulled back into the bullish FVG at the 50% level, wick rejected, and delivered to the BSL (prior day high) for 3.2R. Classic first-touch FVG entry in a NY AM kill zone.',
    tvSymbol: 'CME_MINI:NQ1!',
    tvInterval: '15',
  },

  // ── 2. BEARISH FVG INTERMEDIATE ───────────────────────────────────────────
  {
    id: 's02',
    title: 'Bearish FVG After BOS — Short',
    category: 'fvg',
    difficulty: 'intermediate',
    instrument: 'ES',
    timeframe: '5m',
    session: 'NY AM',
    htfContext: '4H structure broke bearish. Daily OB sits overhead. Prior week high is BSL already taken.',
    sessionContext: 'NY AM. ES had a Judas swing at the open running to a local BSL. Now structure is bearish on 5m with a fresh BOS.',
    beforeCandles: [
      [10,35,58,28,64],[34,55,72,48,78],[58,68,52,62,74],
      [82,50,28,44,54],[106,26,45,20,50],[130,42,60,36,66],
      [154,58,42,52,64],[178,40,65,34,70],[202,62,80,56,86],
    ],
    beforeZones: [{ x:82,y:28,w:180,h:26,type:ZA }],
    beforeLines: [
      { x1:82,y1:28,x2:262,y2:28,color:'rgba(245,158,11,0.4)',dashed:true },
      { x1:82,y1:54,x2:262,y2:54,color:'rgba(245,158,11,0.4)',dashed:true,label:'FVG',lx:86,ly:24 },
    ],
    afterCandles: [
      [226,78,95,72,100],[250,92,108,86,114],[274,105,118,100,122],
    ],
    afterZones: [{ x:82,y:28,w:210,h:26,type:ZA }],
    q1: {
      prompt: 'What is the amber zone and why does it matter here?',
      options: ['A bullish Order Block — buy from it', 'A bearish Fair Value Gap — sell from it', 'A premium zone — price should avoid it', 'A prior day high — wait for a sweep'],
      correct: 1,
      explanation: 'The amber zone is a bearish FVG created during the displacement that caused the BOS. Price is pulling back into it — with bearish bias, this is a sell zone.',
    },
    q2: {
      prompt: 'What direction does this setup favor?',
      options: ['Long — the pullback is a buy opportunity', 'Short — sell the FVG retracement', 'Wait — HTF is bullish, skip this'],
      correct: 1,
      explanation: 'Bearish 4H structure, a completed BOS on 5m, and a bearish FVG in the path of a retracement. Short is aligned with all timeframes.',
    },
    q3: {
      prompt: 'What is the most likely Draw on Liquidity below?',
      options: ['The Asia session low (fresh SSL)', 'The prior week open', 'Equilibrium of the weekly range'],
      correct: 0,
      explanation: 'The Asia session low is the nearest untapped SSL. With bearish bias and a bearish FVG, price is likely delivering to that sell-side liquidity pool.',
    },
    q4: {
      prompt: 'What is the best stop placement for this short?',
      options: ['Above the high of the FVG', 'Below the FVG (expecting price to fill it)', 'At the swing high from the Judas spike'],
      correct: 0,
      explanation: 'A close above the FVG means the retracement is complete and the bearish thesis is wrong. Stop above the FVG gives the trade room while keeping risk defined.',
    },
    result: 'worked',
    rAchieved: 2.9,
    explanation: 'ES pulled back into the bearish FVG, wicked to the 62% level, then aggressively sold off to the Asia session low for 2.9R.',
    tvSymbol: 'CME_MINI:ES1!',
    tvInterval: '5',
  },

  // ── 3. ORDER BLOCK BEGINNER SHORT ─────────────────────────────────────────
  {
    id: 's03',
    title: 'Bearish OB at Judas Swing High',
    category: 'order-block',
    difficulty: 'beginner',
    instrument: 'NQ',
    timeframe: '15m',
    session: 'NY AM',
    htfContext: 'Weekly structure is bearish. 4H OB sits overhead and has not been retested yet. Daily bias is short.',
    sessionContext: 'NY AM. NQ opened and ran to the prior day high (BSL) in a textbook Judas swing. The last bullish candle before the big displacement down is the OB.',
    beforeCandles: [
      [10,95,75,88,100],[34,72,55,65,78],[58,52,35,45,58],
      [82,32,14,25,38],[106,12,28,6,34],[130,25,44,18,50],
      [154,42,60,35,66],[178,58,42,50,64],[202,40,22,32,46],
    ],
    beforeZones: [{ x:10,y:14,w:200,h:61,type:ZB }],
    beforeLines: [
      { x1:10,y1:14,x2:210,y2:14,color:'rgba(96,165,250,0.4)',dashed:true,label:'OB',lx:14,ly:10 },
      { x1:10,y1:75,x2:210,y2:75,color:'rgba(96,165,250,0.4)',dashed:true },
    ],
    afterCandles: [
      [226,24,42,18,48],[250,40,60,34,66],[274,58,78,52,84],[298,76,92,70,98],
    ],
    afterZones: [{ x:10,y:14,w:250,h:61,type:ZB }],
    q1: {
      prompt: 'What does the blue zone represent in this context?',
      options: ['A bullish Fair Value Gap — buy from here', 'A bearish Order Block — the last bull candle before displacement', 'A premium zone — overextended, wait', 'A breaker block from a failed OB'],
      correct: 1,
      explanation: 'The blue zone is the bearish Order Block — the last up-close candle (or group of candles) before the aggressive bearish displacement. This is where institutional sell orders rested.',
    },
    q2: {
      prompt: 'Price has pulled back into the OB zone. What do you do?',
      options: ['Go long — price is at support', 'Go short — OB is a resistance zone in bearish structure', 'Wait for a second test of the OB'],
      correct: 1,
      explanation: 'With weekly and daily bearish structure, the OB is a resistance zone. This is the Judas retracement into the OB — the textbook short entry.',
    },
    q3: {
      prompt: 'Where is the Draw on Liquidity for this short trade?',
      options: ['BSL above the prior day high', 'SSL at the prior week low', 'The open of the current day'],
      correct: 1,
      explanation: 'Prior week low is untouched sell-side liquidity. With bearish structure and the Judas swing confirming, price is drawing to that SSL.',
    },
    q4: {
      prompt: 'Which entry within the OB is most precise by ICT principles?',
      options: ['Top of the OB (highest risk, widest stop)', '50% of the OB body (balanced)', 'Below the OB (chasing, worst entry)'],
      correct: 1,
      explanation: 'The 50% of the OB body gives the best balance: enough room for price to probe the OB while keeping stop distance manageable. ICT calls this the "sweet spot" of the OB.',
    },
    result: 'worked',
    rAchieved: 4.1,
    explanation: 'NQ rejected the 50% of the OB with a wick, never closed above it, and delivered 4.1R to the prior week SSL. Classic Judas swing into OB short.',
    tvSymbol: 'CME_MINI:NQ1!',
    tvInterval: '15',
  },

  // ── 4. LIQUIDITY SWEEP BEGINNER LONG ─────────────────────────────────────
  {
    id: 's04',
    title: 'Equal Lows Swept — Bullish Reversal',
    category: 'liquidity',
    difficulty: 'beginner',
    instrument: 'NQ',
    timeframe: '15m',
    session: 'NY AM',
    htfContext: 'Daily structure is bullish. The prior week formed equal lows. Daily bias is long.',
    sessionContext: 'NY AM. NQ dipped below the equal lows formed over 3 sessions, swept the SSL with a wick, then immediately printed a reversal candle.',
    beforeCandles: [
      [10,72,52,65,78],[34,50,68,44,74],[58,65,50,58,70],
      [82,48,68,42,74],[106,65,52,58,70],[130,50,68,44,74],
      [154,65,48,58,70],[178,46,90,40,102],[202,98,68,62,106],
    ],
    beforeLines: [
      { x1:10,y1:74,x2:220,y2:74,color:'rgba(248,113,113,0.6)',dashed:true,label:'Equal Lows (SSL)',lx:14,ly:70 },
    ],
    afterCandles: [
      [226,65,48,58,70],[250,46,30,40,52],[274,28,15,22,34],[298,16,8,10,22],
    ],
    q1: {
      prompt: 'What just happened at the wick that swept below the equal lows?',
      options: ['Price found genuine support — the lows are holding', 'SSL (sell-side liquidity) was swept — stop orders triggered then price reversed', 'A bearish OB was mitigated — expect continuation down', 'Equilibrium was reached — price will consolidate'],
      correct: 1,
      explanation: 'The wick swept below the equal lows, triggering all sell-stop orders placed there by retail traders. This is SSL being taken — the fuel for the reversal move upward.',
    },
    q2: {
      prompt: 'What direction is this setup signaling?',
      options: ['Short — break of the lows is bearish', 'Long — SSL swept, expect reversal up', 'Wait — more confirmation needed'],
      correct: 1,
      explanation: 'SSL swept + bullish daily bias + immediate price reversal = long. The sweep is the signal that smart money has filled its buy orders and is now delivering upward.',
    },
    q3: {
      prompt: 'What is the Draw on Liquidity for the expected move up?',
      options: ['The equal lows (just swept)', 'BSL at the prior day high / equal highs above', 'The 50% level of the current range'],
      correct: 1,
      explanation: 'Once SSL is taken, the draw flips to the BSL above — equal highs or the prior day high where buy-stop orders rest. That is the destination.',
    },
    q4: {
      prompt: 'Where do you enter after the SSL sweep?',
      options: ['Immediately market buy on the sweep wick', 'On the 5m bullish OB or FVG formed during the reversal impulse', 'Wait for price to return to the equal lows level again'],
      correct: 1,
      explanation: 'The best entry is the 5m OB or FVG left on the reversal impulse candle after the sweep. This gives you a defined risk level below the wick low.',
    },
    result: 'worked',
    rAchieved: 3.5,
    explanation: 'Equal lows swept, reversal 5m OB held perfectly. NQ delivered 3.5R to the BSL (equal highs from prior day) within 45 minutes.',
    tvSymbol: 'CME_MINI:NQ1!',
    tvInterval: '15',
  },

  // ── 5. MARKET STRUCTURE CHoCH INTERMEDIATE LONG ───────────────────────────
  {
    id: 's05',
    title: 'CHoCH After Liquidity Sweep — Bullish Flip',
    category: 'market-structure',
    difficulty: 'intermediate',
    instrument: 'ES',
    timeframe: '5m',
    session: 'London',
    htfContext: 'Daily structure is bullish. 4H making higher highs and lows. The current pullback is a retracement.',
    sessionContext: 'London session. ES was in a short-term bearish trend on 5m (lower highs, lower lows). London swept the prior session low (SSL), then printed the first bullish CHoCH — breaking above the most recent lower high.',
    beforeCandles: [
      [10,35,55,28,62],[34,52,68,46,74],[58,64,48,58,70],
      [82,45,62,38,68],[106,58,75,52,80],[130,72,55,65,78],
      [154,52,72,46,78],[178,68,92,62,100],[202,98,70,65,104],
    ],
    beforeLines: [
      { x1:10,y1:55,x2:220,y2:55,color:'rgba(52,211,153,0.5)',dashed:true,label:'CHoCH level',lx:14,ly:51 },
      { x1:178,y1:96,x2:220,y2:96,color:'rgba(248,113,113,0.4)',dashed:true,label:'SSL swept',lx:180,ly:92 },
    ],
    afterCandles: [
      [226,68,52,62,74],[250,50,35,44,56],[274,33,20,27,40],[298,18,8,12,24],
    ],
    q1: {
      prompt: 'What structural event just occurred at the dashed green line?',
      options: ['A Break of Structure (BOS) — trend continuation bearish', 'A Change of Character (CHoCH) — potential bullish reversal', 'An Order Block mitigation — expect rejection', 'A Fair Value Gap — wait for retracement'],
      correct: 1,
      explanation: 'Price broke above the most recent lower high — this is a CHoCH (Change of Character). Combined with the SSL sweep below, this signals a structural shift from bearish to bullish on this timeframe.',
    },
    q2: {
      prompt: 'What does the CHoCH after an SSL sweep tell you?',
      options: ['Continue short — the lower high is new resistance', 'Go long — the SSL sweep + CHoCH confirms bullish reversal', 'No trade — CHoCH alone is not enough signal'],
      correct: 1,
      explanation: 'SSL swept + CHoCH = the full reversal confirmation ICT describes. Stop orders were collected (SSL swept), and now price broke the bearish structure (CHoCH). Both conditions met = long.',
    },
    q3: {
      prompt: 'What is the draw for the new bullish move?',
      options: ['The SSL just swept (already taken)', 'BSL at the prior swing high / equal highs above', 'The opening gap from prior day'],
      correct: 1,
      explanation: 'SSL is already consumed. The next target is BSL — the prior swing high where buy-stop orders sit above the market.',
    },
    q4: {
      prompt: 'What is the best entry for this long?',
      options: ['Break of the CHoCH level — buy the breakout', 'Pullback into the FVG left by the CHoCH impulse', 'Market order at the SSL sweep candle'],
      correct: 1,
      explanation: 'The FVG left during the CHoCH impulse candle is the precision entry. It offers a defined risk and is where institutional orders from the reversal are likely to hold.',
    },
    result: 'worked',
    rAchieved: 2.8,
    explanation: 'ES pulled back into the 5m FVG formed on the CHoCH candle, held, and rallied 2.8R to the prior swing high (BSL).',
    tvSymbol: 'CME_MINI:ES1!',
    tvInterval: '5',
  },

  // ── 6. AMD CYCLE INTERMEDIATE LONG ───────────────────────────────────────
  {
    id: 's06',
    title: 'AMD — Identify the Manipulation Phase',
    category: 'amd',
    difficulty: 'intermediate',
    instrument: 'NQ',
    timeframe: '15m',
    session: 'NY AM',
    htfContext: 'Daily bias is bullish. Prior day was bullish. No major news events today.',
    sessionContext: 'Asia session formed a clear range (Accumulation). At the NY open, NQ dropped sharply below the Asia low — the Manipulation phase. You are now deciding whether this is the real breakdown or the Judas sweep before Distribution up.',
    beforeCandles: [
      // Accumulation (Asia flat)
      [10,64,60,58,68],[34,62,66,58,70],[58,65,61,60,68],[82,63,67,60,70],
      // Manipulation (NY open drop)
      [106,65,98,60,110],[130,102,80,96,108],
    ],
    beforeZones: [
      { x:10,y:56,w:100,h:18,type:ZS },
      { x:106,y:60,w:50,h:52,type:ZR },
    ],
    beforeLines: [
      { x1:10,y1:66,x2:210,y2:66,color:'rgba(248,113,113,0.4)',dashed:true,label:'Asia Low (SSL)',lx:14,ly:62 },
    ],
    afterCandles: [
      [154,78,55,50,84],[178,52,30,24,58],[202,28,12,8,34],[226,14,6,4,18],[250,8,3,2,12],
    ],
    afterZones: [
      { x:10,y:56,w:100,h:18,type:ZS },
      { x:106,y:6,w:200,h:60,type:ZG },
    ],
    q1: {
      prompt: 'In the AMD model, what phase is the sharp drop to the Asia low?',
      options: ['Accumulation — building positions', 'Manipulation — false move to collect liquidity', 'Distribution — real directional move', 'Consolidation — no clear bias'],
      correct: 1,
      explanation: 'The sharp drop below the Asia low is the Manipulation phase. It sweeps SSL (sell stops below the Asia range), trapping bearish breakout traders, before the real move (Distribution) up.',
    },
    q2: {
      prompt: 'Given the AMD model and bullish daily bias, what direction do you trade?',
      options: ['Short — the breakdown is real', 'Long — the Asia low sweep is the Manipulation, Distribution follows upward', 'Wait — AMD is not yet confirmed'],
      correct: 1,
      explanation: 'Bullish daily bias + Accumulation (Asia range) + SSL sweep at the open = textbook AMD bullish setup. The Manipulation (drop) is the entry trigger, not a reason to short.',
    },
    q3: {
      prompt: 'Where is the Draw on Liquidity for the Distribution phase?',
      options: ['SSL below the Manipulation low', 'BSL above the Asia high / prior session high', 'The midpoint of the Asia range'],
      correct: 1,
      explanation: 'After the Manipulation takes SSL, price distributes to BSL — the buy-stop orders resting above the Asia high and prior session high. That is the target.',
    },
    q4: {
      prompt: 'What is the optimal entry during the Manipulation phase?',
      options: ['Enter short on the breakdown (following retail)', 'Enter long on the 5m OB/FVG formed during the reversal impulse after the sweep', 'Wait for price to close back above the Asia low before entering'],
      correct: 1,
      explanation: 'The 5m OB or FVG on the reversal impulse after the SSL sweep is the ICT entry. Waiting for the close above the Asia low is acceptable but results in worse R:R.',
    },
    result: 'worked',
    rAchieved: 4.8,
    explanation: 'Asia low swept, 5m bullish OB held. NQ distributed 4.8R to the prior day high (BSL) within 2 hours — textbook AMD bullish day.',
    tvSymbol: 'CME_MINI:NQ1!',
    tvInterval: '15',
  },

  // ── 7. JUDAS SWING SHORT INTERMEDIATE ─────────────────────────────────────
  {
    id: 's07',
    title: 'NY Open Judas Swing — Short Setup',
    category: 'judas-swing',
    difficulty: 'intermediate',
    instrument: 'NQ',
    timeframe: '5m',
    session: 'NY AM',
    htfContext: '4H structure broke bearish this week. Daily OB overhead. Prior day closed bearish.',
    sessionContext: 'NY AM 9:30 EST. NQ opened and aggressively ran above the prior day high (BSL) in the first 10 minutes. The move was fast with no pullback — a classic Judas spike.',
    beforeCandles: [
      [10,62,72,58,78],[34,70,62,65,75],[58,65,55,60,70],
      // Judas spike
      [82,55,15,8,58],[106,18,35,12,40],[130,32,50,26,56],
      [154,48,65,42,70],[178,62,48,55,68],[202,46,65,40,70],
    ],
    beforeZones: [{ x:82,y:8,w:60,h:50,type:ZR }],
    beforeLines: [
      { x1:10,y1:62,x2:220,y2:62,color:'rgba(248,113,113,0.5)',dashed:true,label:'Prior Day High (BSL)',lx:14,ly:58 },
    ],
    afterCandles: [
      [226,62,78,56,84],[250,75,90,68,96],[274,87,102,80,108],[298,99,112,92,118],
    ],
    q1: {
      prompt: 'What is the NY open spike above the prior day high called in ICT?',
      options: ['Breakout — enter long immediately', 'Judas Swing — a fake move to collect BSL before the real direction', 'OTE — optimal entry for longs at a retracement', 'Silver Bullet — a time-based entry'],
      correct: 1,
      explanation: 'The aggressive spike above the prior day high at the NY open is the Judas Swing — a manipulation move that hunts BSL (buy stops above the high) before reversing in the true direction.',
    },
    q2: {
      prompt: 'With bearish HTF structure, what do you do after the Judas spike?',
      options: ['Long — the breakout is confirmed', 'Short — the Judas sweep of BSL is the entry signal', 'Wait — the spike is too volatile to trade'],
      correct: 1,
      explanation: 'Bearish 4H + bearish daily + BSL sweep at the open = Judas Swing short. This is one of the cleanest setups in ICT — the manipulation (Judas) funds the real move down.',
    },
    q3: {
      prompt: 'Where is the Draw on Liquidity for this short?',
      options: ['BSL above (just swept — already taken)', 'SSL at the prior day low / prior session low', 'The daily open price'],
      correct: 1,
      explanation: 'BSL was just consumed by the Judas spike. The draw flips to SSL — the prior day low or prior session low where sell-stop orders are resting.',
    },
    q4: {
      prompt: 'What is the entry trigger for this short after the Judas spike?',
      options: ['Short as the spike is forming (dangerous — Judas could extend)', '1m or 5m bearish OB formed during the reversal off the Judas high', 'Wait for price to close back below the prior day open'],
      correct: 1,
      explanation: 'The bearish OB on the 1m/5m during the first reversal candle off the Judas high is the precise ICT entry. Stop goes above the Judas high.',
    },
    result: 'worked',
    rAchieved: 3.9,
    explanation: 'Judas spike swept BSL at prior day high, 5m bearish OB formed on the reversal. NQ sold off 3.9R to the prior day low (SSL) by 10:30 AM.',
    tvSymbol: 'CME_MINI:NQ1!',
    tvInterval: '5',
  },

  // ── 8. KILL ZONE SILVER BULLET ────────────────────────────────────────────
  {
    id: 's08',
    title: 'Silver Bullet — 10:00 AM Window Long',
    category: 'kill-zone',
    difficulty: 'intermediate',
    instrument: 'ES',
    timeframe: '1m',
    session: 'NY AM',
    htfContext: 'Daily structure bullish. 15m CHoCH formed earlier in the session confirming bullish bias for NY AM.',
    sessionContext: '10:00–11:00 AM EST Silver Bullet window. ES formed a 1m FVG after sweeping a local SSL at 10:08 AM. The window is active.',
    beforeCandles: [
      [10,65,75,60,80],[34,72,62,66,77],[58,60,72,54,78],
      [82,70,85,64,90],[106,92,78,86,96],[130,75,60,68,80],
      [154,58,72,52,78],[178,70,85,64,90],[202,88,72,82,94],
    ],
    beforeZones: [{ x:130,y:60,w:130,h:22,type:ZA }],
    beforeLines: [
      { x1:0,y1:82,x2:240,y2:82,color:'rgba(248,113,113,0.4)',dashed:true,label:'SSL swept',lx:4,ly:78 },
      { x1:130,y1:60,x2:260,y2:60,color:'rgba(245,158,11,0.4)',dashed:true },
      { x1:130,y1:82,x2:260,y2:82,color:'rgba(245,158,11,0.4)',dashed:true,label:'1m FVG',lx:134,ly:56 },
    ],
    afterCandles: [
      [226,70,58,64,76],[250,56,44,50,62],[274,42,30,36,48],[298,28,18,22,34],
    ],
    afterZones: [{ x:130,y:60,w:180,h:22,type:ZA }],
    q1: {
      prompt: 'What time-based ICT framework makes this 1m FVG particularly high probability?',
      options: ['The London Kill Zone window', 'The 10:00–11:00 AM Silver Bullet window', 'The ICT 9:50 macro', 'The NY PM Silver Bullet (2–3 PM)'],
      correct: 1,
      explanation: 'The 10:00–11:00 AM window is an ICT Silver Bullet window — the algorithm consistently creates 1m FVGs during these 60-minute periods. This time window elevates the probability of any FVG that forms within it.',
    },
    q2: {
      prompt: 'Given the SSL sweep and bullish 15m structure, what direction is this?',
      options: ['Short — the SSL sweep broke down', 'Long — SSL swept + 1m FVG in bullish context', 'Wait — too early to call direction'],
      correct: 1,
      explanation: 'Bullish daily and 15m structure, Silver Bullet window active, SSL swept, and a 1m bullish FVG formed. All conditions align for long.',
    },
    q3: {
      prompt: 'What is the target for this Silver Bullet trade?',
      options: ['The SSL just swept (already taken)', 'Local BSL — the equal highs / swing high from earlier in the session', 'The prior day high'],
      correct: 1,
      explanation: 'Silver Bullet trades target local BSL within the session — the equal highs or swing high from earlier in the NY session. Keeping targets realistic within the window.',
    },
    q4: {
      prompt: 'What defines a valid 1m FVG for Silver Bullet entry?',
      options: ['Any 3-candle gap on the 1m chart', 'A 1m FVG formed AFTER a liquidity sweep, WITHIN the Silver Bullet window, in the direction of HTF bias', 'A 1m gap that is immediately filled on the next candle'],
      correct: 1,
      explanation: 'A valid Silver Bullet FVG requires three conditions: formed during the 60-minute window, occurs after a liquidity sweep, and aligns with the HTF bias. All three must be present.',
    },
    result: 'worked',
    rAchieved: 2.3,
    explanation: 'SSL swept at 10:08, 1m FVG formed and held. ES rallied 2.3R to local BSL (equal highs) by 10:42 AM within the Silver Bullet window.',
    tvSymbol: 'CME_MINI:ES1!',
    tvInterval: '1',
  },

  // ── 9. BREAKER BLOCK ADVANCED ─────────────────────────────────────────────
  {
    id: 's09',
    title: 'Bullish OB Fails — Breaker Block Short',
    category: 'order-block',
    difficulty: 'advanced',
    instrument: 'NQ',
    timeframe: '15m',
    session: 'NY AM',
    htfContext: 'Market has shifted bearish on 4H. Weekly structure printed a lower high. The OB shown previously held and caused a rally — but now structure has reversed bearish.',
    sessionContext: 'NY AM. The same bullish OB that caused a previous rally has now been violated — price closed below it entirely. Price has rallied back to test the same zone. This is now a Breaker Block.',
    beforeCandles: [
      // Previous rally from OB
      [10,88,62,82,92],[34,60,42,54,66],[58,40,24,34,46],
      // OB violated
      [82,22,85,16,92],[106,82,98,76,104],
      // Rally back to former OB (now breaker)
      [130,95,72,88,100],[154,70,52,64,76],[178,50,35,44,56],[202,33,48,27,54],
    ],
    beforeZones: [{ x:10,y:24,w:220,h:64,type:ZB }],
    beforeLines: [
      { x1:10,y1:24,x2:230,y2:24,color:'rgba(96,165,250,0.4)',dashed:true,label:'Former Bull OB → Breaker',lx:14,ly:20 },
      { x1:10,y1:88,x2:230,y2:88,color:'rgba(96,165,250,0.4)',dashed:true },
    ],
    afterCandles: [
      [226,46,65,40,70],[250,62,80,56,86],[274,78,95,72,100],[298,92,108,86,114],
    ],
    q1: {
      prompt: 'The blue zone was a bullish OB that previously worked. Now price is retesting it after closing below. What has it become?',
      options: ['Still a bullish OB — buy from it', 'A Breaker Block — the failed OB flips to opposite polarity', 'A premium zone — price will consolidate here', 'An FVG — wait for the midpoint retest'],
      correct: 1,
      explanation: 'When a bullish OB is violated (price closes below it), it flips polarity and becomes a Bearish Breaker Block. The zone that was support is now resistance — smart money is now using it to sell.',
    },
    q2: {
      prompt: 'What direction do you trade the Breaker Block?',
      options: ['Long — price is at support', 'Short — the Breaker Block is now resistance', 'Wait — too uncertain'],
      correct: 1,
      explanation: 'Breaker Block = failed OB that flips. With 4H bearish structure and a Breaker Block test, short is the play. The former support has become the sell zone.',
    },
    q3: {
      prompt: 'What is the Draw on Liquidity for this short trade?',
      options: ['BSL above the Breaker Block', 'SSL at the recent structural low / prior week low', 'The daily open'],
      correct: 1,
      explanation: 'With bearish structure and selling from a Breaker Block, the draw is to the SSL below — the recent structural low where sell stops cluster.',
    },
    q4: {
      prompt: 'What makes a Breaker Block more reliable than a random short entry?',
      options: ['It is in a premium zone AND is a former support turned resistance — dual confluence', 'It is any zone that price revisits', 'It is defined by the 50% of any swing range'],
      correct: 0,
      explanation: 'The Breaker Block is powerful because it sits at a former support (now resistance) AND likely within a premium zone — double confluence. Institutions are selling back to the zone where they previously bought, offloading positions.',
    },
    result: 'worked',
    rAchieved: 3.3,
    explanation: 'Price rejected the Breaker Block with a wick, never closing above the former OB zone. Sold 3.3R to the SSL at the prior swing low.',
    tvSymbol: 'CME_MINI:NQ1!',
    tvInterval: '15',
  },

  // ── 10. PREMIUM/DISCOUNT ADVANCED ─────────────────────────────────────────
  {
    id: 's10',
    title: 'OB in Discount — Only Buy Discount',
    category: 'fvg',
    difficulty: 'advanced',
    instrument: 'GC',
    timeframe: '1H',
    session: 'NY AM',
    htfContext: 'Gold (GC) is in a weekly bullish trend. The 4H swing from last week\'s low to this week\'s high defines the current range.',
    sessionContext: 'NY AM. Gold pulled back from the weekly high. The 4H swing range is established — 50% level (equilibrium) is marked. A bullish OB sits below equilibrium (in discount).',
    beforeCandles: [
      [10,30,50,24,56],[34,48,68,42,74],[58,65,85,58,92],
      [82,82,100,75,106],[106,98,115,92,122],
      // Pullback
      [130,112,90,106,118],[154,88,72,82,94],[178,70,55,64,76],[202,52,38,46,58],
    ],
    beforeZones: [
      { x:10,y:12,w:270,h:58,type:ZR },
      { x:10,y:70,w:270,h:68,type:ZG },
    ],
    beforeLines: [
      { x1:10,y1:70,x2:280,y2:70,color:'rgba(148,163,184,0.6)',dashed:true,label:'EQ 50%',lx:14,ly:66 },
      { x1:178,y1:55,x2:280,y2:55,color:'rgba(96,165,250,0.5)',dashed:true,label:'Bullish OB',lx:182,ly:51 },
    ],
    afterCandles: [
      [226,36,22,30,42],[250,20,12,14,28],[274,14,8,8,20],[298,10,4,4,16],
    ],
    afterZones: [
      { x:10,y:12,w:310,h:58,type:ZR },
      { x:10,y:70,w:310,h:68,type:ZG },
    ],
    q1: {
      prompt: 'The Bullish OB is below the 50% equilibrium line. What does this mean for the trade?',
      options: ['Avoid it — OBs only work above equilibrium', 'High probability long — discount OB aligns with ICT buy-in-discount rule', 'Premium zone — short from this level', 'Wait for price to reach equilibrium first'],
      correct: 1,
      explanation: 'ICT rule: only buy in discount (below 50% of the range), only sell in premium (above 50%). A bullish OB sitting in discount is the highest-probability long setup — price + structure + P/D zone all aligned.',
    },
    q2: {
      prompt: 'What direction is correct for this Gold setup?',
      options: ['Short — pullback from the high', 'Long — buy the discount OB with weekly bullish bias', 'Wait — P/D analysis is inconclusive'],
      correct: 1,
      explanation: 'Weekly bullish + discount OB + HTF pullback = long. Buying from discount with the trend is the highest probability play in ICT.',
    },
    q3: {
      prompt: 'What is the target for this long trade?',
      options: ['The 50% equilibrium', 'The weekly high / BSL in the premium zone (above 62%)', 'The prior swing low'],
      correct: 1,
      explanation: 'Buying discount and targeting premium — specifically the BSL above the weekly high. That is the full ICT model: buy discount, sell premium.',
    },
    q4: {
      prompt: 'If price continues below the OB, what does that mean?',
      options: ['Add to the long — more discount', 'The trade is invalid — close it. OB violated means the thesis is wrong', 'Set a wider stop below the weekly low'],
      correct: 1,
      explanation: 'A bullish OB violation (price closes below it) means the zone failed. The model is wrong — close the trade. Never add to a losing position when the structure is violated.',
    },
    result: 'worked',
    rAchieved: 3.8,
    explanation: 'Gold bounced from the discount bullish OB, rallied through equilibrium, and delivered 3.8R to the BSL at the weekly high.',
    tvSymbol: 'COMEX:GC1!',
    tvInterval: '60',
  },

  // ── 11. NO TRADE SETUP (WAIT) ─────────────────────────────────────────────
  {
    id: 's11',
    title: 'FOMC Day — The Correct Answer is Wait',
    category: 'full-model',
    difficulty: 'beginner',
    instrument: 'NQ',
    timeframe: '15m',
    session: 'NY AM',
    htfContext: 'FOMC announcement is at 2:00 PM EST today. NQ has been choppy with no clear directional structure pre-event.',
    sessionContext: 'NY AM on FOMC day. No clean ICT setups have formed. Price is oscillating around the daily open with equal highs and equal lows forming — engineered liquidity on both sides.',
    beforeCandles: [
      [10,65,55,60,70],[34,52,62,46,68],[58,60,50,54,66],
      [82,48,58,42,64],[106,55,45,50,60],[130,42,52,36,58],
      [154,50,40,44,56],[178,38,48,32,54],[202,45,55,40,60],
    ],
    beforeLines: [
      { x1:10,y1:42,x2:220,y2:42,color:'rgba(52,211,153,0.4)',dashed:true,label:'Equal Highs',lx:14,ly:38 },
      { x1:10,y1:70,x2:220,y2:70,color:'rgba(248,113,113,0.4)',dashed:true,label:'Equal Lows',lx:14,ly:74 },
    ],
    afterCandles: [
      [226,52,65,46,70],[250,62,48,56,68],[274,45,60,38,65],[298,58,44,52,64],
    ],
    q1: {
      prompt: 'What is notable about the chart pattern on an FOMC day?',
      options: ['Clear directional setup forming — trade it', 'Choppy, equal highs and lows — engineered liquidity on both sides, no clean bias', 'A premium zone is forming — short only', 'London has given a clear direction — follow it'],
      correct: 1,
      explanation: 'Equal highs and equal lows with no structural bias is a trap — price is building liquidity on both sides before the FOMC event. Trading into this is gambling, not ICT.',
    },
    q2: {
      prompt: 'What should you do before a high-impact event like FOMC?',
      options: ['Trade aggressively — FOMC always moves the market', 'Wait — no clean setup + high-impact event = sit out or reduce size significantly', 'Short the equal highs — they will be swept'],
      correct: 1,
      explanation: 'ICT explicitly teaches to avoid trading into high-impact news events. The chop pre-FOMC is designed to trap traders. The correct decision is to wait or reduce to minimum size.',
    },
    q3: {
      prompt: 'If you must trade FOMC day, what is the safest approach?',
      options: ['Trade the 5 minutes before the announcement', 'Wait until AFTER the announcement, then trade the first clean ICT setup once structure is established', 'Enter both sides with equal size to profit either way'],
      correct: 1,
      explanation: 'After FOMC, wait for the initial volatility to settle, then look for the first clean ICT setup once direction is established. The initial spike is manipulation — the real move comes after.',
    },
    q4: {
      prompt: 'Equal highs and equal lows forming pre-FOMC tell you what?',
      options: ['Price is consolidating — trade the range', 'Both sides of liquidity will be tested — likely Judas in one direction then real move in the other after FOMC', 'The market is efficient — no edge possible'],
      correct: 1,
      explanation: 'Equal highs and lows = engineered liquidity on both sides. FOMC will likely trigger a Judas move (sweep one side) before delivering the real post-announcement direction. Identifying which side is the Judas is only clear after the fact.',
    },
    result: 'failed',
    rAchieved: null,
    explanation: 'The correct result here is "no trade." Any trader who entered pre-FOMC was stopped out by the whipsaw. The setup was not there — protecting capital IS the trade on FOMC days.',
    tvSymbol: 'CME_MINI:NQ1!',
    tvInterval: '15',
  },

  // ── 12. DISPLACEMENT ADVANCED ─────────────────────────────────────────────
  {
    id: 's12',
    title: 'Displacement FVG — First Retracement Short',
    category: 'fvg',
    difficulty: 'advanced',
    instrument: 'NQ',
    timeframe: '5m',
    session: 'NY AM',
    htfContext: 'Weekly bearish. 4H BOS to the downside this week. Daily bias short.',
    sessionContext: 'NY AM. A single 5m candle moved 80+ NQ points — displacement. This is 3× the average candle size. A bearish FVG is left below the displacement candle. Price is now pulling back to fill part of it.',
    beforeCandles: [
      [10,35,55,28,62],[34,52,68,45,74],[58,65,80,58,86],
      // DISPLACEMENT
      [82,78,12,8,84],
      // Post-displacement small candles
      [106,14,8,5,20],[130,10,5,3,15],
      // Pullback
      [154,6,28,2,32],[178,26,45,20,50],[202,42,58,36,64],
    ],
    beforeZones: [{ x:58,y:28,w:190,h:38,type:ZA }],
    beforeLines: [
      { x1:58,y1:28,x2:248,y2:28,color:'rgba(245,158,11,0.4)',dashed:true },
      { x1:58,y1:66,x2:248,y2:66,color:'rgba(245,158,11,0.4)',dashed:true,label:'Displacement FVG',lx:62,ly:24 },
    ],
    afterCandles: [
      [226,56,70,50,76],[250,68,82,62,88],[274,80,95,74,100],
    ],
    q1: {
      prompt: 'A single 5m candle moved 80+ points. What does this signal in ICT?',
      options: ['Random volatility — ignore it', 'Displacement — institutional order flow aggressively delivering price, confirming direction', 'A liquidity sweep — price will return to the origin', 'Manipulation — fade the move immediately'],
      correct: 1,
      explanation: 'A single candle moving 2-3× the average range with full body is displacement — the most powerful signal in ICT. It confirms institutional intent and always leaves a FVG that is high-probability to trade from.',
    },
    q2: {
      prompt: 'Price is pulling back into the displacement FVG. What do you do?',
      options: ['Long — the pullback is bullish', 'Short — sell the FVG retracement in the direction of displacement', 'Wait — displacement candles are too volatile'],
      correct: 1,
      explanation: 'Displacement was bearish (big down candle). Daily and weekly are bearish. Pullback into the FVG = sell opportunity. The FVG is a bearish zone after bearish displacement.',
    },
    q3: {
      prompt: 'What is special about the first retracement into a displacement FVG?',
      options: ['It is the riskiest — wait for the third touch', 'It is the highest probability entry — smart money defends the FVG with the most force on the first touch', 'It requires confirmation from a lower timeframe'],
      correct: 1,
      explanation: 'The first retracement into a displacement FVG is the highest probability entry because the institutional orders that created the displacement are still resting at those levels. First touch is cleanest.',
    },
    q4: {
      prompt: 'What invalidates this short trade from the displacement FVG?',
      options: ['Price touching the top of the FVG', 'Price closing fully above the FVG (gap entirely filled and closed above)', 'Price moving sideways in the FVG for more than 2 candles'],
      correct: 1,
      explanation: 'Closing above the FVG means the imbalance is fully rebalanced and the displacement is no longer valid. A close inside the FVG is still fine — the zone still has weight. Only a full close above invalidates.',
    },
    result: 'worked',
    rAchieved: 4.2,
    explanation: 'NQ pulled back to 62% of the displacement FVG, wick rejected, and continued the displacement move for 4.2R. First-touch FVG after displacement is one of the cleanest ICT patterns.',
    tvSymbol: 'CME_MINI:NQ1!',
    tvInterval: '5',
  },
]

// Helper
export function getByCategory(cat: Category) {
  return scenarios.filter(s => s.category === cat)
}
export function getByDifficulty(d: Difficulty) {
  return scenarios.filter(s => s.difficulty === d)
}
