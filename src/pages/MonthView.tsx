// ─── MonthView ────────────────────────────────────────────────────────────────
// Calendar grid for the month containing `anchorDate`.
// Each cell shows the day number + a coloured "health" dot.
// Clicking any day opens a read-only DaySnapshotModal.

import { useState } from 'react'
import { useAuth }           from '../context/AuthContext'
import { useWeekSnapshots }  from '../hooks/useWeekSnapshots'
import DaySnapshotModal      from '../components/DaySnapshotModal'
import {
  getMonthGrid,
  isSameMonth,
  todayString,
  isToday as isTodayFn,
} from '../lib/dateUtils'
import type { DaySnapshot }  from '../types'

// ─── Health colour ────────────────────────────────────────────────────────────

type Health = 'green' | 'yellow' | 'gray' | 'none'

function getDayHealth(snapshot: DaySnapshot | null, dateStr: string): Health {
  if (dateStr > todayString()) return 'none'  // future
  if (!snapshot) return 'gray'

  const habitValues = Object.values(snapshot.habits)
  const taskCount   = snapshot.kanban.tasks.length

  if (habitValues.length > 0) {
    const ratio = habitValues.filter(Boolean).length / habitValues.length
    if (ratio >= 0.7) return 'green'
    if (ratio >= 0.3) return 'yellow'
    return 'gray'
  }
  if (taskCount > 0) return 'yellow'
  return 'gray'
}

const HEALTH_DOT: Record<Health, string> = {
  green:  'bg-green-500',
  yellow: 'bg-amber-400',
  gray:   'bg-gray-700',
  none:   'opacity-0',
}

// ─── Day headers ──────────────────────────────────────────────────────────────

const WEEK_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// ─── CalendarCell ─────────────────────────────────────────────────────────────

interface CellProps {
  dateStr:       string
  snapshot:      DaySnapshot | null
  isCurrentMonth: boolean
  onClick:       () => void
}

function CalendarCell({ dateStr, snapshot, isCurrentMonth, onClick }: CellProps) {
  const today    = todayString()
  const isToday  = isTodayFn(dateStr)
  const isFuture = dateStr > today
  const day      = parseInt(dateStr.split('-')[2], 10)
  const health   = getDayHealth(snapshot, dateStr)

  return (
    <button
      onClick={isFuture || !isCurrentMonth ? undefined : onClick}
      disabled={isFuture || !isCurrentMonth}
      className={`
        relative flex flex-col items-center justify-start
        p-1.5 pt-1 rounded-xl aspect-square
        transition-all duration-100
        ${isCurrentMonth
          ? isFuture
            ? 'cursor-default opacity-30'
            : 'cursor-pointer hover:bg-gray-800/70 active:scale-95'
          : 'cursor-default opacity-20'
        }
        ${isToday
          ? 'bg-brand-500/10 ring-1 ring-brand-500/40'
          : ''}
      `}
    >
      {/* Day number */}
      <span className={`
        text-sm font-medium leading-none
        ${isToday
          ? 'text-brand-400 font-bold'
          : isCurrentMonth
            ? isFuture ? 'text-gray-700' : 'text-gray-300'
            : 'text-gray-700'
        }
      `}>
        {day}
      </span>

      {/* Health dot */}
      <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${HEALTH_DOT[health]}`} />
    </button>
  )
}

// ─── MonthView ────────────────────────────────────────────────────────────────

interface MonthViewProps {
  anchorDate: string
  onGoToDay:  (date: string) => void
}

export default function MonthView({ anchorDate, onGoToDay }: MonthViewProps) {
  const { currentUser } = useAuth()
  const uid             = currentUser?.uid ?? ''

  const gridDates = getMonthGrid(anchorDate)

  const { snapshots, loading } = useWeekSnapshots(uid, gridDates)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const selectedSnapshot = selectedDate ? (snapshots[selectedDate] ?? null) : null

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-600 text-sm animate-pulse">
          Carregando mês…
        </div>
      )}

      {!loading && (
        <>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEK_HEADERS.map((h) => (
              <div key={h} className="text-center text-xs font-semibold uppercase tracking-wider text-gray-600 py-1">
                {h}
              </div>
            ))}
          </div>

          {/* Calendar grid — 6 rows × 7 cols */}
          <div className="grid grid-cols-7 gap-1">
            {gridDates.map((dateStr) => (
              <CalendarCell
                key={dateStr}
                dateStr={dateStr}
                snapshot={snapshots[dateStr] ?? null}
                isCurrentMonth={isSameMonth(dateStr, anchorDate)}
                onClick={() => setSelectedDate(dateStr)}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> &gt;70% hábitos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 30–70%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-700 inline-block" /> Sem dados / &lt;30%
            </span>
          </div>
        </>
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
