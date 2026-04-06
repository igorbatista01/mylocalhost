import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useDaySnapshot } from '../hooks/useDaySnapshot'
import { formatDate } from '../lib/dateUtils'
import type { DaySnapshot, KanbanData, FocusData } from '../types'

// ─── Context shape ────────────────────────────────────────────────────────────

interface DayContextType {
  /** The loaded snapshot (null while loading) */
  snapshot: DaySnapshot | null
  loading:  boolean
  error:    string | null
  /** Whether the currently viewed day is today (editable) */
  isToday:  boolean
  /** YYYY-MM-DD of the currently viewed day */
  viewDate: string
  /** Navigate to a different day */
  setViewDate: (date: string) => void
  /** Section updaters — no-ops when viewing a past day */
  updateKanban:  (data: KanbanData) => void
  updateHabit:   (habitId: string, checked: boolean) => void
  updateHabits:  (habits: Record<string, boolean>) => void
  updateNotes:   (notes: string[]) => void
  updateQuote:   (quote: string) => void
  updateCounter: (counterId: string, value: number) => void
  updateFocus:   (focus: FocusData) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const DayContext = createContext<DayContextType | null>(null)

export function useDayContext() {
  const ctx = useContext(DayContext)
  if (!ctx) throw new Error('useDayContext must be used within DayProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DayProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth()
  const uid = currentUser?.uid ?? ''

  const [viewDate, setViewDateState] = useState<string>(formatDate())

  const setViewDate = useCallback((date: string) => {
    setViewDateState(date)
  }, [])

  const {
    snapshot,
    loading,
    error,
    isToday,
    updateKanban,
    updateHabit,
    updateHabits,
    updateNotes,
    updateQuote,
    updateCounter,
    updateFocus,
  } = useDaySnapshot({ uid, date: viewDate })

  return (
    <DayContext.Provider
      value={{
        snapshot,
        loading,
        error,
        isToday,
        viewDate,
        setViewDate,
        updateKanban,
        updateHabit,
        updateHabits,
        updateNotes,
        updateQuote,
        updateCounter,
        updateFocus,
      }}
    >
      {children}
    </DayContext.Provider>
  )
}
