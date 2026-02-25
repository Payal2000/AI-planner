'use client'

import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export type PanelId =
  | 'home'
  | 'schedule'
  | 'planner'
  | 'habits'
  | 'weekly'
  | 'goals'
  | 'fitness'
  | 'meals'
  | 'agents'
  | 'jobs'

interface NavItem {
  id: PanelId
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',     label: 'Home',          icon: '⌂' },
  { id: 'schedule', label: 'Schedule',       icon: '⏰' },
  { id: 'planner',  label: 'Daily Planner',  icon: '📋' },
  { id: 'habits',   label: 'Habits',         icon: '✦' },
  { id: 'weekly',   label: 'Weekly View',    icon: '📅' },
  { id: 'goals',    label: 'Goals',          icon: '◎' },
  { id: 'fitness',  label: 'Fitness',        icon: '◈' },
  { id: 'meals',    label: 'Meals',          icon: '◉' },
  { id: 'agents',   label: 'AI Agents',      icon: '✦' },
  { id: 'jobs',     label: 'Job Tracker',    icon: '◫' },
]

interface SidebarProps {
  active: PanelId
  onNav: (id: PanelId) => void
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ active, onNav, collapsed, onToggle }: SidebarProps) {
  const supabase = createClient()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="flex flex-col h-screen bg-white border-r border-petal-light transition-all duration-300 flex-shrink-0"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-petal-light min-h-[64px]">
        <Image src="/bow.png" alt="AI Planner" width={28} height={28} className="flex-shrink-0" />
        {!collapsed && (
          <span className="font-playfair text-[17px] text-ink-dark font-semibold tracking-wide truncate">
            AI Planner
          </span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto flex-shrink-0 w-6 h-6 flex items-center justify-center text-ink-faint hover:text-ink-mid transition-colors"
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group
                ${isActive
                  ? 'bg-petal-pale text-ink-dark border-l-[3px] border-petal-deep pl-[9px]'
                  : 'text-ink-soft hover:bg-warm-white hover:text-ink-mid border-l-[3px] border-transparent pl-[9px]'
                }`}
            >
              <span className={`text-[15px] flex-shrink-0 ${isActive ? 'text-petal-deep' : 'text-ink-faint group-hover:text-ink-soft'}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="text-[13px] font-medium font-dm truncate">
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-petal-light px-2 py-3">
        {userEmail ? (
          <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-petal-pale border border-petal-light flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] text-petal-deep font-semibold uppercase">
                {userEmail[0]}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-ink-mid truncate font-dm">{userEmail}</p>
                <button
                  onClick={handleSignOut}
                  className="text-[10px] text-ink-faint hover:text-petal-deep transition-colors font-dm"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => router.push('/login')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-ink-faint hover:text-petal-deep hover:bg-petal-pale transition-all text-[13px] font-dm ${collapsed ? 'justify-center' : ''}`}
          >
            <span className="text-[15px]">→</span>
            {!collapsed && <span>Sign in</span>}
          </button>
        )}
      </div>
    </aside>
  )
}
