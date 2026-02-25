'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSelectedDate } from '@/context/DateContext'
import type { PanelId } from './Sidebar'

const PANEL_TITLES: Record<PanelId, string> = {
  home:     'Overview',
  schedule: 'Daily Schedule',
  planner:  'Daily Planner',
  habits:   'Habit Tracker',
  weekly:   'Weekly View',
  goals:    'Goals',
  fitness:  'Fitness',
  meals:    'Meals',
  agents:   'AI Agents',
  jobs:     'Job Tracker',
}

interface TopBarProps {
  panel: PanelId
  onOpenAgents: () => void
}

export default function TopBar({ panel, onOpenAgents }: TopBarProps) {
  const supabase = createClient()
  const { selectedDate } = useSelectedDate()
  const [greeting, setGreeting] = useState('Good morning')
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 12 && h < 17) setGreeting('Good afternoon')
    else if (h >= 17) setGreeting('Good evening')
    else setGreeting('Good morning')

    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email
      if (email) setUserName(email.split('@')[0])
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dateLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-petal-light px-6 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-ink-faint font-dm mb-0.5">
          {PANEL_TITLES[panel]}
        </p>
        <h1 className="font-playfair text-[20px] text-ink-dark leading-none" suppressHydrationWarning>
          {greeting}{userName ? `, ${userName}` : ''}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <span
          className="hidden sm:inline-block text-[12px] font-cormorant italic text-ink-soft px-3 py-1 rounded-full border border-petal-light bg-petal-pale"
          suppressHydrationWarning
        >
          {dateLabel}
        </span>
        <button
          onClick={onOpenAgents}
          className="flex items-center gap-2 text-[12px] font-semibold tracking-wide uppercase px-4 py-2 rounded-full bg-petal-pale text-petal-deep border border-petal-light hover:bg-petal-light transition-colors font-dm"
        >
          <span>✦</span>
          <span className="hidden sm:inline">AI Agents</span>
        </button>
      </div>
    </header>
  )
}
