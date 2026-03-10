# Glow Up Planner

A personal productivity and wellness planner built for women doing a serious glow-up: tracking career goals, daily habits, job applications, fitness, meals, and more. Powered by Next.js, Supabase, and OpenAI.
<img width="1657" height="932" alt="Screenshot 2026-03-09 at 8 04 05 PM" src="https://github.com/user-attachments/assets/a8c44b56-ba35-44d9-9ad6-35c7c6039a60" />

## Features

### Timetable
- Color-coded daily schedule builder with drag-and-drop time blocks
- Block types: Work, Study, Workout, Break, Personal, and more
- Per-day persistence via Supabase

### Daily Planner
- Set daily intentions and top priorities with checkboxes
- Track LeetCode problems solved, study notes, build log, and cold outreach
- Reflection section at end of day
- AI-generated **Daily Brief** — a personalised 150-word morning briefing based on your data

### Job Tracker
- Full application table: company, position, status, date, salary, next actions, contact, reference link
- Smart status selector (Applied, Interviewing, Offer, Rejected, Withdrawn)
- Sort by date descending, debounced cloud save
- AI **Cold Outreach Drafter** — 3-sentence LinkedIn DM per row, one click
- **Analytics tab** — stat cards, status breakdown bars, applications by month chart, conversion pipeline

<img width="1680" height="776" alt="Screenshot 2026-03-09 at 8 04 30 PM" src="https://github.com/user-attachments/assets/451a0714-6cb4-4e49-bc60-eecf51066da0" />


### Habit Tracker
- Fully customisable habit list — add, remove, and rename habits inline
- 7-day week grid (desktop table + mobile cards)
- Per-habit clear row and global clear all
- Habits synced to Supabase `habit_settings` (list) and `habit_weeks` (completions)
- AI **4-Week Habit Analysis** — identifies strengths, gaps, and concrete fixes
- AI **Weekly Wrap-Up** — structured review auto-saved to Sunday's notes

### Meals
- Food diary with columns: Meal, Food/Drink, Servings, Serving Size, Protein, Carbs, Sugar, Fat, Calories
- Daily totals row with macro summary
- Per-date persistence via Supabase `meal_entries` table
- AI **Meal Coach** with 4 modes:
  - **Daily Analysis** — macro breakdown and actionable insights for today
  - **Weekly Review** — consistency, protein trend, weekly grade
  - **Food Research** — look up any food's macros and autofill the diary
  - **Ask Anything** — nutrition Q&A with context from today's log
- All coach results saved to `meal_coach_logs` and loaded on panel open

<img width="1580" height="882" alt="Screenshot 2026-03-09 at 8 04 51 PM" src="https://github.com/user-attachments/assets/790a9229-7810-473e-a4b7-7417d883d83f" />


### Goals
- Goal cards with progress tracking
- Category tags and target dates

### Fitness
- Workout log with exercise, sets, reps, and notes
- Per-date persistence

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth + Database | Supabase (Postgres + RLS) |
| AI | OpenAI `gpt-4o-mini` |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Language | TypeScript |

## Getting Started

### 1. Clone and install
```bash
git clone <your-repo-url>
cd glow-up-planner
npm install
```

### 2. Set up environment variables
Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

> `OPENAI_API_KEY` is server-only — never prefix it with `NEXT_PUBLIC_`.

### 3. Set up the database
Run the following tables in your Supabase SQL editor:

- `daily_plans` — daily planner + timetable data
- `habit_weeks` — weekly habit completion grid
- `habit_settings` — custom habit list per user
- `job_applications` — job tracker rows
- `meal_entries` — food diary entries per date
- `meal_settings` — calorie goal per user
- `meal_coach_logs` — saved AI meal coach results

All tables require RLS with `auth.uid() = user_id` policies.

### 4. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in **Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
4. In **Supabase → Authentication → URL Configuration**, add your Vercel URL as a redirect URL: `https://your-project.vercel.app/**`
5. Deploy

## AI Agents

All AI features call server-side API routes so the OpenAI key never reaches the client.

| Agent | Route | What it does |
|---|---|---|
| Daily Brief | `/api/agent/daily-brief` | 150-word morning briefing from today's data |
| Habit Analysis | `/api/agent/habit-analysis` | 4-week habit pattern report |
| Weekly Wrap-Up | `/api/agent/weekly-wrap` | Weekly review auto-saved to Sunday notes |
| Study Plan | `/api/agent/study-plan` | 5-day LeetCode plan from your tracking data |
| Cold Outreach | `/api/agent/cold-outreach` | 3-sentence LinkedIn DM per job application |
| Meal Coach | `/api/agent/meal-coach` | Daily/weekly nutrition analysis, food research, Q&A |

## Project Structure

```
app/
  api/agent/          # AI agent API routes
  auth/               # Supabase auth callback
  page.tsx            # Main page
components/
  TimetableSection.tsx # Schedule builder
  DailyPlanner.tsx    # Daily planner + AI brief
  JobTracker.tsx      # Job tracker + analytics + cold outreach
  HabitTracker.tsx    # Habit grid + AI analysis + weekly wrap
  MealsSection.tsx    # Food diary + Meal Coach AI
  GoalsSection.tsx    # Goals tracker
  FitnessSection.tsx  # Fitness log
context/
  DateContext.tsx     # Global selected date state
lib/
  supabase/           # Supabase client (browser + server)
```
