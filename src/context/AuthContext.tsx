import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import type { ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth'
import type { User as FirebaseUser, UserCredential } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { UserProfile, UserRole } from '../types'
import { validateInvite, useInvite } from '../lib/invites'

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextType {
  currentUser:  FirebaseUser  | null
  userProfile:  UserProfile   | null
  loading:      boolean
  isAdmin:      boolean
  isPremium:    boolean
  login:        (email: string, password: string) => Promise<UserCredential>
  register:     (name: string, email: string, password: string, inviteCode: string) => Promise<void>
  logout:       () => Promise<void>
  refreshProfile: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading]         = useState(true)

  // Fetch Firestore profile for a given Firebase user
  const fetchProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
    try {
      const snap = await getDoc(doc(db, 'users', uid))
      if (!snap.exists()) return null
      const data = snap.data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      } as UserProfile
    } catch {
      return null
    }
  }, [])

  // Re-fetch profile from Firestore (useful after role changes)
  const refreshProfile = useCallback(async () => {
    if (!currentUser) return
    const profile = await fetchProfile(currentUser.uid)
    setUserProfile(profile)
  }, [currentUser, fetchProfile])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser)
      if (firebaseUser) {
        const profile = await fetchProfile(firebaseUser.uid)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [fetchProfile])

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password)

  // ── Register (invite-only) ─────────────────────────────────────────────────
  const register = async (
    name: string,
    email: string,
    password: string,
    inviteCode: string,
  ) => {
    // 1. Validate invite BEFORE creating the account
    const invite = await validateInvite(inviteCode)
    if (!invite) {
      throw new Error('Código de convite inválido ou já utilizado.')
    }

    // 2. Create Firebase Auth account
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(user, { displayName: name.trim() })

    // 3. Determine role from invite
    const role: UserRole = invite.role

    // 4. Create Firestore user profile
    const profile: UserProfile = {
      uid:         user.uid,
      email:       user.email,
      displayName: name.trim(),
      role,
      createdAt:   new Date(),
      invitedBy:   invite.createdBy,
    }
    await setDoc(doc(db, 'users', user.uid), {
      ...profile,
      createdAt: serverTimestamp(), // server-side timestamp for consistency
    })

    // 5. Mark invite as used
    await useInvite(inviteCode.toUpperCase(), user.uid, name.trim())

    // 6. Update local state immediately (don't wait for onAuthStateChanged re-run)
    setCurrentUser({ ...user, displayName: name.trim() } as FirebaseUser)
    setUserProfile(profile)
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth)
    setCurrentUser(null)
    setUserProfile(null)
  }

  // ── Computed helpers ──────────────────────────────────────────────────────
  const isAdmin   = userProfile?.role === 'admin'
  const isPremium = userProfile?.role === 'premium' || userProfile?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        isPremium,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {loading ? (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            {/* Spinner */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-gray-800" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500 animate-spin" />
            </div>
            <p className="text-gray-600 text-sm animate-pulse">
              My<span className="text-brand-500">LocalHost</span>
            </p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}
