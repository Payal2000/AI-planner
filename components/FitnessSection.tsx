'use client'

import SectionHeader from './ui/SectionHeader'
import FadeInView from './ui/FadeInView'
import PlannerCard, { CardList } from './ui/PlannerCard'
import ProgressBar from './ui/ProgressBar'
import { useDailySection } from '@/hooks/useDailySection'

const workoutPlan = [
  'AM (Fasted, 15 min): HIIT / Cardio / Yoga',
  'PM (30 min): Strength Training',
  'Mon — Legs + Glutes',
  'Tue — Upper Body + Core',
  'Wed — Cardio + Flexibility',
  'Thu — Back + Shoulders',
  'Fri — Full Body',
  'Sat — Active Recovery / Walk',
  'Sun — Rest Day',
]

const bodyTrackerLabels = [
  'Current Weight',
  'Goal Weight',
  'Waist',
  'Hips',
  'Arms',
  'Energy Level (1–10)',
  'How I Feel',
]

interface FitnessData extends Record<string, unknown> {
  notes: string
  body: Record<string, string>
  goalTitle: string
  goalPercent: number
}

const defaultFitness = (): FitnessData => ({
  notes: '',
  body: {},
  goalTitle: '',
  goalPercent: 0,
})

const inputClass = 'flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-ink-faint border-b border-petal-light focus:border-petal transition-colors text-ink-mid'
const taClass = 'w-full border border-dashed border-petal-light rounded-lg p-3 font-dm text-[13px] text-ink-mid bg-transparent resize-y outline-none focus:border-petal transition-colors placeholder:text-ink-faint'

export default function FitnessSection() {
  const { data, update, saved } = useDailySection<FitnessData>('fitness', defaultFitness)

  return (
    <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12" id="fitness">
      <SectionHeader iconSrc="/icons/headphones.png" label="Move Your Body" title="Fitness & Glow-Up" subtitle="45 min daily — 15 min fasted AM + 30 min PM strength." />
      {saved && <p className="text-[11px] text-petal-deep font-semibold mb-4 text-right">✓ Saved</p>}
      <FadeInView delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <PlannerCard color="rose" title="🏋️ Workout Planner" desc="Split across morning & evening for max results." style={{ background: '#ffffff' }}>
            <CardList items={workoutPlan} />
          </PlannerCard>

          <PlannerCard color="latte" title="📊 Body Progress Tracker" desc="Track changes weekly — be patient with yourself." style={{ background: '#ffffff' }}>
            <ul className="list-none">
              {bodyTrackerLabels.map((label) => (
                <li key={label} className="flex items-center gap-2 py-2 border-b border-[rgba(200,160,170,0.1)] last:border-0">
                  <span className="text-[12px] text-ink-soft w-[110px] flex-shrink-0">{label}:</span>
                  <input
                    value={data.body[label] ?? ''}
                    onChange={e => update('body', { ...data.body, [label]: e.target.value })}
                    placeholder="—"
                    className={inputClass}
                  />
                </li>
              ))}
            </ul>
          </PlannerCard>

          <PlannerCard color="lavender" title="🎯 Fitness Goals" desc="What are you working toward?" style={{ background: '#ffffff' }}>
            <div className="mb-3">
              <input
                value={data.goalTitle}
                onChange={e => update('goalTitle', e.target.value)}
                placeholder="Goal: ____________________"
                className="w-full text-[13px] text-ink-mid bg-transparent outline-none border-b border-petal-light focus:border-petal transition-colors mb-2 pb-1"
              />
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] text-ink-soft">Progress:</span>
                <input
                  type="range" min={0} max={100}
                  value={data.goalPercent}
                  onChange={e => update('goalPercent', Number(e.target.value))}
                  className="flex-1 accent-petal-deep"
                />
                <span className="text-[11px] font-semibold text-petal-deep w-8">{data.goalPercent}%</span>
              </div>
              <ProgressBar title="" percent={data.goalPercent} label={`${data.goalPercent}% there`} />
            </div>
            <textarea
              value={data.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Notes: what's working, what to adjust..."
              style={{ minHeight: 80 }}
              className={taClass}
            />
          </PlannerCard>
        </div>
      </FadeInView>
    </section>
  )
}
