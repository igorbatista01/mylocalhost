import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { DaySnapshot } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    createdAt: data.createdAt?.toDate?.()  ?? new Date(),
    frozenAt:  data.frozenAt?.toDate?.()  ?? null,
  }
}

// ─── Return type ──────────────────────────────────────────────────────────────

export interface WeekSnapshotsResult {
  /** Map of YYYY-MM-DD → DaySnapshot (null if no data exists for that day) */
  snapshots: Record<string, DaySnapshot | null>
  loading:   boolean
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Loads DaySnapshots from Firestore for each date in `dates`.
 * Re-fetches whenever `uid` or the list of dates changes.
 */
export function useWeekSnapshots(uid: string, dates: string[]): WeekSnapshotsResult {
  const [snapshots, setSnapshots] = useState<Record<string, DaySnapshot | null>>({})
  const [loading,   setLoading]   = useState(true)

  // Stable key to detect when dates actually change
  const datesKey = dates.join(',')

  useEffect(() => {
    if (!uid || dates.length === 0) {
      setLoading(false)
      return
    }

    setLoading(true)

    Promise.all(
      dates.map(async (dateStr) => {
        const ref  = doc(db, 'users', uid, 'days', dateStr)
        const snap = await getDoc(ref)
        return {
          dateStr,
          snapshot: snap.exists()
            ? fromFirestore(snap.data() as Record<string, unknown>, dateStr)
            : null,
        }
      })
    ).then((results) => {
      const map: Record<string, DaySnapshot | null> = {}
      for (const { dateStr, snapshot } of results) {
        map[dateStr] = snapshot
      }
      setSnapshots(map)
    }).catch((err) => {
      console.error('[useWeekSnapshots] load error', err)
    }).finally(() => {
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, datesKey])

  return { snapshots, loading }
}
