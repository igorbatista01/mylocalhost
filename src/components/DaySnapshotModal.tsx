// ─── DaySnapshotModal ────────────────────────────────────────────────────────
// Read-only overlay that shows a full snapshot of a past (or current) day.

import { useEffect } from 'react'
import type { DaySnapshot } from '../types'
import { formatDayLabel, isToday, todayString } from '../lib/dateUtils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function habitSummary(habits: Record<string, boolean>): { done: number; total: number } {
  const values = Object.values(habits)
  return { done: values.filter(Boolean).length, total: values.length }
}

function taskSummary(snapshot: DaySnapshot): { done: number; total: number } {
  const { columns, tasks } = snapshot.kanban
  const doneIds = new Set(
    columns
      .filter((c) => /feito|conclui|done|finaliz/i.test(c.title))
      .map((c) => c.id)
  )
  const total = tasks.length
  const done  = doneIds.size > 0 ? tasks.filter((t) => doneIds.has(t.columnId)).length : 0
  return { done, total }
}

function habitColor(done: number, total: number): string {
  if (total === 0) return 'text-gray-500'
  const ratio = done / total
  if (ratio >= 0.7) return 'text-green-400'
  if (ratio >= 0.3) return 'text-amber-400'
  return 'text-red-400'
}

// ─── EmptySection ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-800/60 pt-3 mt-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">{title}</p>
      {children}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  dateStr:  string
  snapshot: DaySnapshot | null
  onClose:  () => void
  /** If true, clicking the header link navigates to day view */
  onGoToDay?: () => void
}

export default function DaySnapshotModal({ dateStr, snapshot, onClose, onGoToDay }: Props) {
  const isCurrentDay = isToday(dateStr)
  const isPast       = dateStr < todayString()

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const habits = habitSummary(snapshot?.habits ?? {})
  const tasks  = taskSummary(snapshot ?? { kanban: { columns: [], tasks: [] }, habits: {}, notes: [], quote: '', counters: {}, focus: { title: '', description: '' }, date: dateStr, createdAt: new Date(), frozenAt: null })

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="
          relative bg-gray-900 border border-gray-800 rounded-2xl
          w-full max-w-sm mx-4 p-5 shadow-2xl
          max-h-[85vh] overflow-y-auto
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-white transition text-xl leading-none"
          aria-label="Fechar"
        >
          ×
        </button>

        {/* Header */}
        <div className="pr-6">
          <div className="flex items-center gap-2 flex-wrap">
            {isPast && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Histórico
              </span>
            )}
            {isCurrentDay && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                Hoje
              </span>
            )}
          </div>
          <h2 className="text-base font-semibold text-white mt-1 leading-snug capitalize">
            {formatDayLabel(dateStr)}
          </h2>
          {isCurrentDay && onGoToDay && (
            <button
              onClick={() => { onGoToDay(); onClose() }}
              className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2 transition mt-0.5"
            >
              Abrir modo edição →
            </button>
          )}
        </div>

        {/* No data state */}
        {!snapshot && (
          <div className="mt-6 text-center py-8">
            <span className="text-4xl block mb-2 select-none">📭</span>
            <p className="text-gray-500 text-sm">Sem dados registrados para este dia.</p>
          </div>
        )}

        {/* Snapshot data */}
        {snapshot && (
          <>
            {/* Habits */}
            <Section title="Hábitos">
              {habits.total === 0 ? (
                <p className="text-gray-600 text-sm">Nenhum hábito registrado.</p>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${habitColor(habits.done, habits.total)}`}>
                    {habits.done}/{habits.total}
                  </span>
                  <span className="text-gray-500 text-sm">
                    hábito{habits.done !== 1 ? 's' : ''} concluído{habits.done !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Individual habits */}
              {Object.entries(snapshot.habits).length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {Object.entries(snapshot.habits).map(([id, done]) => (
                    <div key={id} className="flex items-center gap-2 text-sm">
                      <span className={done ? 'text-green-400' : 'text-gray-600'}>
                        {done ? '✓' : '✗'}
                      </span>
                      <span className={done ? 'text-gray-300' : 'text-gray-600'}>
                        {id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Tasks */}
            {snapshot.kanban.tasks.length > 0 && (
              <Section title="Tarefas">
                <div className="flex items-center gap-2">
                  {tasks.done > 0 ? (
                    <span className="text-2xl font-bold text-green-400">
                      {tasks.done}/{tasks.total}
                    </span>
                  ) : (
                    <span className="text-2xl font-bold text-gray-400">{tasks.total}</span>
                  )}
                  <span className="text-gray-500 text-sm">
                    {tasks.done > 0 ? 'tarefas concluídas' : `tarefa${tasks.total !== 1 ? 's' : ''} no kanban`}
                  </span>
                </div>

                {/* Task list (max 5) */}
                <div className="mt-2 flex flex-col gap-1">
                  {snapshot.kanban.tasks.slice(0, 5).map((task) => {
                    const col = snapshot.kanban.columns.find((c) => c.id === task.columnId)
                    const done = col ? /feito|conclui|done|finaliz/i.test(col.title) : false
                    return (
                      <div key={task.id} className="flex items-center gap-2 text-sm">
                        <span className={done ? 'text-green-400' : 'text-gray-600'}>
                          {done ? '✓' : '·'}
                        </span>
                        <span className={done ? 'text-gray-400 line-through' : 'text-gray-300'}>
                          {task.title}
                        </span>
                      </div>
                    )
                  })}
                  {snapshot.kanban.tasks.length > 5 && (
                    <p className="text-xs text-gray-600 mt-1">
                      + {snapshot.kanban.tasks.length - 5} mais…
                    </p>
                  )}
                </div>
              </Section>
            )}

            {/* Quote */}
            {snapshot.quote && (
              <Section title="Frase do Dia">
                <p className="text-sm text-gray-300 italic leading-relaxed">
                  "{snapshot.quote}"
                </p>
              </Section>
            )}

            {/* Notes */}
            {snapshot.notes.length > 0 && (
              <Section title="Notas">
                <div className="flex flex-col gap-1">
                  {snapshot.notes.slice(0, 4).map((note, i) => (
                    <p key={i} className="text-sm text-gray-400 truncate">
                      · {note}
                    </p>
                  ))}
                  {snapshot.notes.length > 4 && (
                    <p className="text-xs text-gray-600">+ {snapshot.notes.length - 4} mais…</p>
                  )}
                </div>
              </Section>
            )}

            {/* Focus */}
            {(snapshot.focus?.title || snapshot.focus?.description) && (
              <Section title="Foco">
                {snapshot.focus.title && (
                  <p className="text-sm font-medium text-gray-200">{snapshot.focus.title}</p>
                )}
                {snapshot.focus.description && (
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {snapshot.focus.description.slice(0, 120)}
                    {snapshot.focus.description.length > 120 ? '…' : ''}
                  </p>
                )}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
