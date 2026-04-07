// ─── WeekView ─────────────────────────────────────────────────────────────────
// Displays 7 day cards (Sun–Sat) for the week containing `anchorDate`.
// Clicking a card opens a read-only snapshot modal.
// The "today" card has a highlighted border and can open day-edit mode.

import { useState } from 'react'
import { useAuth }            from '../context/AuthContext'
import { useWeekSnapshots }   from '../hooks/useWeekSnapshots'
import DaySnapshotModal       from '../components/DaySnapshotModal'
import {
  getWeekDates,
  todayString,
  isToday as isTodayFn,
  shortDayName,
  shortDate,
} from '../lib/dateUtils'
import type { DaySnapshot } from '../types'

// ─── Health colour ────────────────────────────────────────────────────────────

type Health = 'green' | 'yellow' | 'gray'

function getDayHealth(snapshot: DaySnapshot | null): Health {
  if (!snapshot) return 'gray'

  const habitValues = Object.values(snapshot.habits)
  const taskCount   = snapshot.kanban.tasks.length

  // If we have habit data, base health on habits
  if (habitValues.length > 0) {
    const ratio = habitValues.filter(Boolean).length / habitValues.length
    if (ratio >= 0.7) return 'green'
    if (ratio >= 0.3) return 'yellow'
    return 'gray'
  }

  // Fallback: any tasks recorded → yellow (something was done)
  if (taskCount > 0) return 'yellow'

  return 'gray'
}

const HEALTH_DOT: Record<Health, string> = {
  green:  'bg-green-500',
  yellow: 'bg-amber-400',
  gray:   'bg-gray-700',
}

const HEALTH_BORDER: Record<Health, string> = {
  green:  'border-green-500/30',
  yellow: 'border-amber-400/30',
  gray:   'border-gray-800/60',
}

// ─── Task/habit summaries ─────────────────────────────────────────────────────

function habitSummary(snapshot: DaySnapshot | null): string {
  if (!snapshot) return ''
  const values = Object.values(snapshot.habits)
  if (values.length === 0) return ''
  const done = values.filter(Boolean).length
  return `✓ ${done}/${values.length}`
}

function taskSummary(snapshot: DaySnapshot | null): string {
  if (!snapshot) return ''
  const { columns, tasks } = snapshot.kanban
  if (tasks.length === 0) return ''
  const doneIds = new Set(
    columns.filter((c) => /feito|conclui|done|finaliz/i.test(c.title)).map((c) => c.id)
  )
  const done = doneIds.size > 0 ? tasks.filter((t) => doneIds.has(t.columnId)).length : 0
  return done > 0 ? `${done}/${tasks.length} tarefas` : `${tasks.length} tarefa${tasks.length > 1 ? 's' : ''}`
}

// ─── DayCard ──────────────────────────────────────────────────────────────────

interface DayCardProps {
  dateStr:   string
  snapshot:  DaySnapshot | null
  onClick:   () => void
}

function DayCard({ dateStr, snapshot, onClick }: DayCardProps) {
  const today    = todayString()
  const isToday  = isTodayFn(dateStr)
  const isPast   = dateStr < today
  const isFuture = dateStr > today
  const health   = getDayHealth(snapshot)

  const habits = habitSummary(snapshot)
  const tasks  = taskSummary(snapshot)
  const quote  = snapshot?.quote ?? ''
  const hasData = !!(snapshot && (habits || tasks || quote))

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col gap-2 p-3 rounded-2xl border
        text-left w-full transition-all duration-150
        hover:bg-gray-800/60 hover:border-gray-700 active:scale-[0.98]
        ${isToday
          ? 'border-brand-500/60 bg-brand-500/5 ring-1 ring-brand-500/20'
          : `${HEALTH_BORDER[health]} bg-gray-900/60`
        }
        ${isFuture ? 'opacity-40 cursor-default' : 'cursor-pointer'}
      `}
      disabled={isFuture}
    >
      {/* Day header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${
            isToday ? 'text-brand-400' : isPast ? 'text-gray-500' : 'text-gray-700'
          }`}>
            {shortDayName(dateStr)}
          </p>
          <p className={`text-sm font-medium mt-0.5 ${isToday ? 'text-white' : 'text-gray-300'}`}>
            {shortDate(dateStr)}
          </p>
        </div>

        {/* Health dot */}
        <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${HEALTH_DOT[health]}`} />
      </div>

      {/* Data summary */}
      {hasData ? (
        <div className="flex flex-col gap-1 min-h-[48px]">
          {tasks && (
            <p className="text-xs text-gray-400 truncate">{tasks}</p>
          )}
          {habits && (
            <p className="text-xs text-green-400/80">{habits} hábitos</p>
          )}
          {quote && (
            <p className="text-xs text-gray-600 italic truncate">
              "{quote.slice(0, 50)}{quote.length > 50 ? '…' : ''}"
            </p>
          )}
        </div>
      ) : (
        <div className="min-h-[48px] flex items-center">
          <p className="text-xs text-gray-700">
            {isFuture ? 'Dia futuro' : 'Sem dados'}
          </p>
        </div>
      )}

      {/* Today badge */}
      {isToday && (
        <span className="absolute top-2 right-2 text-[10px] font-semibold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded-full">
          Hoje
        </span>
      )}
    </button>
  )
}

// ─── WeekView ─────────────────────────────────────────────────────────────────

interface WeekViewProps {
  anchorDate: string
  onGoToDay:  (date: string) => void
}

export default function WeekView({ anchorDate, onGoToDay }: WeekViewProps) {
  const { currentUser }  = useAuth()
  const uid              = currentUser?.uid ?? ''
  const weekDates        = getWeekDates(anchorDate)

  const { snapshots, loading } = useWeekSnapshots(uid, weekDates)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const selectedSnapshot = selectedDate ? (snapshots[selectedDate] ?? null) : null

  return (
    <div className="p-6">
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-600 text-sm animate-pulse">
          Carregando semana…
        </div>
      )}

      {/* Cards grid */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {weekDates.map((dateStr) => (
            <DayCard
              key={dateStr}
              dateStr={dateStr}
              snapshot={snapshots[dateStr] ?? null}
              onClick={() => setSelectedDate(dateStr)}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      {!loading && (
        <div className="mt-6 flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> &gt;70% hábitos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 30–70%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-700 inline-block" /> Sem dados
          </span>
        </div>
      )}

      {/* Snapshot modal */}
      {selectedDate && (
        <DaySnapshotModal
          dateStr={selectedDate}
          snapshot={selectedSnapshot}
          onClose={() => setSelectedDate(null)}
          onGoToDay={
            isTodayFn(selectedDate)
              ? () => { onGoToDay(selectedDate); setSelectedDate(null) }
              : undefined
          }
        />
      )}
    </div>
  )
}
