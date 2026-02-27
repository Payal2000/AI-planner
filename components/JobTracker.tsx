'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionHeader from './ui/SectionHeader'
import FadeInView from './ui/FadeInView'
import { createClient } from '@/lib/supabase/client'

type Status = 'Applying' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected' | 'Withdrawn' | ''
type NextAction = 'Prepare Interview' | 'Follow up' | 'Send email' | 'Waiting' | 'Decide'

interface Application {
  id: string
  company: string
  position: string
  status: Status
  date: string
  salary: string
  nextActions: NextAction[]
  website: string
  contact: string
  referenceLink: string
}

// Shape of a row in job_applications table
interface DbRow {
  id: string
  user_id: string
  company: string
  position: string
  status: string
  date: string
  salary: string
  next_actions: NextAction[]
  website: string
  contact: string
  reference_link: string
  created_at: string
}

function rowToApp(row: DbRow): Application {
  return {
    id: row.id,
    company: row.company ?? '',
    position: row.position ?? '',
    status: (row.status as Status) ?? '',
    date: row.date ?? '',
    salary: row.salary ?? '',
    nextActions: row.next_actions ?? [],
    website: row.website ?? '',
    contact: row.contact ?? '',
    referenceLink: row.reference_link ?? '',
  }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Applying:     { bg: '#e0f2fe', text: '#0369a1' },
  Applied:      { bg: '#dbeafe', text: '#3b6fa0' },
  Interviewing: { bg: '#fef3c7', text: '#92670a' },
  Offer:        { bg: '#ede9fe', text: '#7c3aed' },
  Rejected:     { bg: '#fce7f3', text: '#be185d' },
  Withdrawn:    { bg: '#f3f4f6', text: '#6b7280' },
}

const STATUS_BAR: Record<string, string> = {
  Applying:     '#38bdf8',
  Applied:      '#3b82f6',
  Interviewing: '#f59e0b',
  Offer:        '#8b5cf6',
  Rejected:     '#ec4899',
  Withdrawn:    '#9ca3af',
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  'Prepare Interview': { bg: '#dbeafe', text: '#3b6fa0' },
  'Follow up':         { bg: '#d1fae5', text: '#065f46' },
  'Send email':        { bg: '#fce7f3', text: '#be185d' },
  'Waiting':           { bg: '#fef3c7', text: '#92670a' },
  'Decide':            { bg: '#ede9fe', text: '#7c3aed' },
}

const today = () => new Date().toISOString().split('T')[0]
const STATUS_ORDER: Status[] = ['Applying', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Withdrawn']

export default function JobTracker() {
  const supabase = createClient()
  const [apps, setApps] = useState<Application[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [activeTab, setActiveTab] = useState<'tracker' | 'analytics'>('tracker')

  // Track pending field updates per row to debounce individual field saves
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('job_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (data) setApps((data as DbRow[]).map(rowToApp))
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add row ───────────────────────────────────────────────────────────────
  const addRow = async () => {
    if (!userId) return
    const newId = crypto.randomUUID()
    const newApp: Application = {
      id: newId,
      company: '',
      position: '',
      status: 'Applied',
      date: today(),
      salary: '',
      nextActions: [],
      website: '',
      contact: '',
      referenceLink: '',
    }
    // Optimistic update — add row immediately
    setApps(prev => [...prev, newApp])
    setSaveStatus('saving')
    const { error } = await supabase
      .from('job_applications')
      .insert({
        id: newId,
        user_id: userId,
        company: '',
        position: '',
        status: 'Applied',
        date: today(),
        salary: '',
        next_actions: [],
        website: '',
        contact: '',
        reference_link: '',
      })
    if (error) {
      console.error('addRow error:', error)
      setApps(prev => prev.filter(a => a.id !== newId))
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } else {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    }
  }

  // ── Delete row ────────────────────────────────────────────────────────────
  const deleteRow = async (id: string) => {
    if (!userId) return
    setApps(prev => prev.filter(a => a.id !== id))
    await supabase.from('job_applications').delete().eq('id', id).eq('user_id', userId)
  }

  // ── Update a single field (debounced) ─────────────────────────────────────
  const update = (id: string, field: keyof Application, value: unknown) => {
    // Optimistic update
    setApps(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))

    if (!userId) return
    // Map camelCase field → snake_case column
    const colMap: Partial<Record<keyof Application, string>> = {
      nextActions:   'next_actions',
      referenceLink: 'reference_link',
    }
    const col = colMap[field] ?? field

    if (debounceRefs.current[id + col]) clearTimeout(debounceRefs.current[id + col])
    debounceRefs.current[id + col] = setTimeout(async () => {
      setSaveStatus('saving')
      const { error } = await supabase
        .from('job_applications')
        .update({ [col]: value, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
      if (error) {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 1500)
      }
    }, 600)
  }

  const toggleAction = (id: string, action: NextAction) => {
    const app = apps.find(a => a.id === id)
    if (!app) return
    const has = app.nextActions.includes(action)
    update(id, 'nextActions', has
      ? app.nextActions.filter(a => a !== action)
      : [...app.nextActions, action])
  }

  // ── Cold Outreach ─────────────────────────────────────────────────────────
  const [outreach, setOutreach] = useState<Record<string, { status: 'idle' | 'loading' | 'done' | 'error'; message: string }>>({})

  const draftOutreach = async (app: Application) => {
    setOutreach(prev => ({ ...prev, [app.id]: { status: 'loading', message: '' } }))
    try {
      const res = await fetch('/api/agent/cold-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: app.company, position: app.position, contact: app.contact }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setOutreach(prev => ({ ...prev, [app.id]: { status: 'done', message: json.message } }))
    } catch {
      setOutreach(prev => ({ ...prev, [app.id]: { status: 'error', message: '' } }))
    }
  }

  const dismissOutreach = (id: string) =>
    setOutreach(prev => ({ ...prev, [id]: { status: 'idle', message: '' } }))

  const copyOutreach = (msg: string) => navigator.clipboard.writeText(msg)

  // ── Derived ───────────────────────────────────────────────────────────────
  const sortedApps = useMemo(() =>
    [...apps].sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return b.date.localeCompare(a.date)
    }),
  [apps])

  const filledApps = apps.filter(a => a.company || a.position)
  const totalApps = filledApps.length
  const offerCount = apps.filter(a => a.status === 'Offer').length

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of filledApps) {
      const s = a.status || 'Applied'
      counts[s] = (counts[s] ?? 0) + 1
    }
    return counts
  }, [filledApps])

  const byMonth = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of filledApps) {
      if (!a.date) continue
      const d = new Date(a.date + 'T00:00:00')
      if (isNaN(d.getTime())) continue
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      map[key] = (map[key] ?? 0) + 1
    }
    return Object.entries(map).sort((a, b) =>
      new Date('01 ' + a[0]).getTime() - new Date('01 ' + b[0]).getTime()
    )
  }, [filledApps])

  const maxMonth = Math.max(...byMonth.map(([, v]) => v), 1)
  const responded = (statusCounts['Interviewing'] ?? 0) + (statusCounts['Offer'] ?? 0)
  const responseRate = totalApps > 0 ? Math.round((responded / totalApps) * 100) : 0

  const statusLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved'  ? '✓ Saved'
    : saveStatus === 'error'  ? '⚠ Save failed'
    : userId ? 'Synced to cloud' : 'Not signed in'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-12" id="weekly">
      <SectionHeader
        icon="💼"
        label="Career"
        title="Job Tracker"
        subtitle="Track every application, interview, and offer in one place."
      />

      <FadeInView delay={0.1}>
        <div className="bg-white rounded-[20px] shadow-card overflow-hidden">

          {/* ── Header bar ── */}
          <div
            className="px-5 sm:px-7 py-4 border-b flex items-center justify-between gap-3 flex-wrap"
            style={{ borderColor: 'rgba(200,160,170,0.12)', background: 'linear-gradient(135deg, #fdf5f7 0%, #fff 100%)' }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-[12px] font-semibold tracking-[1.5px] uppercase text-ink-soft">Job Tracker</span>
              <span className="text-[11px] font-bold text-petal-deep bg-petal-pale rounded-full px-2 py-0.5">{apps.length}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-petal-pale rounded-full p-0.5 gap-0.5">
                {(['tracker', 'analytics'] as const).map(tab => (
                  <motion.button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full transition-colors ${
                      activeTab === tab
                        ? 'bg-white text-petal-deep shadow-sm'
                        : 'text-ink-soft hover:text-ink-mid'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {tab === 'tracker' ? '📋 Tracker' : '📊 Analytics'}
                  </motion.button>
                ))}
              </div>
              <span className="text-[11px] font-semibold tracking-wide uppercase text-petal-deep">{statusLabel}</span>
            </div>
          </div>

          <AnimatePresence mode="wait">

            {/* ── Tracker Tab ── */}
            {activeTab === 'tracker' && (
              <motion.div
                key="tracker"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(200,160,170,0.12)' }}>
                        {['Company', 'Position', 'Status', 'Application Date', 'Salary', 'Next Action', 'Website', 'Contact', 'Reference Link'].map(h => (
                          <th key={h} className="text-left text-[11px] font-semibold tracking-[1px] uppercase text-ink-faint py-3 px-4 whitespace-nowrap">{h}</th>
                        ))}
                        <th className="w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedApps.map((app, i) => {
                        const draft = outreach[app.id]
                        return (
                          <React.Fragment key={app.id}>
                            <motion.tr
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="group border-b hover:bg-[#fdfafc] transition-colors"
                              style={{ borderColor: 'rgba(200,160,170,0.08)' }}
                            >
                              <td className="py-2.5 px-4">
                                <input value={app.company} onChange={e => update(app.id, 'company', e.target.value)} placeholder="Company" className="w-full text-[13px] font-semibold text-gray-700 bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-petal transition-colors pb-0.5 min-w-[100px] placeholder:text-gray-300" />
                              </td>
                              <td className="py-2.5 px-4">
                                <input value={app.position} onChange={e => update(app.id, 'position', e.target.value)} placeholder="Position" className="w-full text-[13px] text-gray-500 bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-petal transition-colors pb-0.5 min-w-[120px] placeholder:text-gray-300" />
                              </td>
                              <td className="py-2.5 px-4">
                                <StatusSelect value={app.status} onChange={v => update(app.id, 'status', v)} />
                              </td>
                              <td className="py-2.5 px-4">
                                <input type="date" value={app.date} onChange={e => update(app.id, 'date', e.target.value)} className="text-[13px] text-gray-500 bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-petal transition-colors pb-0.5" />
                              </td>
                              <td className="py-2.5 px-4">
                                <input value={app.salary} onChange={e => update(app.id, 'salary', e.target.value)} placeholder="e.g. $90k" className="w-full text-[13px] text-gray-500 bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-petal transition-colors pb-0.5 min-w-[70px] placeholder:text-gray-300" />
                              </td>
                              <td className="py-2.5 px-4">
                                <NextActionSelect actions={app.nextActions} onChange={a => toggleAction(app.id, a)} />
                              </td>
                              <td className="py-2.5 px-4">
                                <input value={app.website} onChange={e => update(app.id, 'website', e.target.value)} placeholder="site.com" className="w-full text-[13px] text-gray-500 bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-petal transition-colors pb-0.5 min-w-[80px] placeholder:text-gray-300" />
                              </td>
                              <td className="py-2.5 px-4">
                                <input value={app.contact} onChange={e => update(app.id, 'contact', e.target.value)} placeholder="Name" className="w-full text-[13px] text-gray-500 bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-petal transition-colors pb-0.5 min-w-[80px] placeholder:text-gray-300" />
                              </td>
                              <td className="py-2.5 px-4">
                                <input value={app.referenceLink} onChange={e => update(app.id, 'referenceLink', e.target.value)} placeholder="Link / Note" className="w-full text-[13px] text-gray-500 bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-petal transition-colors pb-0.5 min-w-[90px] placeholder:text-gray-300" />
                              </td>
                              <td className="py-2.5 px-2">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <motion.button
                                    onClick={() => draftOutreach(app)}
                                    disabled={draft?.status === 'loading'}
                                    title="Draft cold outreach"
                                    className="text-[13px] w-6 h-6 flex items-center justify-center rounded-full hover:bg-petal-pale text-petal-deep disabled:opacity-40 transition-colors"
                                    whileTap={{ scale: 0.85 }}
                                  >
                                    {draft?.status === 'loading' ? '…' : '✍️'}
                                  </motion.button>
                                  <button onClick={() => deleteRow(app.id)} className="text-ink-faint hover:text-red-400 transition-all text-[13px] w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50">✕</button>
                                </div>
                              </td>
                            </motion.tr>

                            {/* Outreach draft expanding row */}
                            <AnimatePresence>
                              {draft?.status === 'done' && (
                                <tr key={`${app.id}-draft`}>
                                  <td colSpan={10} className="p-0">
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.3, ease: 'easeOut' }}
                                      className="overflow-hidden"
                                    >
                                      <div className="mx-4 my-2 rounded-2xl p-4 border border-petal-light" style={{ background: 'linear-gradient(135deg, #fdf0f4, #ede5f7)' }}>
                                        <div className="flex items-center justify-between mb-2">
                                          <p className="text-[10px] font-semibold tracking-[3px] uppercase text-petal">✍️ Cold Outreach Draft — {app.company}</p>
                                          <div className="flex items-center gap-3">
                                            <motion.button
                                              onClick={() => copyOutreach(draft.message)}
                                              className="text-[11px] font-semibold tracking-wide uppercase px-3 py-1 rounded-full bg-petal-deep text-white hover:bg-petal transition-colors"
                                              whileTap={{ scale: 0.95 }}
                                            >
                                              Copy
                                            </motion.button>
                                            <button onClick={() => dismissOutreach(app.id)} className="text-[11px] text-ink-faint hover:text-ink-soft transition-colors">Dismiss</button>
                                          </div>
                                        </div>
                                        <p className="font-cormorant text-[15px] text-ink-mid leading-relaxed">{draft.message}</p>
                                      </div>
                                    </motion.div>
                                  </td>
                                </tr>
                              )}
                              {draft?.status === 'error' && (
                                <tr key={`${app.id}-err`}>
                                  <td colSpan={10} className="px-4 py-1">
                                    <p className="text-[12px] text-red-400">Could not generate draft — check your OPENAI_API_KEY.</p>
                                  </td>
                                </tr>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        )
                      })}
                      {apps.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-14 text-center text-[13px] text-ink-faint">
                            {userId ? 'No applications yet — add one below!' : 'Sign in to track applications.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-[rgba(200,160,170,0.1)]">
                  {sortedApps.map(app => (
                    <div key={app.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <input value={app.company} onChange={e => update(app.id, 'company', e.target.value)} placeholder="Company" className="text-[14px] font-semibold text-gray-700 bg-transparent outline-none w-full placeholder:text-gray-300" />
                          <input value={app.position} onChange={e => update(app.id, 'position', e.target.value)} placeholder="Position" className="text-[12px] text-ink-soft bg-transparent outline-none w-full mt-0.5 placeholder:text-gray-300" />
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pt-0.5">
                          <StatusSelect value={app.status} onChange={v => update(app.id, 'status', v)} />
                          <button onClick={() => draftOutreach(app)} title="Draft outreach" className="text-petal-deep text-[14px] w-5 h-5 flex items-center justify-center">✍️</button>
                          <button onClick={() => deleteRow(app.id)} className="text-ink-faint hover:text-red-400 text-[12px] w-5 h-5 flex items-center justify-center">✕</button>
                        </div>
                      </div>
                      <NextActionSelect actions={app.nextActions} onChange={a => toggleAction(app.id, a)} />
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-ink-soft">
                        <input type="date" value={app.date} onChange={e => update(app.id, 'date', e.target.value)} className="bg-transparent outline-none" />
                        <input value={app.salary} onChange={e => update(app.id, 'salary', e.target.value)} placeholder="Salary" className="bg-transparent outline-none placeholder:text-gray-300" />
                        <input value={app.website} onChange={e => update(app.id, 'website', e.target.value)} placeholder="Website" className="bg-transparent outline-none placeholder:text-gray-300" />
                        <input value={app.contact} onChange={e => update(app.id, 'contact', e.target.value)} placeholder="Contact" className="bg-transparent outline-none placeholder:text-gray-300" />
                      </div>
                      <AnimatePresence>
                        {outreach[app.id]?.status === 'done' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 rounded-2xl p-3 border border-petal-light" style={{ background: 'linear-gradient(135deg, #fdf0f4, #ede5f7)' }}>
                              <p className="text-[10px] font-semibold tracking-[2px] uppercase text-petal mb-2">✍️ Outreach Draft</p>
                              <p className="font-cormorant text-[14px] text-ink-mid leading-relaxed mb-2">{outreach[app.id].message}</p>
                              <div className="flex gap-3">
                                <button onClick={() => copyOutreach(outreach[app.id].message)} className="text-[11px] font-semibold text-petal-deep">Copy</button>
                                <button onClick={() => dismissOutreach(app.id)} className="text-[11px] text-ink-faint">Dismiss</button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-5 sm:px-7 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'rgba(200,160,170,0.1)' }}>
                  <div className="flex items-center gap-4 text-[11px] text-ink-faint">
                    <span>COUNT {apps.length}</span>
                    {offerCount > 0 && <span className="text-[#7c3aed] font-semibold">🎉 {offerCount} Offer{offerCount > 1 ? 's' : ''}</span>}
                    {apps.filter(a => a.status === 'Interviewing').length > 0 && (
                      <span className="text-[#92670a] font-semibold">📅 {apps.filter(a => a.status === 'Interviewing').length} Interview{apps.filter(a => a.status === 'Interviewing').length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <button
                    onClick={addRow}
                    disabled={!userId}
                    className="text-[12px] font-semibold px-4 py-2 rounded-full border border-petal-light text-gray-500 hover:bg-petal-pale hover:border-petal transition-colors disabled:opacity-40"
                  >
                    + Add Application
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Analytics Tab ── */}
            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="p-5 sm:p-8"
              >
                {totalApps === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-3xl mb-3">📋</p>
                    <p className="font-playfair text-lg text-ink-dark mb-1">No applications yet</p>
                    <p className="text-[13px] text-ink-faint">Add entries in the Tracker tab to see your dashboard.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Total Applied', value: totalApps,        color: '#c77d94', bg: '#fdf0f4' },
                        { label: 'Interviewing',  value: statusCounts['Interviewing'] ?? 0, color: '#92670a', bg: '#fef3c7' },
                        { label: 'Offers',        value: statusCounts['Offer'] ?? 0,        color: '#7c3aed', bg: '#ede9fe' },
                        { label: 'Response Rate', value: `${responseRate}%`,                color: '#3b6fa0', bg: '#dbeafe' },
                      ].map((card, i) => (
                        <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.06 }} className="rounded-2xl p-4" style={{ background: card.bg }}>
                          <p className="text-[10px] font-semibold tracking-[2px] uppercase mb-1" style={{ color: card.color }}>{card.label}</p>
                          <p className="font-playfair text-3xl" style={{ color: card.color }}>{card.value}</p>
                        </motion.div>
                      ))}
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold tracking-[3px] uppercase text-petal mb-4">Status Breakdown</p>
                      <div className="space-y-3">
                        {STATUS_ORDER.filter(s => statusCounts[s] > 0).map((s, i) => {
                          const colors = STATUS_COLORS[s]
                          const bar    = STATUS_BAR[s]
                          const count  = statusCounts[s] ?? 0
                          const pct    = Math.round((count / totalApps) * 100)
                          return (
                            <motion.div key={s} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: i * 0.07 }} className="flex items-center gap-3">
                              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full w-[110px] text-center flex-shrink-0" style={{ background: colors.bg, color: colors.text }}>{s}</span>
                              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div className="h-full rounded-full" style={{ background: bar }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.07 }} />
                              </div>
                              <span className="text-[12px] font-semibold text-ink-mid w-[54px] text-right flex-shrink-0">{count} · {pct}%</span>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>

                    {byMonth.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold tracking-[3px] uppercase text-petal mb-4">Applications by Month</p>
                        <div className="flex items-end gap-2 h-28">
                          {byMonth.map(([month, count], i) => (
                            <motion.div key={month} className="flex flex-col items-center gap-1 flex-1 min-w-0" initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} transition={{ duration: 0.4, delay: i * 0.05, ease: 'easeOut' }} style={{ transformOrigin: 'bottom' }}>
                              <span className="text-[10px] font-semibold text-ink-mid">{count}</span>
                              <div className="w-full rounded-t-lg" style={{ height: `${Math.round((count / maxMonth) * 100)}%`, minHeight: 4, background: 'linear-gradient(180deg, #e8a0b4, #c77d94)' }} />
                              <span className="text-[9px] text-ink-faint font-medium truncate w-full text-center">{month}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-[11px] font-semibold tracking-[3px] uppercase text-petal mb-4">Conversion Pipeline</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {STATUS_ORDER.filter(s => statusCounts[s] > 0).map((s, i, arr) => {
                          const colors = STATUS_COLORS[s]
                          return (
                            <div key={s} className="flex items-center gap-1">
                              <div className="flex flex-col items-center px-4 py-2.5 rounded-xl" style={{ background: colors.bg }}>
                                <span className="font-playfair text-2xl font-bold" style={{ color: colors.text }}>{statusCounts[s]}</span>
                                <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: colors.text }}>{s}</span>
                              </div>
                              {i < arr.length - 1 && <span className="text-ink-faint text-[14px]">›</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </FadeInView>
    </section>
  )
}

function StatusSelect({ value, onChange }: { value: Status; onChange: (v: Status) => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, flipUp: false })
  const btnRef = useRef<HTMLButtonElement>(null)
  const statuses: Status[] = ['Applied', 'Interviewing', 'Offer', 'Rejected', 'Withdrawn']
  const colors = STATUS_COLORS[value as string] ?? { bg: '#f3f4f6', text: '#9c7e7e' }
  const DROPDOWN_H = 220

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const flipUp = rect.bottom + DROPDOWN_H > window.innerHeight
      setPos({ left: rect.left, top: flipUp ? rect.top - DROPDOWN_H - 4 : rect.bottom + 4, flipUp })
    }
    setOpen(o => !o)
  }

  return (
    <>
      <button ref={btnRef} onClick={handleOpen} className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-opacity hover:opacity-80" style={{ background: colors.bg, color: colors.text }}>
        {value || '+ Status'}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: pos.flipUp ? 4 : -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: pos.flipUp ? 4 : -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 101 }}
              className="bg-white rounded-2xl shadow-xl border border-petal-light p-1.5 min-w-[150px]"
            >
              {statuses.map(s => {
                const c = STATUS_COLORS[s]
                return (
                  <button key={s} onClick={() => { onChange(s); setOpen(false) }} className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-petal-pale transition-colors flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>{s}</span>
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function NextActionSelect({ actions, onChange }: { actions: NextAction[]; onChange: (a: NextAction) => void }) {
  const [open, setOpen] = useState(false)
  const allActions: NextAction[] = ['Prepare Interview', 'Follow up', 'Send email', 'Waiting', 'Decide']

  return (
    <div className="relative flex flex-wrap gap-1 items-center">
      {actions.map(a => {
        const c = ACTION_COLORS[a] ?? { bg: '#f3f4f6', text: '#6b7280' }
        return (
          <span key={a} onClick={() => onChange(a)} title="Click to remove" className="text-[11px] font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-70 transition-opacity whitespace-nowrap" style={{ background: c.bg, color: c.text }}>{a}</span>
        )
      })}
      <button onClick={() => setOpen(o => !o)} className="text-[12px] text-ink-faint hover:text-petal-deep w-5 h-5 flex items-center justify-center rounded-full hover:bg-petal-pale transition-colors flex-shrink-0" title="Add action">+</button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full left-0 mt-1.5 z-20 bg-white rounded-2xl shadow-lg border border-petal-light p-1.5 min-w-[180px]"
            >
              {allActions.map(a => {
                const c = ACTION_COLORS[a]
                const has = actions.includes(a)
                return (
                  <button key={a} onClick={() => { onChange(a); setOpen(false) }} className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-petal-pale transition-colors flex items-center gap-2">
                    <span className="w-4 h-4 rounded flex items-center justify-center text-[10px] flex-shrink-0 border transition-colors" style={{ borderColor: has ? c.text : '#e5e7eb', background: has ? c.bg : 'transparent', color: c.text }}>{has ? '✓' : ''}</span>
                    <span className="text-[12px] font-semibold" style={{ color: c.text }}>{a}</span>
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
