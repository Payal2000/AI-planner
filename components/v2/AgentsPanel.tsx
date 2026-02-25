'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelectedDate } from '@/context/DateContext'

interface Agent {
  id: string
  label: string
  description: string
  endpoint: string
  accent: string
  icon: string
  needsDate?: boolean
}

const AGENTS: Agent[] = [
  {
    id: 'daily-brief',
    label: 'Daily Brief',
    description: 'A personalised morning briefing based on your schedule, habits, and priorities for today.',
    endpoint: '/api/agent/daily-brief',
    accent: '#e8a0b4',
    icon: '✦',
    needsDate: true,
  },
  {
    id: 'habit-analysis',
    label: 'Habit Analysis',
    description: 'Deep analysis of your last 4 weeks of habit data — strengths, gaps, and one clear recommendation.',
    endpoint: '/api/agent/habit-analysis',
    accent: '#b8c9a3',
    icon: '◎',
  },
  {
    id: 'cold-outreach',
    label: 'Cold Outreach',
    description: 'A ready-to-send 3-sentence cold message tailored to your current job search context.',
    endpoint: '/api/agent/cold-outreach',
    accent: '#c9b8e8',
    icon: '◈',
    needsDate: true,
  },
  {
    id: 'study-plan',
    label: 'Study Plan',
    description: 'A 5-day structured study plan based on your current LeetCode and learning progress.',
    endpoint: '/api/agent/study-plan',
    accent: '#a8c8e0',
    icon: '◉',
    needsDate: true,
  },
  {
    id: 'weekly-wrap',
    label: 'Weekly Wrap',
    description: 'A weekly review — wins, gaps, and what to focus on next week.',
    endpoint: '/api/agent/weekly-wrap',
    accent: '#e0c88a',
    icon: '◫',
    needsDate: true,
  },
]

interface AgentCardProps {
  agent: Agent
  date: string
}

function AgentCard({ agent, date }: AgentCardProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [output, setOutput] = useState('')

  const generate = async () => {
    setStatus('loading')
    setOutput('')
    try {
      const body = agent.needsDate ? { date } : {}
      const res = await fetch(agent.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      const text = json.brief ?? json.analysis ?? json.message ?? json.plan ?? json.wrap ?? JSON.stringify(json)
      setOutput(text)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="bg-white rounded-[20px] shadow-soft overflow-hidden flex flex-col" style={{ borderLeft: `3px solid ${agent.accent}` }}>
      <div className="px-5 py-5 flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[18px]" style={{ color: agent.accent }}>{agent.icon}</span>
          <h3 className="font-playfair text-[17px] text-ink-dark">{agent.label}</h3>
        </div>
        <p className="text-[13px] text-ink-soft font-dm leading-relaxed">{agent.description}</p>
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={generate}
          disabled={status === 'loading'}
          className="text-[12px] font-semibold tracking-wide uppercase px-5 py-2.5 rounded-full transition-all font-dm disabled:opacity-50"
          style={{
            background: status === 'loading' ? '#f5d5de' : agent.accent,
            color: 'white',
          }}
        >
          {status === 'loading' ? 'Generating…' : status === 'done' ? 'Regenerate' : 'Generate'}
        </button>

        <AnimatePresence>
          {status === 'done' && output && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 rounded-[14px] overflow-hidden"
              style={{ background: `${agent.accent}18` }}
            >
              <div className="px-4 py-4 max-h-[280px] overflow-y-auto">
                <p className="text-[13px] text-ink-mid font-dm leading-[1.9] whitespace-pre-wrap">{output}</p>
              </div>
              <div className="border-t px-4 py-2 flex justify-end" style={{ borderColor: `${agent.accent}30` }}>
                <button
                  onClick={() => { setStatus('idle'); setOutput('') }}
                  className="text-[11px] text-ink-faint hover:text-ink-mid font-dm"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
          {status === 'error' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-[12px] text-red-400 font-dm"
            >
              Something went wrong. Sign in and try again.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function AgentsPanel() {
  const { selectedDate } = useSelectedDate()
  const date = selectedDate.toISOString().split('T')[0]

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-ink-faint font-dm mb-1">Powered by GPT-4o</p>
        <h2 className="font-playfair text-[24px] text-ink-dark">AI Agents</h2>
        <p className="text-[13px] text-ink-soft font-dm mt-1">Each agent reads your real data and generates personalised output.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {AGENTS.map(agent => (
          <AgentCard key={agent.id} agent={agent} date={date} />
        ))}
      </div>
    </div>
  )
}
