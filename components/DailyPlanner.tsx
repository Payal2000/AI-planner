'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionHeader from './ui/SectionHeader'
import FadeInView from './ui/FadeInView'
import { createClient } from '@/lib/supabase/client'
import { useSelectedDate } from '@/context/DateContext'

// ─── Types ───────────────────────────────────────────────────────────────────

type CheckItem = { text: string; done: boolean }
type AppItem   = { company: string; role: string; done: boolean }

interface DayData {
  intention:    string
  priorities:   CheckItem[]
  leetcode:     CheckItem[]
  studyNotes:   string
  buildLog:     string
  outreach:     CheckItem[]
  applications: AppItem[]
  reflection:   string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultData = (): DayData => ({
  intention:    '',
  priorities:   Array.from({ length: 3 }, () => ({ text: '', done: false })),
  leetcode:     Array.from({ length: 5 }, () => ({ text: '', done: false })),
  studyNotes:   '',
  buildLog:     '',
  outreach:     Array.from({ length: 3 }, () => ({ text: '', done: false })),
  applications: Array.from({ length: 5 }, () => ({ company: '', role: '', done: false })),
  reflection:   '',
})

const toKey   = (d: Date) => d.toISOString().split('T')[0]
const addDays = (d: Date, n: number) => { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd }
const isToday = (d: Date) => toKey(d) === toKey(new Date())
const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[3px] uppercase text-petal mb-3 mt-6 first:mt-0">
      {children}
    </p>
  )
}

function Checkbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <motion.button
      onClick={onToggle}
      className="w-5 h-5 rounded-[4px] flex-shrink-0 border-2 flex items-center justify-center"
      style={{
        borderColor: checked ? '#c77d94' : '#f5d5de',
        background:  checked ? '#e8a0b4' : 'transparent',
      }}
      whileTap={{ scale: 0.8 }}
      transition={{ duration: 0.12 }}
      aria-label="toggle"
    >
      {checked && (
        <motion.svg
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="w-3 h-3 text-white"
          fill="none" viewBox="0 0 12 10" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M1 5l3.5 3.5L11 1" />
        </motion.svg>
      )}
    </motion.button>
  )
}

function TextInput({
  value, onChange, onEnter, placeholder, className = '', strikethrough = false,
}: {
  value: string; onChange: (v: string) => void; onEnter?: () => void; placeholder: string;
  className?: string; strikethrough?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter() }}
      placeholder={placeholder}
      className={`flex-1 min-w-0 bg-transparent outline-none text-[14px] placeholder:text-ink-faint border-b border-transparent focus:border-petal-light transition-colors ${strikethrough ? 'line-through text-ink-faint' : 'text-ink-mid'} ${className}`}
    />
  )
}

function Textarea({
  value, onChange, placeholder, minHeight = 60,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; minHeight?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ minHeight }}
      className="w-full border border-dashed border-petal-light rounded-lg p-3 font-dm text-[13px] text-ink-mid bg-warm-white resize-y outline-none focus:border-petal transition-colors placeholder:text-ink-faint"
    />
  )
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-petal-pale rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #e8a0b4, #c77d94)' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[12px] font-semibold text-petal-deep whitespace-nowrap">
        {done}/{total} done · {pct}%
      </span>
    </div>
  )
}

function SavedBadge({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="text-[11px] text-petal-deep font-semibold bg-petal-pale px-3 py-1 rounded-full"
        >
          ✓ Saved
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[12px] text-petal-deep hover:text-petal font-semibold mt-2 transition-colors group"
      whileTap={{ scale: 0.95 }}
    >
      <span className="w-4 h-4 rounded-full border-[1.5px] border-petal-deep group-hover:border-petal flex items-center justify-center text-[10px] transition-colors">
        +
      </span>
      {label}
    </motion.button>
  )
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-ink-faint hover:text-petal-deep transition-colors rounded"
      whileTap={{ scale: 0.85 }}
      aria-label="Remove"
      title="Remove"
    >
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3 h-3">
        <path d="M2 7h10" />
      </svg>
    </motion.button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyPlanner() {
  const supabase   = createClient()
  const { selectedDate: date, setSelectedDate: setDate } = useSelectedDate()
  const [data,     setData]     = useState<DayData>(defaultData())
  const [loading,  setLoading]  = useState(true)
  const [savedMsg, setSavedMsg] = useState(false)
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstLoad = useRef(true)
  // Preserve non-planner fields (e.g. calendar notes) so saves don't wipe them
  const extraFields = useRef<Record<string, unknown>>({})

  // Load from Supabase when date changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    isFirstLoad.current = true

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: row } = await supabase
        .from('daily_plans')
        .select('data')
        .eq('user_id', user.id)
        .eq('date', toKey(date))
        .maybeSingle()

      if (!cancelled) {
        const raw = row?.data ?? {}
        // Preserve non-planner keys (e.g. notes from the calendar widget)
        const { intention, priorities, leetcode, studyNotes, buildLog, outreach, applications, reflection, ...rest } = raw as Record<string, unknown>
        extraFields.current = rest
        // Merge with defaultData so missing fields always have the right shape
        setData({ ...defaultData(), ...(raw as Partial<DayData>) })
        setLoading(false)
        // Allow saves only after load settles
        setTimeout(() => { isFirstLoad.current = false }, 0)
      }
    }

    load()
    return () => { cancelled = true }
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save to Supabase whenever data changes (debounced, skip initial load)
  useEffect(() => {
    if (loading || isFirstLoad.current) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Merge planner data with preserved extra fields (e.g. calendar notes)
      const merged = { ...extraFields.current, ...data }
      await supabase.from('daily_plans').upsert(
        { user_id: user.id, date: toKey(date), data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date' },
      )

      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 1800)
    }, 600)

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(<K extends keyof DayData>(key: K, value: DayData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateCheckItem = useCallback(
    (key: 'priorities' | 'leetcode' | 'outreach', i: number, field: keyof CheckItem, val: string | boolean) => {
      setData((prev) => {
        const arr = [...prev[key]] as CheckItem[]
        arr[i] = { ...arr[i], [field]: val }
        return { ...prev, [key]: arr }
      })
    }, []
  )

  const addCheckItem = useCallback((key: 'priorities' | 'leetcode' | 'outreach') => {
    setData((prev) => ({
      ...prev,
      [key]: [...prev[key], { text: '', done: false }],
    }))
  }, [])

  const removeCheckItem = useCallback((key: 'priorities' | 'leetcode' | 'outreach', i: number) => {
    setData((prev) => {
      const arr = [...prev[key]] as CheckItem[]
      arr.splice(i, 1)
      return { ...prev, [key]: arr }
    })
  }, [])

  const updateApp = useCallback((i: number, field: keyof AppItem, val: string | boolean) => {
    setData((prev) => {
      const arr = [...prev.applications] as AppItem[]
      arr[i] = { ...arr[i], [field]: val }
      return { ...prev, applications: arr }
    })
  }, [])

  const addApp = useCallback(() => {
    setData((prev) => ({
      ...prev,
      applications: [...prev.applications, { company: '', role: '', done: false }],
    }))
  }, [])

  const removeApp = useCallback((i: number) => {
    setData((prev) => {
      const arr = [...prev.applications]
      arr.splice(i, 1)
      return { ...prev, applications: arr }
    })
  }, [])

  const clearDay = () => {
    if (confirm('Clear all data for this day?')) {
      setData(defaultData())
    }
  }

  // ── Study Plan ──
  const [planStatus, setPlanStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [studyPlan, setStudyPlan] = useState('')

  const generateStudyPlan = async () => {
    setPlanStatus('loading')
    try {
      const res = await fetch('/api/agent/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: toKey(date) }),
      })
      if (!res.ok) throw new Error('API error')
      const json = await res.json()
      setStudyPlan(json.plan)
      setPlanStatus('done')
    } catch {
      setPlanStatus('error')
    }
  }

  // ── Daily Brief ──
  const [briefStatus, setBriefStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [brief, setBrief] = useState('')
  const [briefSaved, setBriefSaved] = useState(false)

  const generateBrief = async () => {
    setBriefStatus('loading')
    try {
      const res = await fetch('/api/agent/daily-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: toKey(date) }),
      })
      if (!res.ok) throw new Error('API error')
      const json = await res.json()
      setBrief(json.brief)
      setBriefStatus('done')
    } catch {
      setBriefStatus('error')
    }
  }

  const saveBriefToNotes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: existing } = await supabase.from('daily_plans').select('data').eq('user_id', user.id).eq('date', toKey(date)).maybeSingle()
    const merged = { ...(existing?.data ?? {}), notes: brief }
    await supabase.from('daily_plans').upsert(
      { user_id: user.id, date: toKey(date), data: merged, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' },
    )
    setBriefSaved(true)
    setTimeout(() => setBriefSaved(false), 2000)
  }

  // Progress
  const allCheckable = [...data.priorities, ...data.leetcode, ...data.outreach, ...data.applications]
  const doneCount    = allCheckable.filter((i) => i.done).length
  const totalCount   = allCheckable.filter((i) =>
    'text' in i ? i.text.trim() !== '' : (i.company.trim() !== '' || i.role.trim() !== '')
  ).length

  return (
    <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12" id="daily">
      <SectionHeader
        icon="📝"
        label="Plan Your Day"
        title="Daily Planner"
        subtitle="Your daily blueprint for getting things done beautifully."
      />

      <FadeInView delay={0.1}>
        <div className="bg-white rounded-[20px] shadow-card overflow-hidden">

          {/* ── Header ── */}
          <div
            className="px-4 sm:px-9 py-5 sm:py-7 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 flex-wrap"
            style={{ background: '#fdf0f4' }}
          >
            <div>
              <h3 className="font-playfair text-2xl text-ink-dark mb-1">Today&apos;s Plan</h3>
              <p className="font-cormorant text-[15px] text-ink-soft" suppressHydrationWarning>{fmtDate(date)}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
              {/* Date nav */}
              <motion.button
                onClick={() => setDate(addDays(date, -1))}
                className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-ink-mid hover:bg-white transition-colors text-sm"
                whileTap={{ scale: 0.9 }}
              >
                ‹
              </motion.button>

              {!isToday(date) && (
                <motion.button
                  onClick={() => setDate(new Date())}
                  className="text-[11px] font-semibold tracking-wider uppercase text-petal-deep bg-white/70 hover:bg-white px-3.5 py-1.5 rounded-full transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  Today
                </motion.button>
              )}

              <motion.button
                onClick={() => setDate(addDays(date, 1))}
                className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-ink-mid hover:bg-white transition-colors text-sm"
                whileTap={{ scale: 0.9 }}
              >
                ›
              </motion.button>

              <SavedBadge show={savedMsg} />

              <motion.button
                onClick={generateStudyPlan}
                disabled={planStatus === 'loading'}
                className="text-[11px] font-semibold tracking-wider uppercase text-petal-deep bg-white/70 hover:bg-white px-3.5 py-1.5 rounded-full transition-colors disabled:opacity-50"
                whileTap={{ scale: 0.95 }}
              >
                {planStatus === 'loading' ? 'Planning…' : '📚 Study Plan'}
              </motion.button>

              <motion.button
                onClick={generateBrief}
                disabled={briefStatus === 'loading'}
                className="text-[11px] font-semibold tracking-wider uppercase text-petal-deep bg-white/70 hover:bg-white px-3.5 py-1.5 rounded-full transition-colors disabled:opacity-50"
                whileTap={{ scale: 0.95 }}
              >
                {briefStatus === 'loading' ? 'Generating…' : '✨ Daily Brief'}
              </motion.button>

              <motion.button
                onClick={clearDay}
                className="text-[11px] text-ink-faint hover:text-ink-soft transition-colors ml-1"
                whileTap={{ scale: 0.95 }}
              >
                Clear
              </motion.button>
            </div>
          </div>

          {/* ── Progress bar ── */}
          <div className="px-4 sm:px-9 py-3 border-b" style={{ borderColor: 'rgba(200,160,170,0.1)' }}>
            <ProgressBar done={doneCount} total={totalCount} />
          </div>

          {/* ── Daily Brief Panel ── */}
          <AnimatePresence>
            {briefStatus === 'done' && brief && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div
                  className="mx-4 sm:mx-9 my-5 rounded-[16px] p-5 border border-petal-light"
                  style={{ background: '#fdf0f4' }}
                >
                  <p className="text-[10px] font-semibold tracking-[3px] uppercase text-petal mb-3">✨ Your Daily Brief</p>
                  <p className="font-cormorant text-[16px] text-ink-mid leading-relaxed whitespace-pre-wrap">{brief}</p>
                  <div className="flex items-center gap-3 mt-4">
                    <motion.button
                      onClick={saveBriefToNotes}
                      className="text-[11px] font-semibold tracking-wide uppercase px-4 py-1.5 rounded-full bg-petal-deep text-white hover:bg-petal transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      Save to Notes
                    </motion.button>
                    {briefSaved && <span className="text-[11px] font-semibold text-petal-deep">✓ Saved</span>}
                    <button onClick={() => setBriefStatus('idle')} className="text-[11px] text-ink-faint hover:text-ink-soft transition-colors">
                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
            {briefStatus === 'error' && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="px-4 sm:px-9 py-2 text-[12px] text-red-400"
              >
                Could not generate brief — check your OPENAI_API_KEY and try again.
              </motion.p>
            )}
          </AnimatePresence>

          {/* ── Study Plan Panel ── */}
          <AnimatePresence>
            {(planStatus === 'done' || planStatus === 'error') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div
                  className="mx-4 sm:mx-9 my-5 rounded-[16px] p-5 border border-petal-light"
                  style={{ background: '#fdf0f4' }}
                >
                  {planStatus === 'done' ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-semibold tracking-[3px] uppercase text-petal">📚 5-Day Study Plan</p>
                        <button onClick={() => setPlanStatus('idle')} className="text-[11px] text-ink-faint hover:text-ink-soft transition-colors">Dismiss</button>
                      </div>
                      <p className="font-cormorant text-[16px] text-ink-mid leading-relaxed whitespace-pre-wrap">{studyPlan}</p>
                    </>
                  ) : (
                    <p className="text-[12px] text-red-400">Could not generate study plan — check your OPENAI_API_KEY and try again.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Two-col body ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={toKey(date)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 md:grid-cols-2"
            >
              {/* ── Left column ── */}
              <div className="p-4 sm:p-6 md:p-9 border-b md:border-b-0 md:border-r" style={{ borderColor: 'rgba(200,160,170,0.1)' }}>

                <SectionLabel>🌸 Morning Intention</SectionLabel>
                <Textarea
                  value={data.intention}
                  onChange={(v) => update('intention', v)}
                  placeholder="What's your focus for today?"
                />

                <SectionLabel>🎯 Top Priorities</SectionLabel>
                <AnimatePresence>
                  <ul className="list-none space-y-1">
                    {data.priorities.map((item, i) => (
                      <motion.li
                        key={i}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-3 py-1.5 group"
                      >
                        <Checkbox
                          checked={item.done}
                          onToggle={() => updateCheckItem('priorities', i, 'done', !item.done)}
                        />
                        <TextInput
                          value={item.text}
                          onChange={(v) => updateCheckItem('priorities', i, 'text', v)}
                          onEnter={() => { if (i === data.priorities.length - 1) addCheckItem('priorities') }}
                          placeholder={`Priority ${i + 1}`}
                          strikethrough={item.done}
                        />
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <RemoveButton onClick={() => removeCheckItem('priorities', i)} />
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </AnimatePresence>
                <AddRowButton onClick={() => addCheckItem('priorities')} label="Add priority" />

                <SectionLabel>💻 LeetCode Tracker</SectionLabel>
                <AnimatePresence>
                  <ul className="list-none space-y-1">
                    {data.leetcode.map((item, i) => (
                      <motion.li
                        key={i}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-3 py-1.5 group"
                      >
                        <Checkbox
                          checked={item.done}
                          onToggle={() => updateCheckItem('leetcode', i, 'done', !item.done)}
                        />
                        <TextInput
                          value={item.text}
                          onChange={(v) => updateCheckItem('leetcode', i, 'text', v)}
                          onEnter={() => { if (i === data.leetcode.length - 1) addCheckItem('leetcode') }}
                          placeholder={`Problem ${i + 1}: e.g. Two Sum`}
                          strikethrough={item.done}
                        />
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <RemoveButton onClick={() => removeCheckItem('leetcode', i)} />
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </AnimatePresence>
                <AddRowButton onClick={() => addCheckItem('leetcode')} label="Add problem" />

                <SectionLabel>📚 Study Session Notes</SectionLabel>
                <Textarea
                  value={data.studyNotes}
                  onChange={(v) => update('studyNotes', v)}
                  placeholder="Topic studied, key takeaways..."
                  minHeight={80}
                />
              </div>

              {/* ── Right column ── */}
              <div className="p-4 sm:p-6 md:p-9">

                <SectionLabel>🔨 Build Log</SectionLabel>
                <Textarea
                  value={data.buildLog}
                  onChange={(v) => update('buildLog', v)}
                  placeholder="What did you build/ship today?"
                />

                <SectionLabel>💌 Outreach Tracker</SectionLabel>
                <AnimatePresence>
                  <ul className="list-none space-y-1">
                    {data.outreach.map((item, i) => (
                      <motion.li
                        key={i}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-3 py-1.5 group"
                      >
                        <Checkbox
                          checked={item.done}
                          onToggle={() => updateCheckItem('outreach', i, 'done', !item.done)}
                        />
                        <TextInput
                          value={item.text}
                          onChange={(v) => updateCheckItem('outreach', i, 'text', v)}
                          onEnter={() => { if (i === data.outreach.length - 1) addCheckItem('outreach') }}
                          placeholder={`Message ${i + 1}: Name / Company`}
                          strikethrough={item.done}
                        />
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <RemoveButton onClick={() => removeCheckItem('outreach', i)} />
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </AnimatePresence>
                <AddRowButton onClick={() => addCheckItem('outreach')} label="Add contact" />

                <SectionLabel>📋 Applications Sent</SectionLabel>
                <AnimatePresence>
                  <ul className="list-none space-y-1">
                    {data.applications.map((item, i) => (
                      <motion.li
                        key={i}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2 py-1.5 group"
                      >
                        <Checkbox
                          checked={item.done}
                          onToggle={() => updateApp(i, 'done', !item.done)}
                        />
                        <input
                          type="text"
                          value={item.company}
                          onChange={(e) => updateApp(i, 'company', e.target.value)}
                          placeholder="Company"
                          className={`flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-ink-faint border-b border-transparent focus:border-petal-light transition-colors ${item.done ? 'line-through text-ink-faint' : 'text-ink-mid'}`}
                        />
                        <span className="text-ink-faint text-[12px] flex-shrink-0">→</span>
                        <input
                          type="text"
                          value={item.role}
                          onChange={(e) => updateApp(i, 'role', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && i === data.applications.length - 1) addApp() }}
                          placeholder="Role"
                          className={`flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-ink-faint border-b border-transparent focus:border-petal-light transition-colors ${item.done ? 'line-through text-ink-faint' : 'text-ink-mid'}`}
                        />
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <RemoveButton onClick={() => removeApp(i)} />
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </AnimatePresence>
                <AddRowButton onClick={addApp} label="Add application" />

                <SectionLabel>🌙 Evening Reflection</SectionLabel>
                <Textarea
                  value={data.reflection}
                  onChange={(v) => update('reflection', v)}
                  placeholder="Wins, lessons, and what to improve tomorrow..."
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </FadeInView>
    </section>
  )
}
