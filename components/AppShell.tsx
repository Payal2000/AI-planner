'use client'

import { DateProvider } from '@/context/DateContext'
import DashboardShell from './v2/DashboardShell'

export default function AppShell() {
  return (
    <DateProvider>
      <DashboardShell />
    </DateProvider>
  )
}
