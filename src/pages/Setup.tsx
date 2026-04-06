/**
 * ONE-TIME SETUP PAGE — /setup
 *
 * Creates the first admin document in Firestore.
 * Only works when:
 *   1. You are already logged in to Firebase Auth
 *   2. The document users/{uid} does NOT exist yet
 *
 * Delete this file after the first admin is created.
 */
import { useState } from 'react'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Setup() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error' | 'exists'>('idle')
  const [msg, setMsg] = useState('')

  async function createAdmin() {
    if (!currentUser) {
      setStatus('error')
      setMsg('Você precisa estar logado.')
      return
    }

    setStatus('loading')

    try {
      const ref = doc(db, 'users', currentUser.uid)
      const snap = await getDoc(ref)

      if (snap.exists()) {
        setStatus('exists')
        setMsg(`Documento já existe com role: ${snap.data().role}`)
        return
      }

      await setDoc(ref, {
        uid:         currentUser.uid,
        email:       currentUser.email,
        displayName: currentUser.displayName ?? 'Igor Pereira',
        role:        'admin',
        createdAt:   serverTimestamp(),
      })

      setStatus('done')
      setMsg(`Admin criado! UID: ${currentUser.uid}`)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err: unknown) {
      setStatus('error')
      setMsg(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h1 className="text-xl font-bold mb-1 text-purple-400">Setup Admin</h1>
        <p className="text-gray-400 text-sm mb-6">
          Cria o documento admin no Firestore para o usuário atualmente logado.
        </p>

        {currentUser ? (
          <div className="mb-6 text-sm text-gray-400 bg-gray-800 rounded-lg px-4 py-3">
            <p>Logado como: <span className="text-white">{currentUser.email}</span></p>
            <p>UID: <code className="text-brand-400 text-xs">{currentUser.uid}</code></p>
          </div>
        ) : (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
            Nenhum usuário logado. Faça login primeiro em{' '}
            <a href="/login" className="underline">
              /login
            </a>
            .
          </div>
        )}

        {status === 'done' && (
          <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3">
            ✓ {msg} — redirecionando...
          </div>
        )}
        {status === 'exists' && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-lg px-4 py-3">
            ⚠ {msg}
          </div>
        )}
        {status === 'error' && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
            ✕ {msg}
          </div>
        )}

        <button
          onClick={createAdmin}
          disabled={!currentUser || status === 'loading' || status === 'done'}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-medium rounded-lg py-2.5 transition"
        >
          {status === 'loading' ? 'Criando...' : 'Criar documento admin'}
        </button>

        <p className="text-gray-600 text-xs text-center mt-4">
          Apague <code>src/pages/Setup.tsx</code> e a rota <code>/setup</code> depois de usar.
        </p>
      </div>
    </div>
  )
}
