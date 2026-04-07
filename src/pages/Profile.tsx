import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  updateProfile,
  updateEmail,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, photoURL }: { name: string; photoURL?: string | null }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        className="w-20 h-20 rounded-full object-cover border-2 border-brand-500/40"
      />
    )
  }

  return (
    <div className="
      w-20 h-20 rounded-full bg-brand-500/20 border-2 border-brand-500/40
      flex items-center justify-center
      text-brand-400 text-2xl font-bold select-none
    ">
      {initials || '?'}
    </div>
  )
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Profile() {
  const { currentUser, refreshProfile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  // ── Display name ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '')
  const [photoURL, setPhotoURL]       = useState(currentUser?.photoURL ?? '')
  const [savingName, setSavingName]   = useState(false)

  async function handleSaveProfile() {
    if (!currentUser || !auth.currentUser) return
    setSavingName(true)
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim() || null,
        photoURL: photoURL.trim() || null,
      })
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: displayName.trim() || null,
      })
      await refreshProfile()
      toast.success('Perfil atualizado!')
    } catch {
      toast.error('Erro ao atualizar perfil.')
    } finally {
      setSavingName(false)
    }
  }

  // ── Email ─────────────────────────────────────────────────────────────────
  const [newEmail,      setNewEmail]      = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [savingEmail,   setSavingEmail]   = useState(false)

  async function handleSaveEmail() {
    if (!auth.currentUser || !newEmail.trim()) return
    setSavingEmail(true)
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email ?? '',
        emailPassword,
      )
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updateEmail(auth.currentUser, newEmail.trim())
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { email: newEmail.trim() })
      await refreshProfile()
      setNewEmail('')
      setEmailPassword('')
      toast.success('E-mail atualizado!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        toast.error('Senha incorreta. Tente novamente.')
      } else if (msg.includes('email-already-in-use')) {
        toast.error('Este e-mail já está em uso.')
      } else {
        toast.error('Erro ao atualizar e-mail.')
      }
    } finally {
      setSavingEmail(false)
    }
  }

  // ── Password ─────────────────────────────────────────────────────────────
  const [currentPw,   setCurrentPw]   = useState('')
  const [newPw,       setNewPw]       = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [savingPw,    setSavingPw]    = useState(false)

  async function handleSavePassword() {
    if (!auth.currentUser) return
    if (newPw.length < 6)  return toast.error('A nova senha deve ter mínimo 6 caracteres.')
    if (newPw !== confirmPw) return toast.error('As senhas não coincidem.')
    setSavingPw(true)
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email ?? '',
        currentPw,
      )
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, newPw)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      toast.success('Senha alterada com sucesso!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        toast.error('Senha atual incorreta.')
      } else {
        toast.error('Erro ao alterar senha.')
      }
    } finally {
      setSavingPw(false)
    }
  }

  // ── Delete account ────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePw,          setDeletePw]          = useState('')
  const [deleting,          setDeleting]          = useState(false)

  async function handleDeleteAccount() {
    if (!auth.currentUser) return
    setDeleting(true)
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email ?? '',
        deletePw,
      )
      await reauthenticateWithCredential(auth.currentUser, credential)
      // Delete Firestore user document
      await deleteDoc(doc(db, 'users', auth.currentUser.uid))
      // Delete Firebase Auth account
      await deleteUser(auth.currentUser)
      navigate('/login')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        toast.error('Senha incorreta.')
      } else {
        toast.error('Erro ao deletar conta.')
      }
    } finally {
      setDeleting(false)
    }
  }

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-gray-500 hover:text-white transition text-sm flex items-center gap-1.5"
          >
            ← Dashboard
          </Link>
          <span className="text-gray-700">|</span>
          <h1 className="text-sm font-semibold text-gray-200">Perfil</h1>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="
            text-gray-500 hover:text-white transition
            p-2 rounded-lg hover:bg-gray-800/60
          "
          title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">

        {/* ── Avatar section ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <Avatar
            name={currentUser.displayName ?? currentUser.email ?? '?'}
            photoURL={currentUser.photoURL}
          />
          <div>
            <p className="text-lg font-semibold text-white">
              {currentUser.displayName || 'Sem nome'}
            </p>
            <p className="text-sm text-gray-500">{currentUser.email}</p>
          </div>
        </div>

        {/* ── Profile info ───────────────────────────────────────────────── */}
        <Section title="Informações pessoais">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Nome de exibição</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
                className="
                  w-full bg-gray-800 border border-gray-700 rounded-xl
                  px-4 py-2.5 text-sm text-white placeholder-gray-600
                  focus:outline-none focus:border-brand-500 transition
                "
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                URL da foto de perfil
                <span className="ml-1 text-gray-600 font-normal">(opcional)</span>
              </label>
              <input
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://..."
                className="
                  w-full bg-gray-800 border border-gray-700 rounded-xl
                  px-4 py-2.5 text-sm text-white placeholder-gray-600
                  focus:outline-none focus:border-brand-500 transition
                "
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingName}
              className="
                self-start bg-brand-500 hover:bg-brand-600
                disabled:opacity-50 text-white text-sm font-medium
                px-5 py-2.5 rounded-xl transition
              "
            >
              {savingName ? 'Salvando…' : 'Salvar perfil'}
            </button>
          </div>
        </Section>

        {/* ── Email ──────────────────────────────────────────────────────── */}
        <Section title="Alterar e-mail">
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-500">
              E-mail atual: <span className="text-gray-300">{currentUser.email}</span>
            </p>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Novo e-mail</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="novo@email.com"
                className="
                  w-full bg-gray-800 border border-gray-700 rounded-xl
                  px-4 py-2.5 text-sm text-white placeholder-gray-600
                  focus:outline-none focus:border-brand-500 transition
                "
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Senha atual (para confirmar)</label>
              <input
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="••••••••"
                className="
                  w-full bg-gray-800 border border-gray-700 rounded-xl
                  px-4 py-2.5 text-sm text-white placeholder-gray-600
                  focus:outline-none focus:border-brand-500 transition
                "
              />
            </div>
            <button
              onClick={handleSaveEmail}
              disabled={savingEmail || !newEmail.trim() || !emailPassword}
              className="
                self-start bg-brand-500 hover:bg-brand-600
                disabled:opacity-40 text-white text-sm font-medium
                px-5 py-2.5 rounded-xl transition
              "
            >
              {savingEmail ? 'Atualizando…' : 'Atualizar e-mail'}
            </button>
          </div>
        </Section>

        {/* ── Password ───────────────────────────────────────────────────── */}
        <Section title="Alterar senha">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Senha atual</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                className="
                  w-full bg-gray-800 border border-gray-700 rounded-xl
                  px-4 py-2.5 text-sm text-white placeholder-gray-600
                  focus:outline-none focus:border-brand-500 transition
                "
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Nova senha</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Mín. 6 caracteres"
                className="
                  w-full bg-gray-800 border border-gray-700 rounded-xl
                  px-4 py-2.5 text-sm text-white placeholder-gray-600
                  focus:outline-none focus:border-brand-500 transition
                "
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="••••••••"
                className="
                  w-full bg-gray-800 border border-gray-700 rounded-xl
                  px-4 py-2.5 text-sm text-white placeholder-gray-600
                  focus:outline-none focus:border-brand-500 transition
                "
              />
            </div>
            <button
              onClick={handleSavePassword}
              disabled={savingPw || !currentPw || !newPw || !confirmPw}
              className="
                self-start bg-brand-500 hover:bg-brand-600
                disabled:opacity-40 text-white text-sm font-medium
                px-5 py-2.5 rounded-xl transition
              "
            >
              {savingPw ? 'Alterando…' : 'Alterar senha'}
            </button>
          </div>
        </Section>

        {/* ── Danger zone ────────────────────────────────────────────────── */}
        <Section title="Zona de perigo">
          {!showDeleteConfirm ? (
            <div>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Deletar sua conta remove permanentemente todos os seus dados, incluindo dashboard, widgets e histórico. Esta ação não pode ser desfeita.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="
                  text-sm text-red-400 hover:text-red-300
                  border border-red-500/30 hover:border-red-500/60
                  px-4 py-2 rounded-xl transition
                "
              >
                Deletar minha conta
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-400 font-medium">
                ⚠️ Tem certeza? Esta ação é permanente e irreversível.
              </p>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Digite sua senha para confirmar
                </label>
                <input
                  type="password"
                  value={deletePw}
                  onChange={(e) => setDeletePw(e.target.value)}
                  placeholder="••••••••"
                  className="
                    w-full bg-gray-800 border border-red-500/30 rounded-xl
                    px-4 py-2.5 text-sm text-white placeholder-gray-600
                    focus:outline-none focus:border-red-500 transition
                  "
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || !deletePw}
                  className="
                    bg-red-600 hover:bg-red-700
                    disabled:opacity-40 text-white text-sm font-medium
                    px-5 py-2.5 rounded-xl transition
                  "
                >
                  {deleting ? 'Deletando…' : 'Confirmar exclusão'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeletePw('') }}
                  className="text-sm text-gray-500 hover:text-white px-4 py-2.5 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </Section>

      </main>
    </div>
  )
}
