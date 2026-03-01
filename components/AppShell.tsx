'use client'

import { DateProvider } from '@/context/DateContext'
import { useSection } from '@/context/SectionContext'
import { AnimatePresence, motion } from 'framer-motion'
import TimetableSection from './TimetableSection'
import DailyPlanner from './DailyPlanner'
import JobTracker from './JobTracker'
import HabitTracker from './HabitTracker'
import FitnessSection from './FitnessSection'
import MealsSection from './MealsSection'
const sections = {
  timetable: TimetableSection,
  daily:     DailyPlanner,
  weekly:    JobTracker,
  habits:    HabitTracker,
  meals:     MealsSection,
  fitness:   FitnessSection,
}

export default function AppShell() {
  const { activeSection } = useSection()
  const ActiveComponent = sections[activeSection as keyof typeof sections] ?? TimetableSection

  return (
    <DateProvider>
      <div
        className="min-h-screen"
        style={{
          backgroundImage: 'url(/images/castor.png)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center top',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </DateProvider>
  )
}
