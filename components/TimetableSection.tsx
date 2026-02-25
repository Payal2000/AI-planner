'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionHeader from './ui/SectionHeader'
import FadeInView from './ui/FadeInView'
import { createClient } from '@/lib/supabase/client'
import { useSelectedDate } from '@/context/DateContext'

type BlockType = 'workout' | 'outreach' | 'leetcode' | 'study' | 'build' | 'apply' | 'break' | 'meal'

interface Block {
  id: string
  time: string
  activity: string
  reason: string
  type: BlockType
}

const defaultSchedule: Block[] = [
  { id: 'd1', time: '6:30 – 6:45', activity: 'Wake Up + Water', type: 'break', reason: 'Hydrate to kickstart metabolism' },
  { id: 'd2', time: '6:45 – 7:00', activity: 'Morning Workout (15 min, fasted)', type: 'workout', reason: 'Peak fat burning — 90% more fat burned before breakfast' },
  { id: 'd3', time: '7:00 – 7:30', activity: 'Breakfast + Get Ready', type: 'meal', reason: 'Fuel your brain for the day ahead' },
  { id: 'd4', time: '7:30 – 8:30', activity: 'Cold Outreach', type: 'outreach', reason: 'Inboxes checked 8–10 AM — highest reply rates' },
  { id: 'd5', time: '8:30 – 8:45', activity: 'Break', type: 'break', reason: 'Reset before deep work' },
  { id: 'd6', time: '8:45 – 10:45', activity: 'LeetCode — 5 New Problems', type: 'leetcode', reason: '9–11 AM = peak analytical focus (Huberman)' },
  { id: 'd7', time: '10:45 – 12:00', activity: 'LeetCode — Review Past 5 Days', type: 'leetcode', reason: 'Short-term memory peaks in morning hours' },
  { id: 'd8', time: '12:00 – 1:00', activity: 'Lunch Break', type: 'meal', reason: 'Full break — no screens' },
  { id: 'd9', time: '1:00 – 4:00', activity: 'Study (3 hrs)', type: 'study', reason: 'Afternoon = best for review, system design & critical thinking' },
  { id: 'd10', time: '4:00 – 4:15', activity: 'Break', type: 'break', reason: 'Rest before creative work' },
  { id: 'd11', time: '4:15 – 5:15', activity: 'Build (1 hr)', type: 'build', reason: 'Late afternoon suits creative & project work' },
  { id: 'd12', time: '5:15 – 5:45', activity: 'Evening Workout (30 min)', type: 'workout', reason: 'Strength & endurance peak in evening; stress relief' },
  { id: 'd13', time: '5:45 – 6:15', activity: 'Freshen Up + Snack', type: 'break', reason: 'Recover and refuel' },
  { id: 'd14', time: '6:15 – 7:15', activity: 'Job Applications', type: 'apply', reason: 'Prep in evening, schedule submissions for next morning 6–10 AM' },
]

const dotColors: Record<string, string> = {
  workout: '#b8c9a3',
  outreach: '#e8a0b4',
  leetcode: '#c9b8e8',
  study: '#a8c8e0',
  build: '#f5c4a1',
  apply: '#e0c88a',
  break: '#f0e0d4',
  meal: '#d4b89c',
}


const typeOptions: { value: BlockType; label: string }[] = [
  { value: 'workout', label: 'Workout' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'leetcode', label: 'LeetCode' },
  { value: 'study', label: 'Study' },
  { value: 'build', label: 'Build' },
  { value: 'apply', label: 'Applications' },
  { value: 'break', label: 'Break' },
  { value: 'meal', label: 'Meals' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10) // 'YYYY-MM-DD'
}

function todayKey() {
  return toDateKey(new Date())
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

// 0 = Monday offset for the 1st of the month
function firstDayOffset(year: number, month: number) {
  const day = new Date(year, month, 1).getDay() // 0=Sun
  return (day + 6) % 7 // Mon=0 … Sun=6
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ─── CalendarWidget ────────────────────────────────────────────────────────────

function CalendarWidget({ isAuthed }: { isAuthed: boolean }) {
  const supabase = createClient()
  const today = todayKey()
  const { selectedDate, setSelectedDate } = useSelectedDate()

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(selectedDate)
    d.setDate(1)
    d.setHours(0,0,0,0)
    return d
  })
  const [selected, setSelected] = useState<string>(toDateKey(selectedDate))

  // Sync calendar view when global date changes externally (e.g. DailyPlanner nav)
  useEffect(() => {
    const key = toDateKey(selectedDate)
    setSelected(key)
    setViewDate(d => {
      const y = selectedDate.getFullYear()
      const m = selectedDate.getMonth()
      if (d.getFullYear() === y && d.getMonth() === m) return d
      return new Date(y, m, 1)
    })
  }, [selectedDate])
  const [notesByDate, setNotesByDate] = useState<Record<string, string>>({})
  const [editNote, setEditNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Load all notes for this month
  const loadMonth = useCallback(async () => {
    if (!isAuthed) return
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${getDaysInMonth(year, month)}`
    const { data } = await supabase
      .from('daily_plans')
      .select('date, data')
      .gte('date', firstDay)
      .lte('date', lastDay)
    if (data) {
      const map: Record<string, string> = {}
      for (const row of data) {
        if (row.data?.notes) map[row.date] = row.data.notes
      }
      setNotesByDate(map)
    }
  }, [isAuthed, year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadMonth() }, [loadMonth])

  // Sync editNote when selected date changes; skip update if it was triggered by our own save
  const justSaved = useRef(false)
  useEffect(() => {
    if (justSaved.current) { justSaved.current = false; return }
    setEditNote(notesByDate[selected] ?? '')
  }, [selected, notesByDate])

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  const saveNote = async () => {
    if (!isAuthed) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Load existing row so we don't overwrite planner data — just update the notes field
      const { data: existing } = await supabase
        .from('daily_plans')
        .select('data')
        .eq('user_id', user.id)
        .eq('date', selected)
        .maybeSingle()
      const merged = { ...(existing?.data ?? {}), notes: editNote }
      await supabase.from('daily_plans').upsert(
        { user_id: user.id, date: selected, data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date' }
      )
      justSaved.current = true
      setNotesByDate(prev => ({ ...prev, [selected]: editNote }))
      setSavedKey(selected)
      setTimeout(() => setSavedKey(null), 2000)
    }
    setSaving(false)
  }

  // Build calendar cells
  const daysInMonth = getDaysInMonth(year, month)
  const offset = firstDayOffset(year, month)
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedDateObj = new Date(selected + 'T12:00:00')
  const selectedLabel = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="bg-white rounded-[20px] shadow-card overflow-hidden">
      {/* Header */}
      <div
        className="px-4 sm:px-9 py-5 sm:py-6 border-b"
        style={{ background: 'linear-gradient(135deg, #f0eafb 0%, #fdf0f4 100%)', borderColor: 'rgba(201,184,232,0.2)' }}
      >
        <h3 className="font-playfair text-[18px] sm:text-[22px] text-ink-dark mb-1">
          Calendar & Daily Notes
        </h3>
        <p className="text-[12px] sm:text-[13px] text-ink-soft">
          Select any date to view or add your notes for that day.
        </p>
      </div>

      <div className="flex flex-col">
        {/* ── Calendar grid ── */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(201,184,232,0.15)' }}>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-petal-pale text-ink-mid transition">
              ‹
            </button>
            <span className="font-playfair text-[15px] text-ink-dark font-medium">
              {MONTH_NAMES[month]} {year}
            </span>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-petal-pale text-ink-mid transition">
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold tracking-wide uppercase text-ink-faint py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />
              const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday = key === today
              const isSelected = key === selected
              const hasNote = !!notesByDate[key]

              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelected(key)
                    setSelectedDate(new Date(key + 'T00:00:00'))
                  }}
                  className={`relative mx-auto flex flex-col items-center justify-center w-9 h-9 rounded-full text-[13px] font-medium transition-all
                    ${isSelected ? 'bg-[#c9b8e8] text-white shadow-md' : isToday ? 'bg-[#fdf0f4] text-[#9b7ecc] font-bold ring-2 ring-[#c9b8e8]/50' : 'text-ink-mid hover:bg-petal-pale'}`}
                >
                  {day}
                  {hasNote && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#c9b8e8]" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-[11px] text-ink-faint">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#fdf0f4] ring-2 ring-[#c9b8e8]/50 inline-block" />
              Today
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#c9b8e8] inline-block" />
              Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#c9b8e8] inline-block" />
              Has note
            </span>
          </div>
        </div>

        {/* ── Notes panel ── */}
        <div className="px-5 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-ink-faint mb-1">
                Notes for
              </p>
              <h4 className="font-playfair text-[16px] sm:text-[18px] text-ink-dark mb-4" suppressHydrationWarning>
                {selectedLabel}
              </h4>

              <textarea
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
                placeholder={isAuthed ? "Add notes, goals, or events for this day…" : "Sign in to save notes for each date."}
                disabled={!isAuthed}
                rows={7}
                className="w-full rounded-xl border border-petal-light bg-warm-white px-4 py-3 text-[13px] text-ink-mid resize-none focus:border-petal outline-none placeholder:text-ink-faint/60 leading-[1.8] disabled:opacity-50"
              />

              <div className="mt-3 flex items-center gap-3">
                <motion.button
                  onClick={saveNote}
                  disabled={!isAuthed || saving}
                  className="text-[12px] font-semibold tracking-wide uppercase px-5 py-2 rounded-full bg-[#c9b8e8] text-white hover:bg-[#b8a4d8] disabled:opacity-50 transition"
                  whileTap={{ scale: 0.95 }}
                >
                  {saving ? 'Saving…' : 'Save Note'}
                </motion.button>
                {savedKey === selected && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] font-semibold text-[#9b7ecc]"
                  >
                    ✓ Saved
                  </motion.span>
                )}
                {!isAuthed && (
                  <span className="text-[11px] text-ink-faint">Sign in to save notes.</span>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ─── TimetableSection ──────────────────────────────────────────────────────────

export default function TimetableSection() {
  const supabase = createClient()
  const { selectedDate } = useSelectedDate()
  const dateKey = selectedDate.toISOString().split('T')[0]

  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [expanded, setExpanded] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // Load per-date timetable from daily_plans
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDirty(false)
    setStatus('idle')

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) { setLoading(false); setAuthChecked(true) }
        return
      }
      if (!cancelled) { setIsAuthed(true); setAuthChecked(true) }

      const { data: row } = await supabase
        .from('daily_plans')
        .select('data')
        .eq('user_id', user.id)
        .eq('date', dateKey)
        .maybeSingle()

      if (!cancelled) {
        const entries = row?.data?.timetable
        const parsed: Block[] = Array.isArray(entries) && entries.length
          ? (entries as Block[]).map((b, i) => ({ ...b, id: b.id ?? `loaded-${i}` }))
          : []
        setBlocks(parsed)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [dateKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const markDirty = () => {
    setDirty(true)
    if (status !== 'idle') setStatus('idle')
  }

  const updateBlock = <K extends keyof Block>(index: number, key: K, value: Block[K]) => {
    setBlocks((prev) => prev.map((block, i) => (i === index ? { ...block, [key]: value } : block)))
    markDirty()
  }

  const addBlock = () => {
    setBlocks((prev) => [...prev, { id: `b-${Date.now()}`, time: '', activity: '', reason: '', type: 'study' }])
    markDirty()
  }

  const clearBlockContent = () => {
    if (!confirm('Clear all content inside the schedule for this date?')) return
    setBlocks(prev => prev.map(b => ({ ...b, time: '', activity: '', reason: '' })))
    markDirty()
  }

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index))
    markDirty()
  }

  const saveBlocks = async () => {
    if (!isAuthed) { alert('Sign in to save your timetable.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setStatus('error'); return }

    // Read-merge-write to preserve other sections on the same date
    const { data: existing } = await supabase
      .from('daily_plans')
      .select('data')
      .eq('user_id', user.id)
      .eq('date', dateKey)
      .maybeSingle()

    const merged = { ...(existing?.data ?? {}), timetable: blocks }
    const { error } = await supabase
      .from('daily_plans')
      .upsert(
        { user_id: user.id, date: dateKey, data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date' },
      )

    if (error) { setStatus('error') } else { setStatus('saved'); setDirty(false) }
    setSaving(false)
  }

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-12" id="timetable">
      <SectionHeader
        icon="⏰"
        label="Research-Backed"
        title="Your Optimized Timetable"
        subtitle="Every block is placed at the time science says your brain and body perform best."
      />

      {/* ── Calendar + Schedule side by side ── */}
      <div className="flex flex-col lg:flex-row gap-6 mb-10">

      <FadeInView delay={0.05} className="lg:w-[360px] flex-shrink-0 lg:self-stretch">
        <CalendarWidget isAuthed={isAuthed} />
      </FadeInView>

      <FadeInView delay={0.1} className="flex-1 min-w-0 lg:self-stretch">
        <div className="bg-white rounded-[20px] shadow-card flex flex-col h-full">
          <div
            className="px-4 sm:px-9 py-5 sm:py-[30px] border-b"
            style={{ background: 'linear-gradient(135deg, #fdf0f4 0%, #f9e4eb 100%)', borderColor: 'rgba(232,160,180,0.15)' }}
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="font-playfair text-[18px] sm:text-[22px] text-ink-dark">
                Daily Schedule — The Glow-Up Routine
              </h3>
              <motion.button
                onClick={clearBlockContent}
                title="Clear all content"
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-petal-light text-ink-faint hover:text-red-400 hover:border-red-200 bg-white transition-colors"
                whileTap={{ scale: 0.9 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </motion.button>
            </div>
            <p className="text-[12px] sm:text-[13px] text-ink-soft">
              Designed around peak cognitive hours, fat-burning windows & recruiter activity
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-ink-mid">
                Customize every slot, then save it as your personal rhythm.
              </p>
              <div className="flex gap-2 flex-wrap">
                <motion.button
                  onClick={() => setExpanded(e => !e)}
                  className="text-[12px] font-semibold tracking-wide uppercase px-4 py-2 rounded-full border border-petal-light text-petal-deep hover:border-petal"
                  whileTap={{ scale: 0.95 }}
                >
                  {expanded ? '↑ Collapse' : `↓ Show All (${blocks.length})`}
                </motion.button>
                <motion.button
                  onClick={addBlock}
                  className="text-[12px] font-semibold tracking-wide uppercase px-4 py-2 rounded-full border border-petal-light text-petal-deep hover:border-petal"
                  whileTap={{ scale: 0.95 }}
                >
                  + Add Block
                </motion.button>
                <motion.button
                  onClick={saveBlocks}
                  disabled={!dirty || saving}
                  className={`text-[12px] font-semibold tracking-wide uppercase px-5 py-2 rounded-full text-white transition disabled:opacity-50 ${dirty ? 'bg-petal-deep hover:bg-petal' : 'bg-ink-soft'}`}
                  whileTap={{ scale: dirty && !saving ? 0.95 : 1 }}
                >
                  {saving ? 'Saving…' : dirty ? 'Save Timetable' : 'Saved'}
                </motion.button>
                {status === 'saved' && (
                  <span className="text-[11px] font-semibold text-petal-deep">
                    ✓ Saved
                  </span>
                )}
                {status === 'error' && (
                  <span className="text-[11px] font-semibold text-red-500">
                    Couldn&apos;t save. Try again.
                  </span>
                )}
              </div>
            </div>
            {!isAuthed && authChecked && (
              <p className="text-[11px] text-ink-faint mt-2">
                Sign in to sync your timetable across devices.
              </p>
            )}
          </div>

          <div className="py-2 flex-1 overflow-y-auto">
            {loading ? (
              <p className="px-4 sm:px-9 py-6 text-[13px] text-ink-soft">Loading your timetable…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[640px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[1px] text-ink-soft">
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Activity</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(expanded ? blocks : blocks.slice(0, 7)).map((row, i) => (
                      <tr
                        key={row.id}
                        className="border-t"
                        style={{ borderColor: 'rgba(200,160,170,0.12)' }}
                      >
                        <td className="py-2.5 px-4 align-top w-[130px]">
                          <input
                            value={row.time}
                            onChange={(e) => updateBlock(i, 'time', e.target.value)}
                            placeholder="6:30 – 7:00"
                            className="w-full rounded-lg border border-petal-light bg-warm-white px-3 py-2 text-[13px] focus:border-petal outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-4 align-top">
                          <textarea
                            value={row.activity}
                            onChange={(e) => updateBlock(i, 'activity', e.target.value)}
                            placeholder="What happens here?"
                            className="w-full rounded-lg border border-petal-light bg-warm-white px-3 py-2 text-[13px] resize-none min-h-[60px] focus:border-petal outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-4 align-top">
                          <textarea
                            value={row.reason}
                            onChange={(e) => updateBlock(i, 'reason', e.target.value)}
                            placeholder="Why this slot matters?"
                            className="w-full rounded-lg border border-petal-light bg-warm-white px-3 py-2 text-[12px] italic resize-none min-h-[60px] focus:border-petal outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-4 align-top w-[150px]">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColors[row.type] }} />
                            <select
                              value={row.type}
                              onChange={(e) => updateBlock(i, 'type', e.target.value as BlockType)}
                              className="flex-1 rounded-lg border border-petal-light bg-white px-2 py-2 text-[12px] focus:border-petal outline-none"
                            >
                              {typeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 align-top text-right">
                          <button
                            onClick={() => removeBlock(i)}
                            className="text-[11px] text-ink-faint hover:text-petal-deep"
                            disabled={blocks.length === 1}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </FadeInView>

      </div>

    </section>
  )
}
