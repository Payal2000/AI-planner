'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

const defaultBlocks: Block[] = [
  { id: 'd1', time: '6:30 – 6:45', activity: 'Wake Up + Water', type: 'break', reason: 'Hydrate to kickstart metabolism' },
  { id: 'd2', time: '6:45 – 7:00', activity: 'Morning Workout (15 min, fasted)', type: 'workout', reason: 'Peak fat burning before breakfast' },
  { id: 'd3', time: '7:00 – 7:30', activity: 'Breakfast + Get Ready', type: 'meal', reason: 'Fuel your brain for the day' },
  { id: 'd4', time: '7:30 – 8:30', activity: 'Cold Outreach', type: 'outreach', reason: 'Inboxes checked 8–10 AM — highest reply rates' },
  { id: 'd5', time: '8:30 – 8:45', activity: 'Break', type: 'break', reason: 'Reset before deep work' },
  { id: 'd6', time: '8:45 – 10:45', activity: 'LeetCode — 5 New Problems', type: 'leetcode', reason: '9–11 AM = peak analytical focus' },
  { id: 'd7', time: '10:45 – 12:00', activity: 'LeetCode — Review Past 5 Days', type: 'leetcode', reason: 'Short-term memory peaks in the morning' },
  { id: 'd8', time: '12:00 – 1:00', activity: 'Lunch Break', type: 'meal', reason: 'Full break, no screens' },
  { id: 'd9', time: '1:00 – 4:00', activity: 'Study (3 hrs)', type: 'study', reason: 'Afternoon = best for review and critical thinking' },
  { id: 'd10', time: '4:00 – 4:15', activity: 'Break', type: 'break', reason: 'Rest before creative work' },
  { id: 'd11', time: '4:15 – 5:15', activity: 'Build (1 hr)', type: 'build', reason: 'Late afternoon suits creative work' },
  { id: 'd12', time: '5:15 – 5:45', activity: 'Evening Workout (30 min)', type: 'workout', reason: 'Strength peaks in evening' },
  { id: 'd13', time: '5:45 – 6:15', activity: 'Freshen Up + Snack', type: 'break', reason: 'Recover and refuel' },
  { id: 'd14', time: '6:15 – 7:15', activity: 'Job Applications', type: 'apply', reason: 'Prep in evening for morning submissions' },
]

export default function TimetableTimeline() {
  const supabase = createClient()
  const { selectedDate } = useSelectedDate()
  const dateKey = selectedDate.toISOString().split('T')[0]

  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [isAuthed, setIsAuthed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDirty(false)

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      if (!cancelled) setIsAuthed(true)

      const { data: row } = await supabase
        .from('daily_plans').select('data')
        .eq('user_id', user.id).eq('date', dateKey).maybeSingle()

      if (!cancelled) {
        const entries = row?.data?.timetable
        const parsed: Block[] = Array.isArray(entries) && entries.length
          ? (entries as Block[]).map((b, i) => ({ ...b, id: b.id ?? `loaded-${i}` }))
          : defaultBlocks
        setBlocks(parsed)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [dateKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateBlock = useCallback(<K extends keyof Block>(id: string, key: K, value: Block[K]) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, [key]: value } : b))
    setDirty(true)
    setStatus('idle')
  }, [])

  const addBlock = () => {
    const newBlock: Block = { id: `b-${Date.now()}`, time: '', activity: '', reason: '', type: 'study' }
    setBlocks(prev => [...prev, newBlock])
    setEditingId(newBlock.id)
    setDirty(true)
  }

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    setDirty(true)
  }

  const save = async () => {
    if (!isAuthed) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setStatus('error'); return }

    const { data: existing } = await supabase.from('daily_plans').select('data')
      .eq('user_id', user.id).eq('date', dateKey).maybeSingle()
    const merged = { ...(existing?.data ?? {}), timetable: blocks }
    const { error } = await supabase.from('daily_plans').upsert(
      { user_id: user.id, date: dateKey, data: merged, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' }
    )
    setSaving(false)
    if (error) { setStatus('error') } else { setStatus('saved'); setDirty(false) }
  }

  return (
    <div className="p-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-ink-faint font-dm mb-1">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h2 className="font-playfair text-[22px] text-ink-dark">Daily Schedule</h2>
        </div>
        <div className="flex items-center gap-3">
          {status === 'saved' && <span className="text-[11px] text-petal-deep font-semibold font-dm">✓ Saved</span>}
          {status === 'error' && <span className="text-[11px] text-red-400 font-dm">Save failed</span>}
          <button
            onClick={addBlock}
            className="text-[12px] font-semibold tracking-wide uppercase px-4 py-2 rounded-full border border-petal-light text-petal-deep hover:border-petal font-dm transition-colors"
          >
            + Add block
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving || !isAuthed}
            className="text-[12px] font-semibold tracking-wide uppercase px-5 py-2 rounded-full text-white transition-all disabled:opacity-40 font-dm"
            style={{ background: dirty ? '#c77d94' : '#c4a8a8' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-[13px] text-ink-soft font-dm">Loading…</p>
      ) : (
        <div className="space-y-0">
          {blocks.map((block, index) => {
            const isEditing = editingId === block.id
            const isLast = index === blocks.length - 1
            return (
              <div key={block.id} className="flex gap-4">
                {/* Timeline spine */}
                <div className="flex flex-col items-center pt-4 w-6 flex-shrink-0">
                  <motion.div
                    className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white"
                    style={{ background: dotColors[block.type] ?? '#e8a0b4' }}
                    layout
                  />
                  {!isLast && <div className="w-px flex-1 mt-1" style={{ background: 'rgba(200,160,170,0.2)' }} />}
                </div>

                {/* Card */}
                <div
                  className="flex-1 mb-3 bg-white rounded-[16px] shadow-soft overflow-hidden cursor-pointer hover:shadow-hover transition-shadow"
                  onClick={() => setEditingId(isEditing ? null : block.id)}
                >
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-ink-faint font-dm mb-0.5">{block.time || 'No time set'}</p>
                      <p className="font-playfair text-[15px] text-ink-dark truncate">
                        {block.activity || <span className="text-ink-faint italic">Untitled block</span>}
                      </p>
                      {block.reason && !isEditing && (
                        <p className="text-[12px] text-ink-soft font-dm italic mt-0.5 truncate">{block.reason}</p>
                      )}
                    </div>
                    <span className="text-ink-faint text-[12px] flex-shrink-0">{isEditing ? '↑' : '↓'}</span>
                  </div>

                  <AnimatePresence>
                    {isEditing && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="px-4 pb-4 pt-2 border-t border-petal-light/60 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint font-dm block mb-1">Time</label>
                              <input
                                value={block.time}
                                onChange={e => updateBlock(block.id, 'time', e.target.value)}
                                placeholder="6:30 – 7:00"
                                className="w-full rounded-xl border border-petal-light bg-warm-white px-3 py-2 text-[13px] focus:border-petal outline-none font-dm"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint font-dm block mb-1">Type</label>
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dotColors[block.type] }} />
                                <select
                                  value={block.type}
                                  onChange={e => updateBlock(block.id, 'type', e.target.value as BlockType)}
                                  className="flex-1 rounded-xl border border-petal-light bg-white px-2 py-2 text-[12px] focus:border-petal outline-none font-dm"
                                >
                                  {typeOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint font-dm block mb-1">Activity</label>
                            <input
                              value={block.activity}
                              onChange={e => updateBlock(block.id, 'activity', e.target.value)}
                              placeholder="What happens here?"
                              className="w-full rounded-xl border border-petal-light bg-warm-white px-3 py-2 text-[13px] focus:border-petal outline-none font-dm"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint font-dm block mb-1">Why this slot</label>
                            <input
                              value={block.reason}
                              onChange={e => updateBlock(block.id, 'reason', e.target.value)}
                              placeholder="Why this time matters"
                              className="w-full rounded-xl border border-petal-light bg-warm-white px-3 py-2 text-[13px] italic focus:border-petal outline-none font-dm"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => removeBlock(block.id)}
                              className="text-[11px] text-ink-faint hover:text-red-400 font-dm transition-colors"
                            >
                              Remove block
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
