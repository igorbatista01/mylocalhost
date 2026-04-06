import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { UserProfile, UserRole } from '../types'

// ─── Admin: list all users ────────────────────────────────────────────────────
export async function getAllUsers(): Promise<UserProfile[]> {
  const q    = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    } as UserProfile
  })
}

// ─── Admin: change user role ──────────────────────────────────────────────────
// Security note: Firestore rules enforce that only admins can change the `role`
// field of any user document. Client-side check here is UX-only.
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role })
}
