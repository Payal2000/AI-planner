'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionHeader from './ui/SectionHeader'
import FadeInView from './ui/FadeInView'
import { createClient } from '@/lib/supabase/client'
import { useSelectedDate } from '@/context/DateContext'

const habits = [
  '🏋️ Morning Workout (fasted)',
  '💌 3+ Cold Outreach',
  '💻 5 LeetCode Problems',
  '📚 3 hrs Study',
  '🔨 1 hr Build',
  '📋 5+ Applications',
  '💧 8 Glasses Water',
  '🌙 Skincare Routine',
  '😴 Sleep by 10:30 PM',
  '🧘 Evening Workout (30 min)',
]

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekStart(date: Date): string {
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((day + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

export default function HabitTracker() {
  const supabase = createClient()
  const { selectedDate } = useSelectedDate()
  const weekStart = getWeekStart(selectedDate)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [authChecked, setAuthChecked] = useState(false)

  const storageKey = useMemo(() => `habit-week-${weekStart}`, [weekStart])
  const weekLabel = useMemo(() => {
    return new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }, [weekStart])

  const toRecord = (s: Set<string>) => Object.fromEntries([...s].map(k => [k, true]))
  const fromRecord = (r: Record<string, boolean>) =>
    new Set(Object.entries(r).filter(([, v]) => v).map(([k]) => k))

  const readLocal = (): Set<string> => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return new Set()
      const parsed = JSON.parse(raw)
      return fromRecord(typeof parsed === 'object' && parsed !== null ? parsed : {})
    } catch { return new Set() }
  }

  const writeLocal = (s: Set<string>) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(toRecord(s)))
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setUserId(null)
        setSelected(readLocal())
        setLoading(false)
        setAuthChecked(true)
        return
      }
      setUserId(user.id)
      const { data: row } = await supabase
        .from('habit_weeks')
        .select('filled')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .maybeSingle()
      if (!cancelled) {
        setSelected(row?.filled ? fromRecord(row.filled) : new Set())
        setLoading(false)
        setAuthChecked(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  const persist = async (next: Set<string>) => {
    setSelected(next)
    if (!userId) { writeLocal(next); return }
    setStatus('saving')
    const { error } = await supabase.from('habit_weeks').upsert(
      { user_id: userId, week_start: weekStart, filled: toRecord(next), updated_at: new Date().toISOString() },
      { onConflict: 'user_id,week_start' },
    )
    if (error) { setStatus('error') } else { setStatus('saved'); setTimeout(() => setStatus('idle'), 2000) }
  }

  const toggle = (key: string) => {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    persist(next)
  }

  const clearAll = () => persist(new Set())

  // ── Habit Analysis ──
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [analysis, setAnalysis] = useState('')

  const analyseHabits = async () => {
    setAnalysisStatus('loading')
    try {
      const res = await fetch('/api/agent/habit-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('API error')
      const json = await res.json()
      setAnalysis(json.analysis)
      setAnalysisStatus('done')
    } catch {
      setAnalysisStatus('error')
    }
  }

  // ── Weekly Wrap ──
  const [wrapStatus, setWrapStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [wrap, setWrap] = useState('')
  const [wrapSavedTo, setWrapSavedTo] = useState('')

  const generateWrap = async () => {
    setWrapStatus('loading')
    try {
      const res = await fetch('/api/agent/weekly-wrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart }),
      })
      if (!res.ok) throw new Error('API error')
      const json = await res.json()
      setWrap(json.wrap)
      setWrapSavedTo(json.savedTo ?? '')
      setWrapStatus('done')
    } catch {
      setWrapStatus('error')
    }
  }

  const Bullet = ({ hi, day, mobile = false }: { hi: number; day: string; mobile?: boolean }) => {
    const key = `${hi}-${day}`
    const isFilled = selected.has(key)
    const size = mobile ? 'w-6 h-6' : 'w-5 h-5 sm:w-[22px] sm:h-[22px]'
    return (
      <motion.button
        onClick={() => toggle(key)}
        disabled={loading}
        className={`${size} rounded-full border-2 inline-block cursor-pointer transition-colors`}
        style={{
          borderColor: isFilled ? '#b5375a' : '#f5d5de',
          background: isFilled ? '#c9445e' : 'transparent',
        }}
        whileTap={loading ? undefined : { scale: 0.75 }}
        whileHover={{ borderColor: '#e8a0b4', backgroundColor: isFilled ? '#c9445e' : '#fdf0f4' }}
        transition={{ duration: 0.15 }}
        aria-label={`Toggle ${habits[hi]} on ${day}`}
      />
    )
  }

  return (
    <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12" id="habits">
      <SectionHeader
        icon="✅"
        label="Stay Consistent"
        title="Habit Tracker"
        subtitle="Small daily actions compound into massive results."
      />

      <FadeInView delay={0.1}>
        <div className="bg-white rounded-[20px] shadow-card overflow-hidden">

          {/* ── Header ── */}
          <div
            className="px-4 sm:px-9 py-5 sm:py-7 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-wrap bg-white border-b border-petal-light"
          >
            <div>
              <h3 className="font-playfair text-2xl text-ink-dark mb-1">This Week&apos;s Habits</h3>
              <p className="font-cormorant text-[15px] text-ink-soft" suppressHydrationWarning>Week starting {weekLabel}</p>
              {!userId && authChecked && (
                <p className="text-[11px] text-ink-faint mt-0.5">Not signed in — progress saved locally only.</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <AnimatePresence>
                {status === 'saved' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-[11px] text-petal-deep font-semibold bg-white/70 px-3 py-1 rounded-full"
                  >
                    ✓ Saved
                  </motion.span>
                )}
              </AnimatePresence>

              {selected.size > 0 && (
                <motion.button
                  onClick={clearAll}
                  className="text-[11px] font-semibold tracking-wider uppercase text-ink-soft bg-white/70 hover:bg-white px-3.5 py-1.5 rounded-full transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  Clear All
                </motion.button>
              )}

              <motion.button
                onClick={analyseHabits}
                disabled={analysisStatus === 'loading' || loading}
                className="text-[11px] font-semibold tracking-wider uppercase text-petal-deep bg-white/70 hover:bg-white px-3.5 py-1.5 rounded-full transition-colors disabled:opacity-50"
                whileTap={{ scale: 0.95 }}
              >
                {analysisStatus === 'loading' ? 'Analysing…' : '🔍 Analyse'}
              </motion.button>

              <motion.button
                onClick={generateWrap}
                disabled={wrapStatus === 'loading'}
                className="text-[11px] font-semibold tracking-wider uppercase text-petal-deep bg-white/70 hover:bg-white px-3.5 py-1.5 rounded-full transition-colors disabled:opacity-50"
                whileTap={{ scale: 0.95 }}
              >
                {wrapStatus === 'loading' ? 'Writing…' : '📝 Weekly Wrap'}
              </motion.button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="p-4 sm:p-7 md:p-9">

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse min-w-[520px]">
                <thead>
                  <tr>
                    <th className="text-left text-[11px] font-semibold tracking-[1px] uppercase text-ink-soft py-2.5 px-1.5 w-[200px]">Habit</th>
                    {days.map(d => (
                      <th key={d} className="text-center text-[11px] font-semibold tracking-[1px] uppercase text-ink-soft py-2.5 px-1">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {habits.map((habit, hi) => (
                    <motion.tr
                      key={habit}
                      className="border-b"
                      style={{ borderColor: 'rgba(200,160,170,0.08)' }}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: hi * 0.04 }}
                    >
                      <td className="text-left text-[13px] text-ink-mid py-2.5 px-1.5">{habit}</td>
                      {days.map(day => (
                        <td key={day} className="text-center py-2.5 px-1">
                          <Bullet hi={hi} day={day} />
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-4">
              {habits.map((habit, hi) => (
                <div key={habit} className="border border-[rgba(200,160,170,0.2)] rounded-2xl p-4 bg-warm-white/80">
                  <p className="text-[13px] font-medium text-ink-mid mb-3">{habit}</p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {days.map(day => (
                      <div key={day} className="flex flex-col items-center gap-1">
                        <span className="text-[9px] font-semibold uppercase text-ink-faint">{day}</span>
                        <Bullet hi={hi} day={day} mobile />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Habit Analysis Panel */}
            <AnimatePresence>
              {(analysisStatus === 'done' || analysisStatus === 'error') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div
                    className="mt-6 rounded-[16px] p-5 border border-petal-light"
                    style={{ background: '#fdf0f4' }}
                  >
                    {analysisStatus === 'done' ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-semibold tracking-[3px] uppercase text-petal">🔍 4-Week Habit Insights</p>
                          <button onClick={() => setAnalysisStatus('idle')} className="text-[11px] text-ink-faint hover:text-ink-soft transition-colors">
                            Dismiss
                          </button>
                        </div>
                        <p className="font-cormorant text-[16px] text-ink-mid leading-relaxed whitespace-pre-wrap">{analysis}</p>
                      </>
                    ) : (
                      <p className="text-[12px] text-red-400">Could not analyse habits — check your OPENAI_API_KEY and try again.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Weekly Wrap Panel */}
            <AnimatePresence>
              {(wrapStatus === 'done' || wrapStatus === 'error') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div
                    className="mt-4 rounded-[16px] p-5 border border-petal-light"
                    style={{ background: '#fdf0f4' }}
                  >
                    {wrapStatus === 'done' ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-[10px] font-semibold tracking-[3px] uppercase text-petal">📝 Weekly Wrap-Up</p>
                            {wrapSavedTo && (
                              <p className="text-[10px] text-ink-faint mt-0.5">Auto-saved to {new Date(wrapSavedTo + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} notes</p>
                            )}
                          </div>
                          <button onClick={() => setWrapStatus('idle')} className="text-[11px] text-ink-faint hover:text-ink-soft transition-colors">
                            Dismiss
                          </button>
                        </div>
                        <p className="font-cormorant text-[16px] text-ink-mid leading-relaxed whitespace-pre-wrap">{wrap}</p>
                      </>
                    ) : (
                      <p className="text-[12px] text-red-400">Could not generate wrap-up — check your OPENAI_API_KEY and try again.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </FadeInView>
    </section>
  )
}
