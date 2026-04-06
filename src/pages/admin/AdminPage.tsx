import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAllUsers, updateUserRole } from '../../lib/users'
import { getAllInvites, createInvite, deleteInvite } from '../../lib/invites'
import type { UserProfile, InviteCode, UserRole } from '../../types'

type Tab = 'users' | 'invites'

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: UserRole | 'user' | 'premium' }) {
  const styles: Record<string, string> = {
    admin:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
    premium: 'bg-amber-500/20  text-amber-300  border-amber-500/30',
    user:    'bg-gray-500/20   text-gray-400   border-gray-600/30',
  }
  const labels: Record<string, string> = {
    admin: 'Admin', premium: 'Premium', user: 'Usuário',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles[role]}`}>
      {labels[role]}
    </span>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-500 text-xs mb-2">{label}</p>
      <p className={`text-3xl font-bold ${accent ?? 'text-white'}`}>{value}</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { currentUser, userProfile } = useAuth()

  const [tab,              setTab]              = useState<Tab>('users')
  const [users,            setUsers]            = useState<UserProfile[]>([])
  const [invites,          setInvites]          = useState<InviteCode[]>([])
  const [loadingData,      setLoadingData]      = useState(true)
  const [inviteRole,       setInviteRole]       = useState<'user' | 'premium'>('user')
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [copiedCode,       setCopiedCode]       = useState<string | null>(null)
  const [error,            setError]            = useState('')
  const [successMsg,       setSuccessMsg]       = useState('')

  const loadData = useCallback(async () => {
    setLoadingData(true)
    setError('')
    try {
      const [usersData, invitesData] = await Promise.all([
        getAllUsers(),
        getAllInvites(),
      ])
      setUsers(usersData)
      setInvites(invitesData)
    } catch {
      setError('Erro ao carregar dados. Verifique sua conexão.')
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Generate invite ────────────────────────────────────────────────────────
  async function handleGenerateInvite() {
    if (!currentUser || !userProfile) return
    setGeneratingInvite(true)
    setError('')
    try {
      const code = await createInvite(
        currentUser.uid,
        userProfile.displayName ?? 'Admin',
        inviteRole,
      )
      const newInvite: InviteCode = {
        code,
        role:          inviteRole,
        createdBy:     currentUser.uid,
        createdByName: userProfile.displayName ?? 'Admin',
        createdAt:     new Date(),
        used:          false,
      }
      setInvites(prev => [newInvite, ...prev])
      copyToClipboard(code, true)
      showSuccess('Convite gerado e copiado!')
    } catch {
      setError('Erro ao gerar convite.')
    } finally {
      setGeneratingInvite(false)
    }
  }

  // ── Change user role ───────────────────────────────────────────────────────
  async function handleRoleChange(uid: string, newRole: UserRole) {
    try {
      await updateUserRole(uid, newRole)
      setUsers(prev =>
        prev.map(u => u.uid === uid ? { ...u, role: newRole } : u),
      )
      showSuccess('Função atualizada.')
    } catch {
      setError('Erro ao atualizar função. Verifique suas permissões.')
    }
  }

  // ── Revoke invite ──────────────────────────────────────────────────────────
  async function handleRevokeInvite(code: string) {
    if (!confirm(`Revogar o convite ${code}?`)) return
    try {
      await deleteInvite(code)
      setInvites(prev => prev.filter(i => i.code !== code))
      showSuccess('Convite revogado.')
    } catch {
      setError('Erro ao revogar convite.')
    }
  }

  // ── Clipboard ──────────────────────────────────────────────────────────────
  function copyToClipboard(code: string, silent = false) {
    const url = `${window.location.origin}/register?invite=${code}`
    navigator.clipboard.writeText(url)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
    if (!silent) showSuccess('Link copiado!')
  }

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalUsers    = users.length
  const premiumUsers  = users.filter(u => u.role === 'premium').length
  const availInvites  = invites.filter(i => !i.used).length

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Header ── */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-gray-500 hover:text-white transition text-sm"
          >
            ← Dashboard
          </Link>
          <span className="text-gray-800">|</span>
          <h1 className="text-base font-semibold tracking-tight">
            My<span className="text-brand-500">LocalHost</span>
            <span className="ml-2 text-xs font-normal text-purple-400 border border-purple-500/30 rounded-full px-2 py-0.5">
              Admin
            </span>
          </h1>
        </div>
        <span className="text-xs text-gray-600">{currentUser?.email}</span>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">

        {/* ── Alerts ── */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-4 opacity-60 hover:opacity-100">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3">
            ✓ {successMsg}
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total de usuários"  value={totalUsers}   />
          <StatCard label="Usuários premium"   value={premiumUsers} accent="text-amber-400" />
          <StatCard label="Convites ativos"    value={availInvites} accent="text-green-400" />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
          {(['users', 'invites'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm rounded-lg transition font-medium ${
                tab === t
                  ? 'bg-gray-800 text-white shadow-sm'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {t === 'users' ? 'Usuários' : 'Convites'}
            </button>
          ))}
        </div>

        {loadingData ? (
          <div className="text-gray-600 text-sm py-12 text-center">Carregando...</div>
        ) : tab === 'users' ? (

          /* ══════════════ USERS TAB ══════════════ */
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-300">
                {totalUsers} {totalUsers === 1 ? 'usuário' : 'usuários'}
              </h2>
              <button
                onClick={loadData}
                className="text-xs text-gray-500 hover:text-white transition"
              >
                ↺ Recarregar
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-4 py-3 text-gray-500 font-medium">Nome</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">E-mail</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Função</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Criado em</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Alterar função</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr
                      key={user.uid}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition"
                    >
                      <td className="px-4 py-3 text-white">
                        {user.displayName || '—'}
                        {user.uid === currentUser?.uid && (
                          <span className="ml-2 text-xs text-gray-600">(você)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{user.email}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {user.createdAt instanceof Date
                          ? user.createdAt.toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {user.uid !== currentUser?.uid ? (
                          <select
                            value={user.role}
                            onChange={e =>
                              handleRoleChange(user.uid, e.target.value as UserRole)
                            }
                            className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 transition"
                          >
                            <option value="user">Usuário</option>
                            <option value="premium">Premium</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className="text-xs text-gray-700">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-600">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        ) : (

          /* ══════════════ INVITES TAB ══════════════ */
          <div className="space-y-4">

            {/* Generate invite card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-300 font-medium">
                Gerar convite para:
              </span>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'user' | 'premium')}
                className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500 transition"
              >
                <option value="user">Usuário</option>
                <option value="premium">Premium</option>
              </select>
              <button
                onClick={handleGenerateInvite}
                disabled={generatingInvite}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                {generatingInvite ? 'Gerando...' : '+ Gerar código'}
              </button>
              <p className="text-xs text-gray-600 ml-auto">
                O link de cadastro é copiado automaticamente.
              </p>
            </div>

            {/* Invites table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <h2 className="text-sm font-medium text-gray-300">
                  {invites.length} {invites.length === 1 ? 'convite' : 'convites'} gerados
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-4 py-3 text-gray-500 font-medium">Código</th>
                      <th className="px-4 py-3 text-gray-500 font-medium">Função</th>
                      <th className="px-4 py-3 text-gray-500 font-medium">Criado em</th>
                      <th className="px-4 py-3 text-gray-500 font-medium">Status</th>
                      <th className="px-4 py-3 text-gray-500 font-medium">Usado por</th>
                      <th className="px-4 py-3 text-gray-500 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map(invite => (
                      <tr
                        key={invite.code}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className={`font-mono text-xs tracking-wider ${invite.used ? 'text-gray-600' : 'text-brand-400'}`}>
                              {invite.code}
                            </code>
                            {!invite.used && (
                              <button
                                onClick={() => copyToClipboard(invite.code)}
                                title="Copiar link de cadastro"
                                className="text-gray-600 hover:text-gray-300 transition text-base leading-none"
                              >
                                {copiedCode === invite.code ? '✓' : '⎘'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={invite.role} />
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {invite.createdAt instanceof Date
                            ? invite.createdAt.toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            invite.used
                              ? 'bg-gray-800 text-gray-600 border-gray-700'
                              : 'bg-green-500/10 text-green-400 border-green-500/30'
                          }`}>
                            {invite.used ? 'Usado' : 'Disponível'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {invite.usedByName ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          {!invite.used && (
                            <button
                              onClick={() => handleRevokeInvite(invite.code)}
                              className="text-red-500 hover:text-red-400 text-xs transition"
                            >
                              Revogar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {invites.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-600">
                          Nenhum convite gerado ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
