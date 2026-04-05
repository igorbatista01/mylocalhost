import {
  createContext,
  useContext,
  useEffect,
  useState,
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
import { auth } from '../lib/firebase'

interface AuthContextType {
  currentUser: FirebaseUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<UserCredential>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password)

  const register = async (name: string, email: string, password: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(user, { displayName: name.trim() })
    // Refresh currentUser so displayName is available immediately
    setCurrentUser({ ...user, displayName: name.trim() } as FirebaseUser)
  }

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
