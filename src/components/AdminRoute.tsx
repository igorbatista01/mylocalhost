import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/**
 * Protects routes that require admin role.
 * - Not logged in  → /login
 * - Logged in but not admin → /dashboard (silent redirect, no info leak)
 * - Admin → render children
 *
 * Note: the Firestore security rules are the real enforcement layer.
 * This component is purely for UX routing.
 */
export default function AdminRoute({ children }: Props) {
  const { currentUser, userProfile, loading } = useAuth()

  if (loading) return null

  if (!currentUser)               return <Navigate to="/login"    replace />
  if (userProfile?.role !== 'admin') return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
