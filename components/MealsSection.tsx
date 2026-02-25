'use client'

import SectionHeader from './ui/SectionHeader'
import FadeInView from './ui/FadeInView'
import PlannerCard, { CardList } from './ui/PlannerCard'
import { useDailySection } from '@/hooks/useDailySection'

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const mealCols = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

const groceryItems = [
  'Proteins: ___________________',
  'Vegetables: ___________________',
  'Fruits: ___________________',
  'Grains: ___________________',
  'Dairy: ___________________',
  'Snacks: ___________________',
  'Other: ___________________',
]

interface MealsData extends Record<string, unknown> {
  grid: Record<string, string>  // key: "Monday-Breakfast"
  recipes: string
}

const defaultMeals = (): MealsData => ({ grid: {}, recipes: '' })

const taClass = 'w-full border border-dashed border-petal-light rounded-lg p-3 font-dm text-[13px] text-ink-mid bg-warm-white resize-y outline-none focus:border-petal transition-colors placeholder:text-ink-faint'

export default function MealsSection() {
  const { data, update, saved } = useDailySection<MealsData>('meals', defaultMeals)

  const cellKey = (day: string, col: string) => `${day}-${col}`

  const setCell = (day: string, col: string, val: string) => {
    update('grid', { ...data.grid, [cellKey(day, col)]: val })
  }

  return (
    <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12" id="meals">
      <SectionHeader icon="🥗" label="Nourish Your Body" title="Meals & Lifestyle" subtitle="Plan your meals to fuel your glow-up." />
      {saved && <p className="text-[11px] text-petal-deep font-semibold mb-4 text-right">✓ Saved</p>}

      <FadeInView delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

          {/* Meal planner — full width */}
          <div className="md:col-span-2">
            <div
              className="bg-white rounded-[20px] shadow-soft overflow-hidden"
            >
              <div className="h-1 w-full" style={{ background: '#f5c4a1' }} />
              <div className="p-4 sm:p-7 md:p-9">
                <h3 className="font-playfair text-xl text-ink-dark mb-1.5">🍽️ Meal Planner</h3>
                <p className="text-[13px] text-ink-soft mb-5">Weekly meal prep saves time and keeps you on track.</p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[380px]">
                    <thead>
                      <tr>
                        <th className="text-left text-[11px] font-semibold tracking-[1px] uppercase text-ink-soft py-2.5 px-2 sm:px-3 border-b-2 border-petal-pale w-[80px]">Day</th>
                        {mealCols.map(col => (
                          <th key={col} className="text-left text-[11px] font-semibold tracking-[1px] uppercase text-ink-soft py-2.5 px-2 sm:px-3 border-b-2 border-petal-pale">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {weekDays.map(day => (
                        <tr key={day} className="border-b" style={{ borderColor: 'rgba(200,160,170,0.08)' }}>
                          <td className="py-2.5 px-2 sm:px-3 text-[13px] text-ink-mid font-medium whitespace-nowrap">{day}</td>
                          {mealCols.map(col => (
                            <td key={col} className="py-2 px-2 sm:px-3">
                              <input
                                value={data.grid[cellKey(day, col)] ?? ''}
                                onChange={e => setCell(day, col, e.target.value)}
                                placeholder="—"
                                className="w-full min-w-[80px] bg-warm-white rounded-md border border-petal-light px-2 py-1.5 text-[12px] text-ink-mid outline-none focus:border-petal transition-colors placeholder:text-ink-faint"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <PlannerCard color="latte" title="🛒 Grocery List" desc="Never forget what you need.">
            <CardList items={groceryItems} />
          </PlannerCard>

          <PlannerCard color="rose" title="📖 Recipe Gallery" desc="Save your favorite recipes here.">
            <textarea
              value={data.recipes}
              onChange={e => update('recipes', e.target.value)}
              placeholder="Recipe name, ingredients, steps..."
              style={{ minHeight: 140 }}
              className={taClass}
            />
          </PlannerCard>

        </div>
      </FadeInView>
    </section>
  )
}
