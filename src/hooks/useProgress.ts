import { useState, useEffect } from 'react'

export interface ScenarioResult {
  scenarioId: string
  score: number       // 0-4 (one point per correct answer)
  answeredAt: string  // ISO
}

const KEY = 'ict-replay-progress'

export function useProgress() {
  const [results, setResults] = useState<ScenarioResult[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') }
    catch { return [] }
  })

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(results)) }, [results])

  const saveResult = (scenarioId: string, score: number) => {
    setResults(p => {
      const existing = p.findIndex(r => r.scenarioId === scenarioId)
      const entry: ScenarioResult = { scenarioId, score, answeredAt: new Date().toISOString() }
      if (existing >= 0) {
        const next = [...p]
        next[existing] = entry
        return next
      }
      return [...p, entry]
    })
  }

  const getResult = (scenarioId: string) => results.find(r => r.scenarioId === scenarioId)

  const totalScore   = results.reduce((s, r) => s + r.score, 0)
  const totalPossible = results.length * 4
  const avgScore     = results.length > 0 ? (totalScore / results.length).toFixed(1) : '—'
  const completed    = results.length
  const perfect      = results.filter(r => r.score === 4).length

  return { results, saveResult, getResult, totalScore, totalPossible, avgScore, completed, perfect }
}
