import { useEffect, useRef, useState, useCallback } from 'react'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { formatDate, isToday as isTodayFn } from '../lib/dateUtils'
import type { DaySnapshot, KanbanData, FocusData } from '../types'

// ─── Default empty snapshot ───────────────────────────────────────────────────

function emptySnapshot(dateStr: string): DaySnapshot {
  return {
    date:      dateStr,
    kanban:    { columns: [], tasks: [] },
    habits:    {},
    notes:     [],
    quote:     '',
    counters:  {},
    focus:     { title: '', description: '' },
    createdAt: new Date(),
    frozenAt:  null,
  }
}

// ─── Firestore path helper ────────────────────────────────────────────────────

function dayDocRef(uid: string, dateStr: string) {
  return doc(db, 'users', uid, 'days', dateStr)
}

// ─── Firestore → DaySnapshot converter ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromFirestore(data: Record<string, any>, dateStr: string): DaySnapshot {
  return {
    date:      data.date      ?? dateStr,
    kanban:    data.kanban    ?? { columns: [], tasks: [] },
    habits:    data.habits    ?? {},
    notes:     data.notes     ?? [],
    quote:     data.quote     ?? '',
    counters:  data.counters  ?? {},
    focus:     data.focus     ?? { title: '', description: '' },
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
    frozenAt:  (data.frozenAt  as Timestamp)?.toDate?.() ?? null,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseDaySnapshotOptions {
  /** UID of the authenticated user */
  uid: string
  /** YYYY-MM-DD — defaults to today */
  date?: string
}

interface UseDaySnapshotReturn {
  snapshot:    DaySnapshot | null
  loading:     boolean
  error:       string | null
  isToday:     boolean
  /** Replace the entire kanban section (today only) */
  updateKanban:   (data: KanbanData) => void
  /** Toggle a single habit (today only) */
  updateHabit:    (habitId: string, checked: boolean) => void
  /** Replace the whole habits map (today only) */
  updateHabits:   (habits: Record<string, boolean>) => void
  /** Replace the notes array (today only) */
  updateNotes:    (notes: string[]) => void
  /** Set the daily quote (today only) */
  updateQuote:    (quote: string) => void
  /** Set a single counter value (today only) */
  updateCounter:  (counterId: string, value: number) => void
  /** Replace the focus block (today only) */
  updateFocus:    (focus: FocusData) => void
}

const DEBOUNCE_MS = 1500

export function useDaySnapshot({ uid, date }: UseDaySnapshotOptions): UseDaySnapshotReturn {
  const dateStr  = date ?? formatDate()
  const editable = isTodayFn(dateStr)

  const [snapshot, setSnapshot] = useState<DaySnapshot | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  // Pending partial update accumulated between debounce ticks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingRef = useRef<Record<string, any>>({})
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load / create snapshot ──────────────────────────────────────────────

  useEffect(() => {
    if (!uid) return
    setLoading(true)
    setError(null)

    const ref = dayDocRef(uid, dateStr)

    const load = async () => {
      try {
        const snap = await getDoc(ref)

        if (snap.exists()) {
          setSnapshot(fromFirestore(snap.data() as Record<string, unknown>, dateStr))
        } else if (editable) {
          // First visit today — create an empty document
          const fresh = emptySnapshot(dateStr)
          await setDoc(ref, {
            ...fresh,
            createdAt: serverTimestamp(),
            frozenAt:  null,
          })
          setSnapshot(fresh)
        } else {
          // Past day with no data — show empty read-only
          setSnapshot(emptySnapshot(dateStr))
        }
      } catch (err) {
        console.error('[useDaySnapshot] load error', err)
        setError('Erro ao carregar o snapshot do dia.')
      } finally {
        setLoading(false)
      }
    }

    load()

    // Cleanup pending writes when switching dates
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      pendingRef.current = {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, dateStr])

  // ── Debounced Firestore write ───────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scheduleSave = useCallback((patch: Record<string, any>) => {
    if (!editable) return

    // Merge into pending
    pendingRef.current = { ...pendingRef.current, ...patch }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      const payload = pendingRef.current
      pendingRef.current = {}
      if (Object.keys(payload).length === 0) return

      try {
        await updateDoc(dayDocRef(uid, dateStr), payload)
      } catch (err) {
        console.error('[useDaySnapshot] save error', err)
        setError('Erro ao salvar. Tente novamente.')
      }
    }, DEBOUNCE_MS)
  }, [uid, dateStr, editable])

  // ── Optimistic local update + schedule save ─────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyUpdate = useCallback((partial: Partial<DaySnapshot>, firestorePatch: Record<string, any>) => {
    if (!editable) return
    setSnapshot(prev => prev ? { ...prev, ...partial } : prev)
    scheduleSave(firestorePatch)
  }, [editable, scheduleSave])

  // ── Section updaters ────────────────────────────────────────────────────

  const updateKanban = useCallback((data: KanbanData) => {
    applyUpdate({ kanban: data }, { kanban: data })
  }, [applyUpdate])

  const updateHabit = useCallback((habitId: string, checked: boolean) => {
    setSnapshot(prev => {
      if (!prev) return prev
      const updated = { ...prev.habits, [habitId]: checked }
      scheduleSave({ habits: updated })
      return { ...prev, habits: updated }
    })
  }, [scheduleSave])

  const updateHabits = useCallback((habits: Record<string, boolean>) => {
    applyUpdate({ habits }, { habits })
  }, [applyUpdate])

  const updateNotes = useCallback((notes: string[]) => {
    applyUpdate({ notes }, { notes })
  }, [applyUpdate])

  const updateQuote = useCallback((quote: string) => {
    applyUpdate({ quote }, { quote })
  }, [applyUpdate])

  const updateCounter = useCallback((counterId: string, value: number) => {
    setSnapshot(prev => {
      if (!prev) return prev
      const updated = { ...prev.counters, [counterId]: value }
      scheduleSave({ counters: updated })
      return { ...prev, counters: updated }
    })
  }, [scheduleSave])

  const updateFocus = useCallback((focus: FocusData) => {
    applyUpdate({ focus }, { focus })
  }, [applyUpdate])

  return {
    snapshot,
    loading,
    error,
    isToday: editable,
    updateKanban,
    updateHabit,
    updateHabits,
    updateNotes,
    updateQuote,
    updateCounter,
    updateFocus,
  }
}
