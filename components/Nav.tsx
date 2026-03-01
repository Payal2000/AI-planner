'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthButton from './AuthButton'
import { useSection } from '@/context/SectionContext'

const links: { id: string; label: string; iconSrc: string; iconClass?: string }[] = [
  { id: 'timetable', label: 'Timetable',    iconSrc: '/icons/clock.png' },
  { id: 'daily',     label: 'Daily Planner', iconSrc: '/icons/coffee.png' },
  { id: 'weekly',    label: 'Job Tracker',   iconSrc: '/icons/books.png' },
  { id: 'habits',    label: 'Habits',        iconSrc: '/icons/ribbon.png' },
  { id: 'meals',     label: 'Meals',         iconSrc: '/icons/diet.png' },
  { id: 'fitness',   label: 'Fitness',       iconSrc: '/icons/headphones.png', iconClass: 'w-full h-full scale-[1.7]' },
]

interface NavProps {
  collapsed: boolean
  onToggle: () => void
}

function SidebarLinks({
  active,
  onClickLink,
  collapsed,
}: {
  active: string
  onClickLink: (id: string) => void
  collapsed: boolean
}) {
  return (
    <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
      {links.map(({ id, label, iconSrc, iconClass }) => {
        const isActive = active === id
        return (
          <motion.button
            key={id}
            onClick={() => onClickLink(id)}
            title={collapsed ? label : undefined}
            className={`w-full flex items-center rounded-xl transition-colors duration-200 relative ${collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5'}`}
            style={{
              background: isActive ? 'linear-gradient(135deg, #fce8ef, #fce8ef)' : 'transparent',
              color: isActive ? '#3d2b2b' : '#9c7e7e',
            }}
            whileHover={{ backgroundColor: '#fdf0f4', color: '#6b4f4f' }}
          >
            {isActive && (
              <motion.div
                layoutId="active-bg"
                className="absolute inset-0 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #fce8ef, #fce8ef)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
            <div className="w-10 h-10 flex items-center justify-center shrink-0 relative z-10">
              <img src={iconSrc} alt="" className={`object-contain ${iconClass ?? 'w-full h-full'}`} />
            </div>
            {!collapsed && (
              <span className="text-[15px] font-medium tracking-wide relative z-10 whitespace-nowrap">{label}</span>
            )}
            {!collapsed && isActive && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-petal-deep relative z-10 shrink-0" />
            )}
          </motion.button>
        )
      })}
    </nav>
  )
}

export default function Nav({ collapsed, onToggle }: NavProps) {
  const { activeSection, setActiveSection } = useSection()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleClick = (id: string) => {
    setActiveSection(id as Parameters<typeof setActiveSection>[0])
    setMobileOpen(false)
  }

  const sidebarWidth = collapsed ? 72 : 280

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <motion.aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-50"
        animate={{ width: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          background: 'rgba(254,250,248,0.97)',
          backdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(232,160,180,0.18)',
          boxShadow: '2px 0 24px rgba(200,160,170,0.07)',
          overflow: 'hidden',
        }}
      >
        {/* Logo + collapse toggle */}
        <div className={`flex items-center border-b border-[rgba(232,160,180,0.12)] ${collapsed ? 'justify-center px-2 py-5' : 'justify-between px-5 pt-6 pb-5'}`}>
          {!collapsed && (
            <div>
              <p className="font-playfair text-[20px] text-ink-dark leading-tight whitespace-nowrap">Glow-Up</p>
              <p className="font-cormorant text-[11px] tracking-[4px] text-petal-deep uppercase mt-0.5 whitespace-nowrap">Life Planner</p>
            </div>
          )}
          <button
            onClick={onToggle}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-petal-pale transition-colors text-ink-soft hover:text-ink-dark shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.span
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-[14px] block"
            >
              ‹
            </motion.span>
          </button>
        </div>

        <SidebarLinks active={activeSection} onClickLink={handleClick} collapsed={collapsed} />

        {/* Auth */}
        <div className={`border-t border-[rgba(232,160,180,0.12)] ${collapsed ? 'px-2 py-4 flex justify-center' : 'px-4 py-5'}`}>
          {!collapsed && <AuthButton />}
          {collapsed && (
            <div className="w-8 h-8 rounded-full bg-petal-pale border border-petal-light flex items-center justify-center">
              <img src="/icons/sparkle.png" alt="" className="w-5 h-5 object-contain" />
            </div>
          )}
        </div>
      </motion.aside>

      {/* ── Mobile top bar ──────────────────────────────────── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3.5"
        style={{
          background: 'rgba(254,250,248,0.97)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(232,160,180,0.15)',
        }}
      >
        <div>
          <span className="font-playfair text-[16px] text-ink-dark">Glow-Up </span>
          <span className="font-cormorant italic text-petal-deep text-[16px]">Planner</span>
        </div>
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="w-9 h-9 flex flex-col items-center justify-center gap-[5px]"
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-ink-mid rounded-full transition-all duration-300 origin-center ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
          <span className={`block w-5 h-0.5 bg-ink-mid rounded-full transition-all duration-300 ${mobileOpen ? 'opacity-0 scale-x-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-ink-mid rounded-full transition-all duration-300 origin-center ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
        </button>
      </div>

      {/* ── Mobile overlay ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="md:hidden fixed left-0 top-0 h-screen w-[280px] z-50 flex flex-col"
              style={{
                background: 'rgba(254,250,248,0.99)',
                borderRight: '1px solid rgba(232,160,180,0.18)',
                boxShadow: '4px 0 32px rgba(200,160,170,0.12)',
              }}
            >
              <div className="px-5 pt-7 pb-5 border-b border-[rgba(232,160,180,0.12)]">
                <p className="font-playfair text-[20px] text-ink-dark leading-tight">Glow-Up</p>
                <p className="font-cormorant text-[11px] tracking-[4px] text-petal-deep uppercase mt-0.5">Life Planner</p>
              </div>
              <SidebarLinks active={activeSection} onClickLink={handleClick} collapsed={false} />
              <div className="px-4 py-5 border-t border-[rgba(232,160,180,0.12)]">
                <AuthButton />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
