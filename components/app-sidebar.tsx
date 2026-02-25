"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import {
  HomeIcon,
  CalendarIcon,
  ClipboardListIcon,
  SparklesIcon,
  BarChart2Icon,
  TargetIcon,
  DumbbellIcon,
  UtensilsIcon,
  BotIcon,
  BriefcaseIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
const NavUser = dynamic(() => import("@/components/nav-user").then(m => ({ default: m.NavUser })), { ssr: false })
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activePanel: PanelId
  onNav: (panel: PanelId) => void
}

export function AppSidebar({ activePanel, onNav, ...props }: AppSidebarProps) {
  const navItems = [
    { title: "Home",         panel: "home"     as PanelId, icon: HomeIcon },
    { title: "Schedule",     panel: "schedule" as PanelId, icon: CalendarIcon },
    { title: "Daily Planner",panel: "planner"  as PanelId, icon: ClipboardListIcon },
    { title: "Habits",       panel: "habits"   as PanelId, icon: SparklesIcon },
    { title: "Weekly View",  panel: "weekly"   as PanelId, icon: BarChart2Icon },
    { title: "Goals",        panel: "goals"    as PanelId, icon: TargetIcon },
    { title: "Fitness",      panel: "fitness"  as PanelId, icon: DumbbellIcon },
    { title: "Meals",        panel: "meals"    as PanelId, icon: UtensilsIcon },
    { title: "AI Agents",    panel: "agents"   as PanelId, icon: BotIcon },
    { title: "Job Tracker",  panel: "jobs"     as PanelId, icon: BriefcaseIcon },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Image src="/bow.png" alt="logo" width={28} height={28} className="rounded-md" />
              <span className="font-playfair text-base font-semibold text-ink-dark">AI Planner</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navItems.map(item => ({
            title: item.title,
            url: "#",
            icon: item.icon,
            isActive: activePanel === item.panel,
            onClick: () => onNav(item.panel),
          }))}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
