'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionHeader from './ui/SectionHeader'
import FadeInView from './ui/FadeInView'
import { createClient } from '@/lib/supabase/client'
import { useSelectedDate } from '@/context/DateContext'

const MEAL_LABELS = ['B', 'L', 'D', 'S']

interface MealEntry {
  id: string
  meal: string
  food: string
  servings: string
  servingSize: string
  protein: string
  carbs: string
  sugar: string
  fat: string
  calories: string
  sortOrder: number
}

interface DbRow {
  id: string
  user_id: string
  date: string
  meal: string
  food: string
  servings: string
  serving_size: string
  protein: string
  carbs: string
  sugar: string
  fat: string
  calories: string
  sort_order: number
}

function rowToEntry(r: DbRow): MealEntry {
  return {
    id: r.id,
    meal: r.meal ?? '',
    food: r.food ?? '',
    servings: r.servings ?? '',
    servingSize: r.serving_size ?? '',
    protein: r.protein ?? '',
    carbs: r.carbs ?? '',
    sugar: r.sugar ?? '',
    fat: r.fat ?? '',
    calories: r.calories ?? '',
    sortOrder: r.sort_order ?? 0,
  }
}

const sumNum = (entries: MealEntry[], field: keyof MealEntry): number =>
  entries.reduce((acc, e) => acc + (parseFloat(e[field] as string) || 0), 0)

const fmt = (n: number) => n % 1 === 0 ? String(n) : n.toFixed(1)

export default function MealsSection() {
  const supabase = createClient()
  const { selectedDate } = useSelectedDate()
  const dateKey = selectedDate.toISOString().split('T')[0]

  const [userId, setUserId] = useState<string | null>(null)
  const [entries, setEntries] = useState<MealEntry[]>([])
  const [calorieGoal, setCalorieGoal] = useState('2000')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const goalDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Agent state ────────────────────────────────────────────────────────────
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentTab, setAgentTab] = useState<'daily' | 'weekly' | 'research' | 'guidance'>('daily')
  const [agentStatus, setAgentStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [agentResult, setAgentResult] = useState<string>('')
  const [agentResultTs, setAgentResultTs] = useState<string>('')
  const [researchQuery, setResearchQuery] = useState('')
  const [researchResult, setResearchResult] = useState<Record<string, string> | null>(null)
  const [researchResultTs, setResearchResultTs] = useState<string>('')
  const [guidanceQ, setGuidanceQ] = useState('')

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [{ data: rows }, { data: settings }] = await Promise.all([
        supabase
          .from('meal_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateKey)
          .order('sort_order', { ascending: true }),
        supabase
          .from('meal_settings')
          .select('calorie_goal')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      if (rows) setEntries((rows as DbRow[]).map(rowToEntry))
      if (settings?.calorie_goal) setCalorieGoal(settings.calorie_goal)
    }
    load()
  }, [dateKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add row ───────────────────────────────────────────────────────────────
  const addRow = async () => {
    if (!userId) return
    const newId = crypto.randomUUID()
    const sortOrder = entries.length
    const newEntry: MealEntry = {
      id: newId, meal: '', food: '', servings: '', servingSize: '',
      protein: '', carbs: '', sugar: '', fat: '', calories: '', sortOrder,
    }
    setEntries(prev => [...prev, newEntry])
    const { error } = await supabase.from('meal_entries').insert({
      id: newId, user_id: userId, date: dateKey,
      meal: '', food: '', servings: '', serving_size: '',
      protein: '', carbs: '', sugar: '', fat: '', calories: '',
      sort_order: sortOrder,
    })
    if (error) {
      console.error('addRow error:', error)
      setEntries(prev => prev.filter(e => e.id !== newId))
    }
  }

  // ── Delete row ────────────────────────────────────────────────────────────
  const deleteRow = async (id: string) => {
    if (!userId || entries.length <= 1) return
    setEntries(prev => prev.filter(e => e.id !== id))
    await supabase.from('meal_entries').delete().eq('id', id).eq('user_id', userId)
  }

  // ── Update field (debounced) ───────────────────────────────────────────────
  const updateEntry = useCallback((id: string, field: keyof MealEntry, value: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
    if (!userId) return

    const colMap: Partial<Record<keyof MealEntry, string>> = {
      servingSize: 'serving_size',
      sortOrder:   'sort_order',
    }
    const col = colMap[field] ?? field
    const key = id + col
    if (debounceRefs.current[key]) clearTimeout(debounceRefs.current[key])
    debounceRefs.current[key] = setTimeout(async () => {
      setSaveStatus('saving')
      const { error } = await supabase
        .from('meal_entries')
        .update({ [col]: value, updated_at: new Date().toISOString() })
        .eq('id', id).eq('user_id', userId)
      setSaveStatus(error ? 'error' : 'saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    }, 600)
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update calorie goal (debounced) ───────────────────────────────────────
  const updateGoal = (val: string) => {
    setCalorieGoal(val)
    if (!userId) return
    if (goalDebounce.current) clearTimeout(goalDebounce.current)
    goalDebounce.current = setTimeout(async () => {
      await supabase.from('meal_settings').upsert(
        { user_id: userId, calorie_goal: val, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
    }, 600)
  }

  // ── Load saved log for a tab ──────────────────────────────────────────────
  const loadSavedLog = useCallback(async (tab: string) => {
    if (!userId) return
    const actionMap: Record<string, string> = {
      daily: 'analyze-daily', weekly: 'analyze-weekly',
      research: 'research-food', guidance: 'guidance',
    }
    const { data } = await supabase
      .from('meal_coach_logs')
      .select('result, query, created_at')
      .eq('user_id', userId)
      .eq('action', actionMap[tab])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data) return
    const ts = new Date(data.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    if (tab === 'research') {
      setResearchResult(data.result as Record<string, string>)
      if (data.query) setResearchQuery(data.query)
      setResearchResultTs(ts)
    } else {
      setAgentResult(data.result as string)
      setAgentResultTs(ts)
    }
    setAgentStatus('done')
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Agent calls ───────────────────────────────────────────────────────────
  const saveLog = async (action: string, result: unknown, query?: string) => {
    if (!userId) return
    await supabase.from('meal_coach_logs').insert({
      user_id: userId,
      date: dateKey,
      action,
      query: query ?? null,
      result,
    })
  }

  const runAgent = async (action: string, extra: Record<string, unknown> = {}) => {
    setAgentStatus('loading')
    setAgentResult('')
    setAgentResultTs('')
    setResearchResult(null)
    setResearchResultTs('')
    try {
      const res = await fetch('/api/agent/meal-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, entries, calorieGoal, ...extra }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const ts = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      if (action === 'research-food') {
        setResearchResult(json.result)
        setResearchResultTs(ts)
        await saveLog(action, json.result, extra.query as string)
      } else {
        setAgentResult(json.result)
        setAgentResultTs(ts)
        await saveLog(action, json.result)
      }
      setAgentStatus('done')
    } catch {
      setAgentStatus('error')
    }
  }

  const autofillRow = (data: Record<string, string>) => {
    const newId = crypto.randomUUID()
    const sortOrder = entries.length
    const newEntry: MealEntry = {
      id: newId,
      meal: '',
      food: data.food ?? '',
      servings: data.servings ?? '1',
      servingSize: data.servingSize ?? '',
      protein: data.protein ?? '',
      carbs: data.carbs ?? '',
      sugar: data.sugar ?? '',
      fat: data.fat ?? '',
      calories: data.calories ?? '',
      sortOrder,
    }
    setEntries(prev => [...prev, newEntry])
    if (!userId) return
    supabase.from('meal_entries').insert({
      id: newId, user_id: userId, date: dateKey,
      meal: '', food: newEntry.food, servings: newEntry.servings,
      serving_size: newEntry.servingSize, protein: newEntry.protein,
      carbs: newEntry.carbs, sugar: newEntry.sugar, fat: newEntry.fat,
      calories: newEntry.calories, sort_order: sortOrder,
    })
  }

  const runWeeklyAnalysis = async () => {
    if (!userId) return
    setAgentStatus('loading')
    setAgentResult('')
    // Fetch this week's data
    const weekStart = new Date(selectedDate)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return d.toISOString().split('T')[0]
    })
    const { data: rows } = await supabase
      .from('meal_entries')
      .select('*')
      .eq('user_id', userId)
      .in('date', weekDates)
    const weekData = weekDates.map(date => ({
      date,
      calorieGoal,
      entries: ((rows ?? []) as DbRow[]).filter(r => r.date === date).map(rowToEntry),
    }))
    try {
      const res = await fetch('/api/agent/meal-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze-weekly', calorieGoal, weekData }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const ts = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      setAgentResult(json.result)
      setAgentResultTs(ts)
      setAgentStatus('done')
      await saveLog('analyze-weekly', json.result)
    } catch {
      setAgentStatus('error')
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalCal  = sumNum(entries, 'calories')
  const goal      = parseFloat(calorieGoal) || 0
  const remaining = goal - totalCal

  const dateLabel = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  const statusLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved'  ? '✓ Saved'
    : saveStatus === 'error'  ? '⚠ Error'
    : userId ? 'Synced' : 'Not signed in'

  const inp  = 'w-full bg-transparent outline-none text-[13px] text-gray-700 placeholder:text-gray-300'
  const ninp = inp + ' text-center'
  const bd   = 'border border-[rgba(200,160,170,0.25)]'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="max-w-[1300px] mx-auto px-4 sm:px-6 py-8 sm:py-12" id="meals">
      <SectionHeader iconSrc="/icons/diet.png" label="Nourish Your Body" title="Meals & Lifestyle" subtitle="Track your daily nutrition." />

      <FadeInView delay={0.1}>
        <div className="bg-[#fffcf8] rounded-[20px] shadow-card overflow-hidden">

          {/* ── Header ── */}
          <div
            className="px-6 sm:px-8 py-4 border-b flex items-center justify-between flex-wrap gap-3"
            style={{ borderColor: 'rgba(200,160,170,0.12)', background: 'linear-gradient(135deg, #fdf5f7 0%, #fffcf8 100%)' }}
          >
            <h2 className="font-playfair text-2xl font-bold text-petal-deep">Food Diary</h2>
            <div className="flex items-center flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-ink-mid whitespace-nowrap">Daily Calorie Goal</span>
                <input
                  value={calorieGoal}
                  onChange={e => updateGoal(e.target.value)}
                  className="w-20 text-[18px] font-bold text-petal-deep border-b-2 border-petal-deep outline-none text-center bg-transparent"
                />
              </div>
              <span className="text-[11px] font-semibold tracking-wide uppercase text-petal-deep">{statusLabel}</span>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="flex overflow-x-auto">

            {/* Date label — vertical */}
            <div
              className="hidden sm:flex items-center justify-center flex-shrink-0 border-r border-[rgba(200,160,170,0.25)]"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', background: '#fdf0f4', minWidth: 36, padding: '12px 8px' }}
            >
              <span className="text-[11px] font-semibold text-petal-deep whitespace-nowrap">{dateLabel}</span>
            </div>

            <table className="w-full border-collapse" style={{ minWidth: 680 }}>
              <thead>
                <tr style={{ background: '#fdf0f4' }}>
                  <th className={`text-[11px] font-semibold text-petal-deep py-2.5 px-3 text-center w-14 ${bd}`}>Meal</th>
                  <th className={`text-[11px] font-semibold text-petal-deep py-2.5 px-3 text-left ${bd}`}>Food / Drink</th>
                  <th className={`text-[11px] font-semibold text-petal-deep py-2.5 px-3 text-center w-18 ${bd}`}># of<br />Servings</th>
                  <th className={`text-[11px] font-semibold text-petal-deep py-2.5 px-3 text-center w-20 ${bd}`}>Serving<br />Size</th>
                  <th className={`text-[11px] font-semibold text-petal-deep py-2.5 px-3 text-center w-16 ${bd}`}>Protein<br />(g)</th>
                  <th className={`text-[11px] font-semibold text-petal-deep py-2.5 px-3 text-center w-16 ${bd}`}>Carbs<br />(g)</th>
                  <th className={`text-[11px] font-semibold text-petal-deep py-2.5 px-3 text-center w-16 ${bd}`}>Sugar<br />(g)</th>
                  <th className={`text-[11px] font-semibold text-petal-deep py-2.5 px-3 text-center w-16 ${bd}`}>Fat<br />(g)</th>
                  <th className={`text-[11px] font-semibold text-petal-deep py-2.5 px-3 text-center w-20 ${bd}`}>Calories</th>
                  <th className={`w-7 ${bd}`} />
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[13px] text-ink-faint">
                      {userId ? 'No entries yet — add one below!' : 'Sign in to track meals.'}
                    </td>
                  </tr>
                )}
                {entries.map((entry, i) => (
                  <tr key={entry.id} style={{ background: i % 2 === 0 ? '#fdf8fa' : '#fffcf8' }} className="group">
                    <td className={`py-2 px-2 ${bd} text-center`}>
                      <select
                        value={entry.meal}
                        onChange={e => updateEntry(entry.id, 'meal', e.target.value)}
                        className="bg-transparent outline-none text-[12px] font-bold text-petal-deep text-center w-full cursor-pointer"
                      >
                        <option value="" />
                        {MEAL_LABELS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </td>
                    <td className={`py-2 px-3 ${bd}`}>
                      <input value={entry.food} onChange={e => updateEntry(entry.id, 'food', e.target.value)} placeholder="Food or drink" className={inp} />
                    </td>
                    <td className={`py-2 px-2 ${bd}`}>
                      <input value={entry.servings} onChange={e => updateEntry(entry.id, 'servings', e.target.value)} placeholder="1" className={ninp} />
                    </td>
                    <td className={`py-2 px-2 ${bd}`}>
                      <input value={entry.servingSize} onChange={e => updateEntry(entry.id, 'servingSize', e.target.value)} placeholder="1 cup" className={ninp} />
                    </td>
                    <td className={`py-2 px-2 ${bd}`}>
                      <input value={entry.protein} onChange={e => updateEntry(entry.id, 'protein', e.target.value)} placeholder="0" className={ninp} />
                    </td>
                    <td className={`py-2 px-2 ${bd}`}>
                      <input value={entry.carbs} onChange={e => updateEntry(entry.id, 'carbs', e.target.value)} placeholder="0" className={ninp} />
                    </td>
                    <td className={`py-2 px-2 ${bd}`}>
                      <input value={entry.sugar} onChange={e => updateEntry(entry.id, 'sugar', e.target.value)} placeholder="0" className={ninp} />
                    </td>
                    <td className={`py-2 px-2 ${bd}`}>
                      <input value={entry.fat} onChange={e => updateEntry(entry.id, 'fat', e.target.value)} placeholder="0" className={ninp} />
                    </td>
                    <td className={`py-2 px-2 ${bd}`}>
                      <input value={entry.calories} onChange={e => updateEntry(entry.id, 'calories', e.target.value)} placeholder="0" className={ninp} />
                    </td>
                    <td className={`py-1 px-1 ${bd} text-center`}>
                      <button
                        onClick={() => deleteRow(entry.id)}
                        className="text-[11px] text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#fdf0f4' }}>
                  <td className={`py-2.5 px-3 ${bd} text-[12px] font-bold text-petal-deep text-center`}>
                    {totalCal > 0 ? Math.round(totalCal) : ''}
                  </td>
                  <td colSpan={3} className={`py-2.5 px-3 ${bd} text-[11px] font-bold text-petal-deep text-center uppercase tracking-wide`}>
                    Daily Totals (Calories Remaining: {Math.round(remaining)})
                  </td>
                  {(['protein', 'carbs', 'sugar', 'fat'] as const).map(f => {
                    const v = sumNum(entries, f)
                    return <td key={f} className={`py-2.5 px-2 ${bd} text-[12px] font-bold text-petal-deep text-center`}>{v > 0 ? fmt(v) : ''}</td>
                  })}
                  <td className={`py-2.5 px-2 ${bd} text-[12px] font-bold text-petal-deep text-center`}>
                    {totalCal > 0 ? Math.round(totalCal) : ''}
                  </td>
                  <td className={bd} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-t" style={{ borderColor: 'rgba(200,160,170,0.1)' }}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-ink-faint">B = Breakfast · L = Lunch · D = Dinner · S = Snack</span>
              <motion.button
                onClick={() => {
                const next = !agentOpen
                setAgentOpen(next)
                if (next) {
                  setAgentStatus('idle'); setAgentResult(''); setAgentResultTs('')
                  setResearchResult(null); setResearchResultTs('')
                  loadSavedLog(agentTab)
                }
              }}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-petal-light text-petal-deep hover:bg-petal-pale transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                🤖 Meal Coach {agentOpen ? '▲' : '▼'}
              </motion.button>
            </div>
            <button
              onClick={addRow}
              disabled={!userId}
              className="text-[12px] font-semibold px-4 py-2 rounded-full border border-petal-light text-gray-500 hover:bg-petal-pale hover:border-petal transition-colors disabled:opacity-40"
            >
              + Add Row
            </button>
          </div>

          {/* ── Meal Coach Panel ── */}
          <AnimatePresence>
            {agentOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="border-t px-6 py-5 space-y-4" style={{ borderColor: 'rgba(200,160,170,0.1)', background: 'linear-gradient(135deg, #fdf5f7 0%, #fffcf8 100%)' }}>

                  {/* Tab bar */}
                  <div className="flex items-center bg-[#fffcf8] rounded-full p-0.5 gap-0.5 w-fit max-w-full overflow-x-auto shadow-sm border border-petal-light">
                    {([
                      { key: 'daily',    label: '📊 Daily' },
                      { key: 'weekly',   label: '📅 Weekly' },
                      { key: 'research', label: '🔍 Research' },
                      { key: 'guidance', label: '💬 Ask' },
                    ] as const).map(t => (
                      <button
                        key={t.key}
                        onClick={() => {
                          setAgentTab(t.key)
                          setAgentStatus('idle'); setAgentResult(''); setAgentResultTs('')
                          setResearchResult(null); setResearchResultTs('')
                          loadSavedLog(t.key)
                        }}
                        className={`text-[11px] font-semibold tracking-wide px-3 py-1.5 rounded-full transition-colors ${
                          agentTab === t.key ? 'bg-petal-deep text-white shadow-sm' : 'text-ink-soft hover:text-ink-mid'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Daily tab */}
                  {agentTab === 'daily' && (
                    <div className="space-y-3">
                      <p className="text-[12px] text-ink-soft">Analyze today&apos;s meals against your calorie goal and get nutrition insights.</p>
                      <motion.button
                        onClick={() => runAgent('analyze-daily')}
                        disabled={agentStatus === 'loading'}
                        className="text-[12px] font-semibold px-4 py-2 rounded-full bg-petal-deep text-white hover:bg-petal transition-colors disabled:opacity-50"
                        whileTap={{ scale: 0.95 }}
                      >
                        {agentStatus === 'loading' ? 'Analyzing…' : 'Analyze Today'}
                      </motion.button>
                    </div>
                  )}

                  {/* Weekly tab */}
                  {agentTab === 'weekly' && (
                    <div className="space-y-3">
                      <p className="text-[12px] text-ink-soft">Get a full week review of your nutrition patterns and consistency.</p>
                      <motion.button
                        onClick={runWeeklyAnalysis}
                        disabled={agentStatus === 'loading'}
                        className="text-[12px] font-semibold px-4 py-2 rounded-full bg-petal-deep text-white hover:bg-petal transition-colors disabled:opacity-50"
                        whileTap={{ scale: 0.95 }}
                      >
                        {agentStatus === 'loading' ? 'Analyzing…' : 'Analyze This Week'}
                      </motion.button>
                    </div>
                  )}

                  {/* Research tab */}
                  {agentTab === 'research' && (
                    <div className="space-y-3">
                      <p className="text-[12px] text-ink-soft">Look up macros for any food, brand, or dish and autofill directly into your diary.</p>
                      <div className="flex gap-2">
                        <input
                          value={researchQuery}
                          onChange={e => setResearchQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && researchQuery && runAgent('research-food', { query: researchQuery })}
                          placeholder="e.g. Chobani Greek Yogurt, Big Mac, 100g chicken breast…"
                          className="flex-1 text-[13px] px-4 py-2 rounded-full border border-petal-light outline-none focus:border-petal bg-[#fffcf8] text-gray-700 placeholder:text-gray-300"
                        />
                        <motion.button
                          onClick={() => researchQuery && runAgent('research-food', { query: researchQuery })}
                          disabled={agentStatus === 'loading' || !researchQuery}
                          className="text-[12px] font-semibold px-4 py-2 rounded-full bg-petal-deep text-white hover:bg-petal transition-colors disabled:opacity-50"
                          whileTap={{ scale: 0.95 }}
                        >
                          {agentStatus === 'loading' ? '…' : 'Look Up'}
                        </motion.button>
                      </div>

                      {/* Research result card */}
                      <AnimatePresence>
                        {agentStatus === 'done' && researchResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="rounded-2xl border border-petal-light p-4 bg-[#fffcf8] space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[14px] text-ink-dark">{researchResult.food}</p>
                                <p className="text-[12px] text-ink-soft">{researchResult.servings} serving · {researchResult.servingSize}{researchResultTs && <span className="ml-2 text-ink-faint text-[10px]">{researchResultTs}</span>}</p>
                              </div>
                              <motion.button
                                onClick={() => autofillRow(researchResult)}
                                className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-petal-deep text-white hover:bg-petal transition-colors whitespace-nowrap flex-shrink-0"
                                whileTap={{ scale: 0.95 }}
                              >
                                + Add to Diary
                              </motion.button>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {[
                                { label: 'Calories', value: researchResult.calories, unit: 'kcal' },
                                { label: 'Protein',  value: researchResult.protein,  unit: 'g' },
                                { label: 'Carbs',    value: researchResult.carbs,    unit: 'g' },
                                { label: 'Sugar',    value: researchResult.sugar,    unit: 'g' },
                                { label: 'Fat',      value: researchResult.fat,      unit: 'g' },
                              ].map(m => (
                                <div key={m.label} className="text-center rounded-xl py-2 px-1" style={{ background: '#fdf0f4' }}>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-petal-deep">{m.label}</p>
                                  <p className="text-[15px] font-bold text-ink-dark">{m.value}</p>
                                  <p className="text-[10px] text-ink-faint">{m.unit}</p>
                                </div>
                              ))}
                            </div>
                            {researchResult.notes && (
                              <p className="text-[12px] text-ink-soft italic">{researchResult.notes}</p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Guidance tab */}
                  {agentTab === 'guidance' && (
                    <div className="space-y-3">
                      <p className="text-[12px] text-ink-soft">Ask anything — weight loss, macros, meal timing, specific foods, or general nutrition advice.</p>
                      <div className="flex gap-2">
                        <input
                          value={guidanceQ}
                          onChange={e => setGuidanceQ(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && guidanceQ && runAgent('guidance', { question: guidanceQ })}
                          placeholder="e.g. How many calories to lose 1lb/week? Is this enough protein?"
                          className="flex-1 text-[13px] px-4 py-2 rounded-full border border-petal-light outline-none focus:border-petal bg-[#fffcf8] text-gray-700 placeholder:text-gray-300"
                        />
                        <motion.button
                          onClick={() => guidanceQ && runAgent('guidance', { question: guidanceQ })}
                          disabled={agentStatus === 'loading' || !guidanceQ}
                          className="text-[12px] font-semibold px-4 py-2 rounded-full bg-petal-deep text-white hover:bg-petal transition-colors disabled:opacity-50"
                          whileTap={{ scale: 0.95 }}
                        >
                          {agentStatus === 'loading' ? '…' : 'Ask'}
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {/* Shared result output (daily / weekly / guidance) */}
                  <AnimatePresence>
                    {agentStatus === 'done' && agentResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl border border-petal-light p-4 bg-[#fffcf8]"
                        style={{ background: 'linear-gradient(135deg, #fdf0f4, #fce8ef)' }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-semibold tracking-[3px] uppercase text-petal">
                            {agentTab === 'daily' ? '📊 Daily Analysis' : agentTab === 'weekly' ? '📅 Weekly Review' : '💬 Coach Response'}
                          </p>
                          {agentResultTs && <span className="text-[10px] text-ink-faint">{agentResultTs}</span>}
                        </div>
                        <div className="space-y-1.5">
                          {agentResult.split('\n').filter(Boolean).map((line, i) => (
                            <p key={i} className="text-[13px] text-ink-mid leading-relaxed">{line}</p>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    {agentStatus === 'error' && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12px] text-red-400">
                        Something went wrong — check your OpenAI API key.
                      </motion.p>
                    )}
                  </AnimatePresence>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </FadeInView>
    </section>
  )
}
