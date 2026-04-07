import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import type { Widget, WidgetType } from '../types'

// Firestore path: /users/{uid}/config/dashboard
// Structure: { widgets: [{ id, type, position, title, config }] }

export function useDashboardConfig() {
  const { currentUser } = useAuth()
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [loading, setLoading] = useState(true)

  // Keep a stable ref to the Firestore doc reference
  const docRef = currentUser
    ? doc(db, 'users', currentUser.uid, 'config', 'dashboard')
    : null

  // Save to Firestore (use ref to avoid stale closure in callbacks)
  const docRefRef = useRef(docRef)
  docRefRef.current = docRef

  const save = useCallback(async (newWidgets: Widget[]) => {
    if (!docRefRef.current) return
    await setDoc(docRefRef.current, { widgets: newWidgets }, { merge: true })
  }, [])

  // Load on mount / uid change
  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }

    setLoading(true)
    const ref = doc(db, 'users', currentUser.uid, 'config', 'dashboard')

    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        const data = snap.data()
        // Sort by position to restore saved order
        const loaded: Widget[] = (data.widgets ?? []).sort(
          (a: Widget, b: Widget) => a.position - b.position,
        )
        setWidgets(loaded)
      }
      setLoading(false)
    })
  }, [currentUser?.uid]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ──────────────────────────────────────────────────────────────

  const addWidget = useCallback(
    async (type: WidgetType, title: string, config: Record<string, unknown> = {}) => {
      setWidgets((prev) => {
        const newWidget: Widget = {
          id: crypto.randomUUID(),
          type,
          title,
          position: prev.length,
          config,
        }
        const updated = [...prev, newWidget]
        save(updated)
        return updated
      })
    },
    [save],
  )

  const removeWidget = useCallback(
    async (id: string) => {
      setWidgets((prev) => {
        const updated = prev
          .filter((w) => w.id !== id)
          .map((w, i) => ({ ...w, position: i }))
        save(updated)
        return updated
      })
    },
    [save],
  )

  const updateWidget = useCallback(
    async (id: string, changes: Partial<Omit<Widget, 'id'>>) => {
      setWidgets((prev) => {
        const updated = prev.map((w) => (w.id === id ? { ...w, ...changes } : w))
        save(updated)
        return updated
      })
    },
    [save],
  )

  const reorderWidgets = useCallback(
    async (newOrder: Widget[]) => {
      const updated = newOrder.map((w, i) => ({ ...w, position: i }))
      setWidgets(updated)
      await save(updated)
    },
    [save],
  )

  /** Add multiple widgets at once (used by onboarding). */
  const addWidgetBatch = useCallback(
    async (items: Array<{ type: WidgetType; title: string; config?: Record<string, unknown> }>) => {
      setWidgets((prev) => {
        const newWidgets: Widget[] = items.map((item, i) => ({
          id: crypto.randomUUID(),
          type: item.type,
          title: item.title,
          position: prev.length + i,
          config: item.config ?? {},
        }))
        const updated = [...prev, ...newWidgets]
        save(updated)
        return updated
      })
    },
    [save],
  )

  return { widgets, loading, addWidget, addWidgetBatch, removeWidget, updateWidget, reorderWidgets }
}
