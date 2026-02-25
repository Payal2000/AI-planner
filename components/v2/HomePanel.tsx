'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSelectedDate } from '@/context/DateContext'
import type { PanelId } from './Sidebar'

const habits = [
  '🏋️ Morning Workout',
  '💌 Cold Outreach',
  '💻 LeetCode',
  '📚 Study',
  '🔨 Build',
  '📋 Applications',
  '💧 Water',
  '🌙 Skincare',
  '😴 Sleep by 10:30',
  '🧘 Evening Workout',
]

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekStart(date: Date): string {
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((day + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

interface StatCardProps {
  label: string
  value: string | number
  accent: string
  sub?: string
}
function StatCard({ label, value, accent, sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-[16px] shadow-soft p-4 flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-ink-faint font-dm">{label}</p>
      <p className="font-playfair text-[32px] leading-none" style={{ color: accent }}>{value}</p>
      {sub && <p className="text-[11px] text-ink-soft font-dm">{sub}</p>}
    </div>
  )
}

interface HomePanelProps {
  onNav: (id: PanelId) => void
}

export default function HomePanel({ onNav }: HomePanelProps) {
  const supabase = createClient()
  const { selectedDate } = useSelectedDate()
  const dateKey = selectedDate.toISOString().split('T')[0]
  const weekStart = getWeekStart(selectedDate)

  const [timetableBlocks, setTimetableBlocks] = useState<{ time: string; activity: string; type: string }[]>([])
  const [habitsDoneToday, setHabitsDoneToday] = useState(0)
  const [prioritiesDone, setPrioritiesDone] = useState(0)
  const [prioritiesTotal, setPrioritiesTotal] = useState(3)
  const [jobCount, setJobCount] = useState(0)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [planRow, habitRow, jobRow] = await Promise.all([
        supabase.from('daily_plans').select('data').eq('user_id', user.id).eq('date', dateKey).maybeSingle(),
        supabase.from('habit_weeks').select('filled').eq('user_id', user.id).eq('week_start', weekStart).maybeSingle(),
        supabase.from('daily_plans').select('data').eq('user_id', user.id).eq('date', 'job-tracker').maybeSingle(),
      ])

      // Timetable preview
      if (planRow.data?.data?.timetable) {
        setTimetableBlocks(planRow.data.data.timetable.slice(0, 6))
      }

      // Priorities done
      const priorities: { done: boolean }[] = planRow.data?.data?.priorities ?? []
      setPrioritiesDone(priorities.filter(p => p.done).length)
      setPrioritiesTotal(priorities.length || 3)

      // Habits done today
      if (habitRow.data?.filled) {
        const todayIndex = (selectedDate.getDay() + 6) % 7
        const todayKey = days[todayIndex]
        let count = 0
        for (let i = 0; i < habits.length; i++) {
          if (habitRow.data.filled[`${i}-${todayKey}`]) count++
        }
        setHabitsDoneToday(count)
      }

      // Job count
      if (jobRow.data?.data?.applications) {
        setJobCount(jobRow.data.data.applications.length)
      }

      // Streak: count consecutive weeks with any habits done
      const { data: allWeeks } = await supabase
        .from('habit_weeks')
        .select('week_start, filled')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(12)

      if (allWeeks) {
        let s = 0
        for (const w of allWeeks) {
          const total = Object.values(w.filled ?? {}).filter(Boolean).length
          if (total > 0) s++
          else break
        }
        setStreak(s)
      }
    }
    load()
  }, [dateKey, weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  const dotColors: Record<string, string> = {
    workout: '#b8c9a3', outreach: '#e8a0b4', leetcode: '#c9b8e8',
    study: '#a8c8e0', build: '#f5c4a1', apply: '#e0c88a', break: '#f0e0d4', meal: '#d4b89c',
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Habit Streak" value={`${streak}w`} accent="#c9b8e8" sub="consecutive weeks" />
        <StatCard label="Habits Today" value={habitsDoneToday} accent="#b8c9a3" sub={`of ${habits.length} done`} />
        <StatCard label="Priorities" value={`${prioritiesDone}/${prioritiesTotal}`} accent="#e8a0b4" sub="completed today" />
        <StatCard label="Jobs Tracked" value={jobCount} accent="#e0c88a" sub="total applications" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today's schedule preview */}
        <div className="bg-white rounded-[20px] shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-petal-light flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-ink-faint font-dm">Today&apos;s Schedule</p>
              <h2 className="font-playfair text-[17px] text-ink-dark">First 6 blocks</h2>
            </div>
            <button onClick={() => onNav('schedule')} className="text-[11px] text-petal-deep hover:underline font-dm">View all →</button>
          </div>
          <div className="py-2">
            {timetableBlocks.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-ink-faint font-dm">No schedule saved for today.</p>
            ) : (
              timetableBlocks.map((block, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3 border-b border-petal-light/40 last:border-0">
                  <div className="flex flex-col items-center pt-1 gap-1">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dotColors[block.type] ?? '#e8a0b4' }} />
                    {i < timetableBlocks.length - 1 && <span className="w-px h-4 bg-petal-light" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-ink-faint font-dm">{block.time}</p>
                    <p className="text-[13px] text-ink-mid font-dm truncate">{block.activity}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-[20px] shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-petal-light">
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-ink-faint font-dm">Quick Access</p>
            <h2 className="font-playfair text-[17px] text-ink-dark">Jump to a section</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {([
              { id: 'planner',  label: 'Daily Planner',  color: '#fdf0f4', dot: '#e8a0b4' },
              { id: 'habits',   label: 'Habit Tracker',  color: '#e3ecd8', dot: '#b8c9a3' },
              { id: 'agents',   label: 'AI Agents',      color: '#ede5f7', dot: '#c9b8e8' },
              { id: 'jobs',     label: 'Job Tracker',    color: '#f5ecd0', dot: '#e0c88a' },
              { id: 'goals',    label: 'Goals',          color: '#daeaf5', dot: '#a8c8e0' },
              { id: 'fitness',  label: 'Fitness',        color: '#fce8d5', dot: '#f5c4a1' },
            ] as { id: PanelId; label: string; color: string; dot: string }[]).map(item => (
              <button
                key={item.id}
                onClick={() => onNav(item.id)}
                className="flex items-center gap-2.5 px-4 py-3 rounded-[14px] text-left hover:scale-[1.02] transition-transform"
                style={{ background: item.color }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.dot }} />
                <span className="text-[13px] text-ink-mid font-dm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
