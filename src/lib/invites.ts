import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { InviteCode } from '../types'

// ─── Code generation ──────────────────────────────────────────────────────────
// Avoids visually ambiguous characters (0, O, I, 1, l)
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  const seg = () =>
    Array.from({ length: 4 }, () =>
      CHARSET[Math.floor(Math.random() * CHARSET.length)],
    ).join('')
  return `${seg()}-${seg()}-${seg()}`
}

// ─── Admin: create invite ─────────────────────────────────────────────────────
export async function createInvite(
  adminUid: string,
  adminName: string,
  role: 'user' | 'premium',
): Promise<string> {
  const code = generateCode()
  await setDoc(doc(db, 'invites', code), {
    code,
    role,
    createdBy:     adminUid,
    createdByName: adminName,
    createdAt:     serverTimestamp(),
    used:          false,
  })
  return code
}

// ─── Pre-auth: validate invite (readable without being logged in) ─────────────
export async function validateInvite(code: string): Promise<InviteCode | null> {
  const snap = await getDoc(doc(db, 'invites', code.toUpperCase()))
  if (!snap.exists()) return null
  const data = snap.data()
  if (data.used) return null
  return {
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
  } as InviteCode
}

// ─── Mark invite as used (called right after account creation) ────────────────
export async function useInvite(
  code: string,
  uid: string,
  displayName: string,
): Promise<void> {
  await updateDoc(doc(db, 'invites', code.toUpperCase()), {
    used:        true,
    usedBy:      uid,
    usedByName:  displayName,
    usedAt:      serverTimestamp(),
  })
}

// ─── Admin: revoke unused invite ──────────────────────────────────────────────
export async function deleteInvite(code: string): Promise<void> {
  await deleteDoc(doc(db, 'invites', code.toUpperCase()))
}

// ─── Admin: list all invites ──────────────────────────────────────────────────
export async function getAllInvites(): Promise<InviteCode[]> {
  const q    = query(collection(db, 'invites'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      usedAt:    data.usedAt?.toDate?.()    ?? undefined,
    } as InviteCode
  })
}
