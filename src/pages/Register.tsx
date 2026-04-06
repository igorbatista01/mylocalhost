import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register }    = useAuth()
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()

  // Pre-fill invite code if passed in the URL: /register?invite=XXXX-XXXX-XXXX
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [inviteCode, setInviteCode] = useState(searchParams.get('invite') ?? '')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim())         return setError('Informe seu nome.')
    if (password !== confirm) return setError('As senhas não coincidem.')
    if (password.length < 6)  return setError('Senha deve ter no mínimo 6 caracteres.')
    if (!inviteCode.trim())   return setError('Informe o código de convite.')

    setLoading(true)
    try {
      await register(name, email, password, inviteCode.trim().toUpperCase())
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('convite')) {
        setError(msg)
      } else if (msg.includes('email-already-in-use')) {
        setError('Este e-mail já está em uso.')
      } else {
        setError('Não foi possível criar a conta. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-1">Criar conta</h1>
        <p className="text-gray-400 text-sm mb-6">
          Acesso exclusivo por convite.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invite code — first to signal intent */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Código de convite
            </label>
            <input
              type="text"
              required
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 transition font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans"
              placeholder="XXXX-XXXX-XXXX"
              maxLength={14}
              spellCheck={false}
            />
          </div>

          <div className="border-t border-gray-800 pt-4">
            <label className="block text-sm text-gray-300 mb-1">Nome</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 transition"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 transition"
              placeholder="voce@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 transition"
              placeholder="Mín. 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Confirmar senha
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 transition"
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-6">
          Já tem conta?{' '}
          <Link to="/login" className="text-brand-500 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
