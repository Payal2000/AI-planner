'use client'

import { useState } from 'react'
import Sidebar, { type PanelId } from './Sidebar'
import TopBar from './TopBar'
import HomePanel from './HomePanel'
import AgentsPanel from './AgentsPanel'
import TimetableTimeline from './TimetableTimeline'
import JobsKanban from './JobsKanban'

// Existing sections (adapted for panel use)
import DailyPlanner from '../DailyPlanner'
import HabitTracker from '../HabitTracker'
import WeeklyView from '../WeeklyView'
import GoalsSection from '../GoalsSection'
import FitnessSection from '../FitnessSection'
import MealsSection from '../MealsSection'

export default function DashboardShell() {
  const [panel, setPanel] = useState<PanelId>('home')
  const [collapsed, setCollapsed] = useState(false)

  const renderPanel = () => {
    switch (panel) {
      case 'home':     return <HomePanel onNav={setPanel} />
      case 'schedule': return <TimetableTimeline />
      case 'planner':  return <DailyPlanner />
      case 'habits':   return <HabitTracker />
      case 'weekly':   return <WeeklyView />
      case 'goals':    return <GoalsSection />
      case 'fitness':  return <FitnessSection />
      case 'meals':    return <MealsSection />
      case 'agents':   return <AgentsPanel />
      case 'jobs':     return <JobsKanban />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-warm-white">
      <Sidebar
        active={panel}
        onNav={setPanel}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar panel={panel} onOpenAgents={() => setPanel('agents')} />
        <main className="flex-1 overflow-y-auto">
          {renderPanel()}
        </main>
      </div>
    </div>
  )
}
