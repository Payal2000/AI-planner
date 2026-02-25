'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type Status = 'Saved' | 'Applied' | 'Interview' | 'Offer' | 'Rejected'

interface Application {
  id: string
  company: string
  position: string
  status: Status
  date: string
  salary: string
  website: string
  contact: string
}

const COLUMNS: { id: Status; label: string; color: string; dot: string }[] = [
  { id: 'Saved',     label: 'Saved',     color: '#f5ecd0', dot: '#e0c88a' },
  { id: 'Applied',   label: 'Applied',   color: '#daeaf5', dot: '#a8c8e0' },
  { id: 'Interview', label: 'Interview', color: '#ede5f7', dot: '#c9b8e8' },
  { id: 'Offer',     label: 'Offer',     color: '#e3ecd8', dot: '#b8c9a3' },
  { id: 'Rejected',  label: 'Rejected',  color: '#fdf0f4', dot: '#e8a0b4' },
]

const today = () => new Date().toISOString().split('T')[0]

function newApp(): Application {
  return {
    id: Date.now().toString(),
    company: '',
    position: '',
    status: 'Saved',
    date: today(),
    salary: '',
    website: '',
    contact: '',
  }
}

const STORAGE_KEY = 'kanban-apps-v1'

export default function JobsKanban() {
  const supabase = createClient()
  const [apps, setApps] = useState<Application[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: row } = await supabase
          .from('daily_plans').select('data')
          .eq('user_id', user.id).eq('date', 'job-tracker').maybeSingle()
        if (row?.data?.applications) {
          // Migrate old status values if needed
          const rawApps = row.data.applications as (Omit<Application, 'status'> & { status: string })[]
          const migrated: Application[] = rawApps.map(a => ({
            ...a,
            status: (a.status === 'Interviewing' ? 'Interview' : a.status) as Status,
          }))
          setApps(migrated)
          return
        }
      }
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) setApps(JSON.parse(raw))
      } catch { /* ignore */ }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((next: Application[]) => {
    setApps(next)
    if (userId) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        setSaveStatus('saving')
        const { error } = await supabase.from('daily_plans').upsert(
          { user_id: userId, date: 'job-tracker', data: { applications: next }, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,date' }
        )
        setSaveStatus(error ? 'error' : 'saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }, 800)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const addApp = (status: Status) => {
    const app = { ...newApp(), status }
    const next = [...apps, app]
    persist(next)
    setExpandedId(app.id)
  }

  const updateApp = (id: string, field: keyof Application, value: string) => {
    persist(apps.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  const moveApp = (id: string, status: Status) => {
    persist(apps.map(a => a.id === id ? { ...a, status } : a))
  }

  const deleteApp = (id: string) => {
    persist(apps.filter(a => a.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-ink-faint font-dm mb-1">Track every opportunity</p>
          <h2 className="font-playfair text-[22px] text-ink-dark">Job Applications</h2>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <span className="text-[11px] text-ink-faint font-dm">Saving…</span>}
          {saveStatus === 'saved' && <span className="text-[11px] text-petal-deep font-semibold font-dm">✓ Saved</span>}
          {saveStatus === 'error' && <span className="text-[11px] text-red-400 font-dm">⚠ Save failed</span>}
          <span className="text-[12px] text-ink-soft font-dm">{apps.length} total</span>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colApps = apps.filter(a => a.status === col.id)
          return (
            <div key={col.id} className="flex-shrink-0 w-[240px] flex flex-col">
              {/* Column header */}
              <div
                className="flex items-center justify-between px-3 py-2.5 rounded-[14px] mb-3"
                style={{ background: col.color }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
                  <span className="text-[12px] font-semibold text-ink-mid font-dm">{col.label}</span>
                </div>
                <span className="text-[11px] text-ink-faint font-dm bg-white rounded-full px-2 py-0.5">
                  {colApps.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 min-h-[120px]">
                {colApps.map(app => (
                  <motion.div
                    key={app.id}
                    layout
                    className="bg-white rounded-[14px] shadow-soft overflow-hidden"
                  >
                    <div
                      className="px-3 py-3 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    >
                      <p className="font-playfair text-[14px] text-ink-dark truncate">
                        {app.company || <span className="text-ink-faint italic text-[13px]">Company</span>}
                      </p>
                      <p className="text-[11px] text-ink-soft font-dm truncate mt-0.5">
                        {app.position || 'Role'}
                      </p>
                      <p className="text-[10px] text-ink-faint font-dm mt-1">{app.date}</p>
                    </div>

                    {expandedId === app.id && (
                      <div className="border-t border-petal-light/60 px-3 py-3 space-y-2" onClick={e => e.stopPropagation()}>
                        <input
                          value={app.company}
                          onChange={e => updateApp(app.id, 'company', e.target.value)}
                          placeholder="Company"
                          className="w-full rounded-lg border border-petal-light bg-warm-white px-2.5 py-1.5 text-[12px] font-dm focus:border-petal outline-none"
                        />
                        <input
                          value={app.position}
                          onChange={e => updateApp(app.id, 'position', e.target.value)}
                          placeholder="Role / Position"
                          className="w-full rounded-lg border border-petal-light bg-warm-white px-2.5 py-1.5 text-[12px] font-dm focus:border-petal outline-none"
                        />
                        <input
                          value={app.salary}
                          onChange={e => updateApp(app.id, 'salary', e.target.value)}
                          placeholder="Salary range"
                          className="w-full rounded-lg border border-petal-light bg-warm-white px-2.5 py-1.5 text-[12px] font-dm focus:border-petal outline-none"
                        />
                        <input
                          value={app.website}
                          onChange={e => updateApp(app.id, 'website', e.target.value)}
                          placeholder="Job URL"
                          className="w-full rounded-lg border border-petal-light bg-warm-white px-2.5 py-1.5 text-[12px] font-dm focus:border-petal outline-none"
                        />

                        {/* Move to */}
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-ink-faint font-dm mb-1">Move to</p>
                          <div className="flex flex-wrap gap-1">
                            {COLUMNS.filter(c => c.id !== app.status).map(c => (
                              <button
                                key={c.id}
                                onClick={() => moveApp(app.id, c.id)}
                                className="text-[10px] px-2 py-1 rounded-full font-dm transition-colors"
                                style={{ background: c.color, color: '#6b4f4f' }}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => deleteApp(app.id)}
                          className="text-[10px] text-ink-faint hover:text-red-400 font-dm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Add button */}
              <button
                onClick={() => addApp(col.id)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-[14px] border border-dashed border-petal-light text-ink-faint text-[12px] font-dm hover:border-petal hover:text-petal-deep transition-colors"
              >
                <span>+</span>
                <span>Add</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
