import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useDayContext } from '../context/DayContext'
import { formatDate } from '../lib/dateUtils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HabitDef {
  id: string
  name: string
  days: number[] // JS day indices: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  order: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

// ISO week order: Mon → Sun
const WEEK_DAY_INDICES = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABELS       = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const DEFAULT_HABITS: HabitDef[] = [
  { id: 'treino', name: 'Treino', days: [1, 2, 3, 4, 5], order: 0 },
  { id: 'ler',    name: 'Ler',    days: [1, 2, 3, 4, 5, 6, 0], order: 1 },
  { id: 'estudo', name: 'Estudo', days: [1, 2, 3, 4, 5], order: 2 },
  { id: 'doce',   name: 'Doce',   days: [1, 2, 3, 4, 5, 6, 0], order: 3 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** Returns the 7 date strings (YYYY-MM-DD) for the current Mon→Sun week */
function getCurrentWeekDates(): string[] {
  const today  = new Date()
  const dow    = today.getDay()               // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow    // distance back to Monday
  return WEEK_DAY_INDICES.map((_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + offset + i)
    return formatDate(d)
  })
}

/**
 * Calculate the current streak for a habit.
 * Streak = consecutive completed scheduled days going backwards from today.
 * If today is scheduled but not yet done, we start counting from yesterday.
 */
function calcStreak(
  habitId:       string,
  scheduledDays: number[],
  allData:       Record<string, Record<string, boolean>>,
): number {
  const today     = new Date()
  const todayStr  = formatDate(today)
  const todayDow  = today.getDay()

  // If today is a scheduled day and already completed, include today in streak.
  // Otherwise start looking from yesterday.
  const todayDone = scheduledDays.includes(todayDow) && !!(allData[todayStr]?.[habitId])
  const startOffset = (scheduledDays.includes(todayDow) && !todayDone) ? 1 : 0

  let streak = 0
  for (let i = startOffset; i < 60; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = formatDate(d)
    const dow     = d.getDay()

    if (scheduledDays.includes(dow)) {
      const done = !!(allData[dateStr]?.[habitId])
      if (done) {
        streak++
      } else {
        break // streak broken
      }
    }
    // Non-scheduled days are neutral — they don't break or count
  }
  return streak
}

// ─── useHabitDefs hook ────────────────────────────────────────────────────────

function habitDefsRef(uid: string) {
  return doc(db, 'users', uid, 'config', 'habits')
}

function useHabitDefs(uid: string) {
  const [habits,  setHabits]  = useState<HabitDef[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    getDoc(habitDefsRef(uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as { habits: HabitDef[] }
        setHabits(data.habits ?? DEFAULT_HABITS)
      } else {
        // First time — seed with defaults and save
        setHabits(DEFAULT_HABITS)
        setDoc(habitDefsRef(uid), { habits: DEFAULT_HABITS })
      }
    }).finally(() => setLoading(false))
  }, [uid])

  const saveHabits = useCallback(async (next: HabitDef[]) => {
    setHabits(next)
    await setDoc(habitDefsRef(uid), { habits: next })
  }, [uid])

  return { habits, loading, saveHabits }
}

// ─── useWeekHabits hook ───────────────────────────────────────────────────────
// Loads habits checks for every day of the current week AND the previous 3
// weeks so we can compute streaks accurately.

function useWeekHabits(uid: string, weekDates: string[]) {
  // weekData[dateStr] = { habitId: boolean }
  const [weekData, setWeekData]   = useState<Record<string, Record<string, boolean>>>({})
  const [histData, setHistData]   = useState<Record<string, Record<string, boolean>>>({})
  const [loadingWeek, setLoadingWeek] = useState(true)

  // Load this week's snapshots
  useEffect(() => {
    if (!uid || weekDates.length === 0) return
    setLoadingWeek(true)

    Promise.all(
      weekDates.map((dateStr) =>
        getDoc(doc(db, 'users', uid, 'days', dateStr))
          .then((snap) => ({ dateStr, habits: snap.exists() ? (snap.data()?.habits ?? {}) as Record<string, boolean> : {} }))
      )
    ).then((results) => {
      const map: Record<string, Record<string, boolean>> = {}
      for (const { dateStr, habits } of results) {
        map[dateStr] = habits
      }
      setWeekData(map)
    }).finally(() => setLoadingWeek(false))
  }, [uid, weekDates.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  // Load history (past 3 weeks, 21 days) for streak calculation — non-blocking
  useEffect(() => {
    if (!uid) return
    const today = new Date()
    const pastDates: string[] = []
    for (let i = 1; i <= 21; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      pastDates.push(formatDate(d))
    }

    Promise.all(
      pastDates.map((dateStr) =>
        getDoc(doc(db, 'users', uid, 'days', dateStr))
          .then((snap) => ({ dateStr, habits: snap.exists() ? (snap.data()?.habits ?? {}) as Record<string, boolean> : {} }))
      )
    ).then((results) => {
      const map: Record<string, Record<string, boolean>> = {}
      for (const { dateStr, habits } of results) {
        map[dateStr] = habits
      }
      setHistData(map)
    })
  }, [uid])

  const allData = { ...histData, ...weekData }

  return { weekData, allData, loadingWeek }
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────

const ALL_DAYS_OPTS = [
  { idx: 1, label: 'Seg' },
  { idx: 2, label: 'Ter' },
  { idx: 3, label: 'Qua' },
  { idx: 4, label: 'Qui' },
  { idx: 5, label: 'Sex' },
  { idx: 6, label: 'Sáb' },
  { idx: 0, label: 'Dom' },
]

interface SettingsPanelProps {
  habits:      HabitDef[]
  onSave:      (habits: HabitDef[]) => void
  onClose:     () => void
}

function SettingsPanel({ habits, onSave, onClose }: SettingsPanelProps) {
  const [local, setLocal] = useState<HabitDef[]>(() =>
    [...habits].sort((a, b) => a.order - b.order)
  )
  const [newName,    setNewName]    = useState('')
  const [newDays,    setNewDays]    = useState<number[]>([1, 2, 3, 4, 5])
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [editName,   setEditName]   = useState('')
  const [editDays,   setEditDays]   = useState<number[]>([])

  function toggleDay(set: number[], setFn: (d: number[]) => void, idx: number) {
    setFn(set.includes(idx) ? set.filter((d) => d !== idx) : [...set, idx])
  }

  function addHabit() {
    const name = newName.trim()
    if (!name || newDays.length === 0) return
    const habit: HabitDef = {
      id:    genId(),
      name,
      days:  newDays,
      order: local.length,
    }
    setLocal((prev) => [...prev, habit])
    setNewName('')
    setNewDays([1, 2, 3, 4, 5])
  }

  function startEdit(h: HabitDef) {
    setEditingId(h.id)
    setEditName(h.name)
    setEditDays([...h.days])
  }

  function commitEdit() {
    if (!editingId) return
    setLocal((prev) =>
      prev.map((h) =>
        h.id === editingId
          ? { ...h, name: editName.trim() || h.name, days: editDays }
          : h
      )
    )
    setEditingId(null)
  }

  function removeHabit(id: string) {
    setLocal((prev) => prev.filter((h) => h.id !== id).map((h, i) => ({ ...h, order: i })))
  }

  function handleSave() {
    onSave(local.map((h, i) => ({ ...h, order: i })))
    onClose()
  }

  return (
    <div className="absolute inset-0 z-20 bg-gray-900/97 backdrop-blur-sm rounded-2xl p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">⚙ Configurar Hábitos</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition text-xl leading-none">×</button>
      </div>

      {/* Habit list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-3">
        {local.map((h) => (
          <div key={h.id} className="bg-gray-800/60 rounded-xl px-3 py-2.5">
            {editingId === h.id ? (
              <div className="flex flex-col gap-2">
                <input
                  className="w-full bg-transparent text-sm text-white outline-none border-b border-brand-500 pb-0.5"
                  value={editName}
                  autoFocus
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null) }}
                />
                <div className="flex flex-wrap gap-1">
                  {ALL_DAYS_OPTS.map(({ idx, label }) => (
                    <button
                      key={idx}
                      onClick={() => toggleDay(editDays, setEditDays, idx)}
                      className={`
                        text-xs px-2 py-0.5 rounded-full border transition
                        ${editDays.includes(idx)
                          ? 'bg-brand-500/20 border-brand-500/60 text-brand-300'
                          : 'border-gray-700 text-gray-500 hover:border-gray-500'}
                      `}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={commitEdit} className="text-xs bg-brand-500 hover:bg-brand-600 text-white px-3 py-1 rounded-lg transition">Salvar</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-white px-2 py-1 transition">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-medium">{h.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ALL_DAYS_OPTS.filter((d) => h.days.includes(d.idx)).map((d) => d.label).join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => startEdit(h)}
                  className="text-gray-500 hover:text-gray-300 transition text-xs px-2 py-1 rounded-lg border border-gray-700/50 hover:border-gray-600 flex-shrink-0"
                >
                  Editar
                </button>
                <button
                  onClick={() => removeHabit(h.id)}
                  className="text-gray-600 hover:text-red-400 transition text-lg leading-none flex-shrink-0"
                  title="Remover"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new habit */}
      <div className="border-t border-gray-800/60 pt-3 flex flex-col gap-2">
        <p className="text-xs text-gray-500 font-medium">Novo hábito</p>
        <input
          className="
            w-full bg-gray-800 border border-gray-700 rounded-xl
            px-3 py-2 text-sm text-white placeholder-gray-600
            focus:outline-none focus:border-brand-500 transition
          "
          placeholder="Nome do hábito…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addHabit() }}
        />
        <div className="flex flex-wrap gap-1">
          {ALL_DAYS_OPTS.map(({ idx, label }) => (
            <button
              key={idx}
              onClick={() => toggleDay(newDays, setNewDays, idx)}
              className={`
                text-xs px-2 py-0.5 rounded-full border transition
                ${newDays.includes(idx)
                  ? 'bg-brand-500/20 border-brand-500/60 text-brand-300'
                  : 'border-gray-700 text-gray-500 hover:border-gray-500'}
              `}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={addHabit}
          disabled={!newName.trim() || newDays.length === 0}
          className="
            w-full text-sm text-brand-400 hover:text-brand-300
            border border-brand-500/30 hover:border-brand-500/60
            rounded-xl py-2 transition
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          + Adicionar hábito
        </button>
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleSave}
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2 rounded-xl transition"
        >
          Salvar
        </button>
        <button
          onClick={onClose}
          className="px-4 text-sm text-gray-500 hover:text-white transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── HabitCell ────────────────────────────────────────────────────────────────

interface CellProps {
  checked:    boolean
  scheduled:  boolean   // is this habit scheduled on this day?
  isToday:    boolean
  isFuture:   boolean
  onClick:    () => void
}

function HabitCell({ checked, scheduled, isToday, isFuture, onClick }: CellProps) {
  if (!scheduled) {
    // Habit not scheduled on this day — show a dim dash
    return (
      <div className="flex items-center justify-center w-8 h-8">
        <span className="text-gray-800 text-xs select-none">–</span>
      </div>
    )
  }

  const canClick = !isFuture

  return (
    <button
      onClick={canClick ? onClick : undefined}
      disabled={!canClick}
      className={`
        flex items-center justify-center w-8 h-8 rounded-lg
        transition-all duration-150
        ${isFuture
          ? 'opacity-25 cursor-not-allowed'
          : 'hover:scale-110 cursor-pointer active:scale-95'}
        ${checked
          ? 'bg-green-500/20 border border-green-500/50'
          : isToday
            ? 'border-2 border-gray-600 hover:border-brand-500/60 bg-transparent'
            : 'border border-gray-800 bg-transparent'}
      `}
      title={isFuture ? 'Dia futuro' : checked ? 'Marcar como não feito' : 'Marcar como feito'}
    >
      {checked && (
        <span
          className="text-green-400 text-sm font-bold leading-none"
          style={{ animation: 'habitCheck 0.2s ease-out' }}
        >
          ✓
        </span>
      )}
    </button>
  )
}

// ─── HabitsWidget ─────────────────────────────────────────────────────────────

export default function HabitsWidget() {
  const { currentUser } = useAuth()
  const uid = currentUser?.uid ?? ''

  const { snapshot, isToday, updateHabit } = useDayContext()

  const [showSettings, setShowSettings] = useState(false)
  const { habits, loading: loadingDefs, saveHabits } = useHabitDefs(uid)

  const weekDates = getCurrentWeekDates()
  const todayStr  = formatDate()

  const { weekData, allData, loadingWeek } = useWeekHabits(uid, weekDates)

  // Merge today's live snapshot into weekData so toggles reflect immediately
  const mergedWeekData: Record<string, Record<string, boolean>> = {
    ...weekData,
    ...(snapshot ? { [todayStr]: snapshot.habits } : {}),
  }
  const mergedAllData = { ...allData, ...mergedWeekData }

  // ── Toggle a habit cell ──────────────────────────────────────────────────

  function handleToggle(habitId: string, dateStr: string) {
    if (dateStr !== todayStr) return  // only today is editable
    const current = !!(snapshot?.habits?.[habitId])
    updateHabit(habitId, !current)
  }

  // ── Sorted habits ──────────────────────────────────────────────────────

  const sortedHabits = [...habits].sort((a, b) => a.order - b.order)

  // ── Loading ────────────────────────────────────────────────────────────

  if (loadingDefs) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-600 text-sm animate-pulse">
        Carregando…
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="relative h-full flex flex-col gap-3">
      {/* Animation keyframes */}
      <style>{`
        @keyframes habitCheck {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.2); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      {/* Settings overlay */}
      {showSettings && (
        <SettingsPanel
          habits={habits}
          onSave={saveHabits}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 min-h-[24px]">
        {!isToday ? (
          <span className="text-xs text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
            📅 Somente leitura
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={() => setShowSettings(true)}
          className="text-gray-600 hover:text-gray-300 transition text-sm leading-none"
          title="Configurar hábitos"
        >
          ⚙
        </button>
      </div>

      {/* Grid */}
      {sortedHabits.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-6">
          <span className="text-3xl select-none">✅</span>
          <p className="text-gray-500 text-sm">Nenhum hábito configurado.</p>
          <button
            onClick={() => setShowSettings(true)}
            className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2 transition"
          >
            Adicionar hábito
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[320px]">
            <thead>
              <tr>
                {/* Habit name column */}
                <th className="text-left pb-2 pr-2">
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">Hábito</span>
                </th>
                {/* Day columns */}
                {weekDates.map((dateStr, colIdx) => {
                  const isT    = dateStr === todayStr
                  const isFut  = dateStr > todayStr
                  return (
                    <th key={dateStr} className="pb-2 px-0.5">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${
                          isT   ? 'text-brand-400' :
                          isFut ? 'text-gray-700'  : 'text-gray-500'
                        }`}>
                          {DAY_LABELS[colIdx]}
                        </span>
                        {isT && (
                          <span className="w-1 h-1 rounded-full bg-brand-500 block" />
                        )}
                      </div>
                    </th>
                  )
                })}
                {/* Streak column */}
                <th className="pb-2 pl-2">
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">🔥</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedHabits.map((habit) => {
                const streak = calcStreak(habit.id, habit.days, mergedAllData)
                return (
                  <tr key={habit.id} className="group">
                    {/* Habit name */}
                    <td className="py-1 pr-3">
                      <span className="text-sm text-gray-300 whitespace-nowrap font-medium">
                        {habit.name}
                      </span>
                    </td>

                    {/* Day cells */}
                    {weekDates.map((dateStr, colIdx) => {
                      const dayIdx     = WEEK_DAY_INDICES[colIdx]
                      const scheduled  = habit.days.includes(dayIdx)
                      const isT        = dateStr === todayStr
                      const isFut      = dateStr > todayStr
                      const checked    = !!(mergedWeekData[dateStr]?.[habit.id])

                      return (
                        <td key={dateStr} className="py-1 px-0.5 text-center">
                          <div className="flex justify-center">
                            <HabitCell
                              checked={checked}
                              scheduled={scheduled}
                              isToday={isT}
                              isFuture={isFut}
                              onClick={() => handleToggle(habit.id, dateStr)}
                            />
                          </div>
                        </td>
                      )
                    })}

                    {/* Streak */}
                    <td className="py-1 pl-2 text-center">
                      {streak > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-400">
                          {streak}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-700">–</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Loading indicator for week data */}
          {loadingWeek && (
            <p className="text-xs text-gray-700 text-center mt-2 animate-pulse">
              Carregando semana…
            </p>
          )}
        </div>
      )}
    </div>
  )
}
