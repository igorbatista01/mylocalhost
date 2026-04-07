// ─── ProtectedWidget ─────────────────────────────────────────────────────────
// Widget bloqueado por PIN (4–6 dígitos, hash SHA-256).
// Abas internas: Senhas e Empréstimos.
// Auto-lock após 5 minutos de inatividade + botão de trancar manualmente.
//
// Firestore paths:
//   /users/{uid}/config/protected   → { pinHash: string }
//   /users/{uid}/protected/passwords → { entries: PasswordEntry[] }
//   /users/{uid}/protected/loans     → { entries: LoanEntry[] }

import { useState, useEffect, useRef, useCallback } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import toast from 'react-hot-toast'
import { db }       from '../lib/firebase'
import { useAuth }  from '../context/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PasswordEntry {
  id:       string
  service:  string
  username: string
  password: string
}

interface LoanEntry {
  id:          string
  description: string
  total:       number
  paid:        number
  date:        string   // YYYY-MM-DD
  status:      'pending' | 'paid'
}

type Phase = 'loading' | 'setup' | 'locked' | 'unlocked'
type ActiveTab = 'passwords' | 'loans'

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_LOCK_MS = 5 * 60 * 1000   // 5 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const data   = new TextEncoder().encode(text)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Firestore refs ───────────────────────────────────────────────────────────

const pinConfigRef    = (uid: string) => doc(db, 'users', uid, 'config',    'protected')
const passwordsDocRef = (uid: string) => doc(db, 'users', uid, 'protected', 'passwords')
const loansDocRef     = (uid: string) => doc(db, 'users', uid, 'protected', 'loans')

// ─── useProtectedStore (internal hook) ───────────────────────────────────────

function useProtectedStore(uid: string) {
  const [phase,      setPhase]      = useState<Phase>('loading')
  const [storedHash, setStoredHash] = useState<string | null>(null)
  const [passwords,  setPasswords]  = useState<PasswordEntry[]>([])
  const [loans,      setLoans]      = useState<LoanEntry[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  // Load PIN hash on mount
  useEffect(() => {
    if (!uid) return
    getDoc(pinConfigRef(uid))
      .then((snap) => {
        if (snap.exists()) {
          const { pinHash } = snap.data() as { pinHash: string }
          setStoredHash(pinHash)
          setPhase('locked')
        } else {
          setPhase('setup')
        }
      })
      .catch(() => setPhase('locked'))
  }, [uid])

  // Load passwords + loans once unlocked
  useEffect(() => {
    if (phase !== 'unlocked' || dataLoaded || !uid) return

    Promise.all([
      getDoc(passwordsDocRef(uid)),
      getDoc(loansDocRef(uid)),
    ]).then(([pwSnap, loanSnap]) => {
      if (pwSnap.exists()) {
        setPasswords((pwSnap.data() as { entries: PasswordEntry[] }).entries ?? [])
      }
      if (loanSnap.exists()) {
        setLoans((loanSnap.data() as { entries: LoanEntry[] }).entries ?? [])
      }
      setDataLoaded(true)
    }).catch((err) => console.error('[ProtectedWidget] load error', err))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, uid])

  const setupPin = useCallback(async (pin: string) => {
    const hash = await sha256(pin)
    await setDoc(pinConfigRef(uid), { pinHash: hash })
    setStoredHash(hash)
    setDataLoaded(false)
    setPhase('unlocked')
    toast.success('PIN configurado! 🔒')
  }, [uid])

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    const hash = await sha256(pin)
    if (hash !== storedHash) return false
    setDataLoaded(false)
    setPhase('unlocked')
    return true
  }, [storedHash])

  const lock = useCallback(() => setPhase('locked'), [])

  const savePasswords = useCallback(async (entries: PasswordEntry[]) => {
    setPasswords(entries)
    if (uid) await setDoc(passwordsDocRef(uid), { entries })
  }, [uid])

  const saveLoans = useCallback(async (entries: LoanEntry[]) => {
    setLoans(entries)
    if (uid) await setDoc(loansDocRef(uid), { entries })
  }, [uid])

  return { phase, passwords, loans, dataLoaded, setupPin, unlock, lock, savePasswords, saveLoans }
}

// ─── PinScreen ────────────────────────────────────────────────────────────────

interface PinScreenProps {
  mode:     'setup' | 'locked'
  onSetup:  (pin: string) => Promise<void>
  onUnlock: (pin: string) => Promise<boolean>
}

function PinScreen({ mode, onSetup, onUnlock }: PinScreenProps) {
  const [pin,     setPin]     = useState('')
  const [confirm, setConfirm] = useState('')
  const [error,   setError]   = useState('')
  const [busy,    setBusy]    = useState(false)

  function normalise(raw: string) {
    return raw.replace(/\D/g, '').slice(0, 6)
  }

  async function handleSubmit() {
    setError('')
    if (pin.length < 4) { setError('PIN deve ter entre 4 e 6 dígitos'); return }

    if (mode === 'setup') {
      if (pin !== confirm) { setError('PINs não coincidem'); return }
      setBusy(true)
      await onSetup(pin)
      setBusy(false)
    } else {
      setBusy(true)
      const ok = await onUnlock(pin)
      setBusy(false)
      if (!ok) { setError('PIN incorreto'); setPin('') }
    }
  }

  const inputClass = `
    w-full bg-gray-800/80 border border-gray-700 rounded-xl
    px-4 py-2.5 text-center text-2xl tracking-[0.45em] font-bold
    text-white placeholder-gray-700
    focus:outline-none focus:border-amber-500/60
    transition
  `

  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 px-4 py-8 min-h-[220px]">
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-4xl select-none">🔒</span>
        <h3 className="text-base font-semibold text-gray-200">
          {mode === 'setup' ? 'Configurar PIN' : 'Área Protegida'}
        </h3>
        <p className="text-xs text-gray-500 text-center max-w-[200px] leading-snug">
          {mode === 'setup'
            ? 'Defina um PIN de 4–6 dígitos para proteger esta área'
            : 'Digite o PIN para acessar'}
        </p>
      </div>

      <div className="flex flex-col items-center gap-2.5 w-full max-w-[200px]">
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="• • • •"
          autoFocus
          value={pin}
          onChange={(e) => setPin(normalise(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          className={inputClass}
        />

        {mode === 'setup' && (
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Confirmar PIN"
            value={confirm}
            onChange={(e) => setConfirm(normalise(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            className={inputClass}
          />
        )}

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={busy || pin.length < 4}
          className="
            w-full bg-amber-600 hover:bg-amber-500
            disabled:opacity-40 disabled:cursor-not-allowed
            text-white text-sm font-semibold py-2.5 rounded-xl
            transition
          "
        >
          {busy ? 'Verificando…' : mode === 'setup' ? 'Criar PIN' : 'Desbloquear'}
        </button>
      </div>
    </div>
  )
}

// ─── Shared input style ───────────────────────────────────────────────────────

const inputSm = `
  bg-gray-900/60 border border-gray-700 rounded-lg
  px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600
  focus:outline-none focus:border-amber-500/40 transition w-full
`

// ─── PasswordsTab ─────────────────────────────────────────────────────────────

function PasswordsTab({ passwords, onSave }: { passwords: PasswordEntry[]; onSave: (e: PasswordEntry[]) => void }) {
  const [search,    setSearch]    = useState('')
  const [visible,   setVisible]   = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd,   setShowAdd]   = useState(false)

  // Add form
  const [nService,  setNService]  = useState('')
  const [nUsername, setNUsername] = useState('')
  const [nPassword, setNPassword] = useState('')

  // Edit form
  const [eService,  setEService]  = useState('')
  const [eUsername, setEUsername] = useState('')
  const [ePassword, setEPassword] = useState('')

  function toggleVisible(id: string) {
    setVisible((prev) => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
    })
  }

  function startEdit(p: PasswordEntry) {
    setEditingId(p.id); setEService(p.service); setEUsername(p.username); setEPassword(p.password); setShowAdd(false)
  }

  function commitEdit() {
    if (!editingId) return
    onSave(passwords.map((p) => p.id === editingId ? { ...p, service: eService.trim(), username: eUsername.trim(), password: ePassword } : p))
    setEditingId(null)
  }

  function deleteEntry(id: string) {
    if (!confirm('Excluir esta entrada?')) return
    onSave(passwords.filter((p) => p.id !== id))
  }

  function addEntry() {
    if (!nService.trim() || !nPassword) return
    onSave([...passwords, { id: genId(), service: nService.trim(), username: nUsername.trim(), password: nPassword }])
    setNService(''); setNUsername(''); setNPassword(''); setShowAdd(false)
  }

  const filtered = passwords.filter((p) => p.service.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col gap-2.5">
      {/* Toolbar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Buscar serviço…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputSm} pl-7`}
          />
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null) }}
          className="text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/30 px-3 py-1.5 rounded-xl transition whitespace-nowrap"
        >
          + Senha
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nova entrada</p>
          <input type="text"     placeholder="Serviço"          value={nService}  onChange={(e) => setNService(e.target.value)}  className={inputSm} autoFocus />
          <input type="text"     placeholder="Usuário / e-mail" value={nUsername} onChange={(e) => setNUsername(e.target.value)} className={inputSm} />
          <input type="password" placeholder="Senha"            value={nPassword} onChange={(e) => setNPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addEntry() }} className={inputSm} />
          <div className="flex gap-2 mt-1">
            <button onClick={addEntry} disabled={!nService.trim() || !nPassword} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-semibold py-1.5 rounded-lg transition">Salvar</button>
            <button onClick={() => setShowAdd(false)} className="px-3 text-xs text-gray-500 hover:text-white transition">Cancelar</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: '240px' }}>
        {filtered.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-6">
            {search ? 'Nenhum resultado.' : 'Nenhuma senha salva ainda.'}
          </p>
        )}
        {filtered.map((entry) => (
          <div key={entry.id} className="bg-gray-800/40 border border-gray-700/40 rounded-xl px-3 py-2.5">
            {editingId === entry.id ? (
              <div className="flex flex-col gap-2">
                <input type="text" value={eService}  onChange={(e) => setEService(e.target.value)}  className={inputSm} placeholder="Serviço" />
                <input type="text" value={eUsername} onChange={(e) => setEUsername(e.target.value)} className={inputSm} placeholder="Usuário" />
                <input type="text" value={ePassword} onChange={(e) => setEPassword(e.target.value)} className={`${inputSm} font-mono`} placeholder="Senha" />
                <div className="flex gap-2">
                  <button onClick={commitEdit} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-1 rounded-lg transition">Salvar</button>
                  <button onClick={() => setEditingId(null)} className="px-3 text-xs text-gray-500 hover:text-white transition">×</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{entry.service}</p>
                  {entry.username && <p className="text-xs text-gray-500 truncate">{entry.username}</p>}
                  <p className="text-xs font-mono text-gray-400 mt-0.5 truncate">
                    {visible.has(entry.id) ? entry.password : '●'.repeat(Math.min(entry.password.length, 10))}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => toggleVisible(entry.id)} className="text-gray-600 hover:text-gray-300 transition p-1 text-sm" title={visible.has(entry.id) ? 'Ocultar' : 'Mostrar'}>{visible.has(entry.id) ? '🙈' : '👁'}</button>
                  <button onClick={() => startEdit(entry)} className="text-gray-600 hover:text-gray-300 transition p-1 text-sm" title="Editar">✏</button>
                  <button onClick={() => deleteEntry(entry.id)} className="text-gray-600 hover:text-red-400 transition p-1 text-sm" title="Excluir">🗑</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── LoansTab ─────────────────────────────────────────────────────────────────

function LoansTab({ loans, onSave }: { loans: LoanEntry[]; onSave: (e: LoanEntry[]) => void }) {
  const [showAdd,   setShowAdd]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Add form
  const [nDesc,  setNDesc]  = useState('')
  const [nTotal, setNTotal] = useState('')
  const [nPaid,  setNPaid]  = useState('')
  const [nDate,  setNDate]  = useState(todayIso())

  // Edit form
  const [eDesc,  setEDesc]  = useState('')
  const [eTotal, setETotal] = useState('')
  const [ePaid,  setEPaid]  = useState('')
  const [eDate,  setEDate]  = useState('')

  const totalPending = loans
    .filter((l) => l.status === 'pending')
    .reduce((sum, l) => sum + Math.max(0, l.total - l.paid), 0)

  function addLoan() {
    const total = parseFloat(nTotal) || 0
    const paid  = parseFloat(nPaid)  || 0
    if (!nDesc.trim() || total <= 0) return
    onSave([...loans, { id: genId(), description: nDesc.trim(), total, paid, date: nDate || todayIso(), status: paid >= total ? 'paid' : 'pending' }])
    setNDesc(''); setNTotal(''); setNPaid(''); setNDate(todayIso()); setShowAdd(false)
  }

  function startEdit(l: LoanEntry) {
    setEditingId(l.id); setEDesc(l.description); setETotal(String(l.total)); setEPaid(String(l.paid)); setEDate(l.date); setShowAdd(false)
  }

  function commitEdit() {
    if (!editingId) return
    const total = parseFloat(eTotal) || 0
    const paid  = parseFloat(ePaid)  || 0
    onSave(loans.map((l) => l.id === editingId ? { ...l, description: eDesc.trim(), total, paid, date: eDate, status: paid >= total ? 'paid' : 'pending' } : l))
    setEditingId(null)
  }

  function markPaid(id: string) {
    onSave(loans.map((l) => l.id === id ? { ...l, paid: l.total, status: 'paid' } : l))
  }

  function deleteLoan(id: string) {
    if (!confirm('Excluir este empréstimo?')) return
    onSave(loans.filter((l) => l.id !== id))
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Total pendente */}
      {loans.some((l) => l.status === 'pending') && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-amber-400/80 font-medium">Total pendente</span>
          <span className="text-base font-bold text-amber-300">{formatBRL(totalPending)}</span>
        </div>
      )}

      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowAdd(true); setEditingId(null) }}
          className="text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/30 px-3 py-1.5 rounded-xl transition"
        >
          + Empréstimo
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Novo empréstimo</p>
          <input type="text"   placeholder="Descrição"    value={nDesc}  onChange={(e) => setNDesc(e.target.value)}  className={inputSm} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Valor total" value={nTotal} onChange={(e) => setNTotal(e.target.value)} className={inputSm} step="0.01" min="0" />
            <input type="number" placeholder="Já pago"     value={nPaid}  onChange={(e) => setNPaid(e.target.value)}  className={inputSm} step="0.01" min="0" />
          </div>
          <input type="date" value={nDate} onChange={(e) => setNDate(e.target.value)} className={`${inputSm} text-gray-400`} />
          <div className="flex gap-2 mt-1">
            <button onClick={addLoan} disabled={!nDesc.trim() || !nTotal} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-semibold py-1.5 rounded-lg transition">Salvar</button>
            <button onClick={() => setShowAdd(false)} className="px-3 text-xs text-gray-500 hover:text-white transition">Cancelar</button>
          </div>
        </div>
      )}

      {/* Loans list */}
      <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: '260px' }}>
        {loans.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-6">Nenhum empréstimo registrado.</p>
        )}
        {loans.map((loan) => {
          const remaining = Math.max(0, loan.total - loan.paid)
          return (
            <div
              key={loan.id}
              className={`bg-gray-800/40 border rounded-xl px-3 py-2.5 ${
                loan.status === 'paid' ? 'border-green-700/30' : 'border-gray-700/40'
              }`}
            >
              {editingId === loan.id ? (
                <div className="flex flex-col gap-2">
                  <input type="text" value={eDesc}  onChange={(e) => setEDesc(e.target.value)}  className={inputSm} placeholder="Descrição" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={eTotal} onChange={(e) => setETotal(e.target.value)} className={inputSm} placeholder="Total"  step="0.01" min="0" />
                    <input type="number" value={ePaid}  onChange={(e) => setEPaid(e.target.value)}  className={inputSm} placeholder="Pago"   step="0.01" min="0" />
                  </div>
                  <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} className={`${inputSm} text-gray-400`} />
                  <div className="flex gap-2">
                    <button onClick={commitEdit} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-1 rounded-lg transition">Salvar</button>
                    <button onClick={() => setEditingId(null)} className="px-3 text-xs text-gray-500 hover:text-white transition">×</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium truncate ${loan.status === 'paid' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                        {loan.description}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        loan.status === 'paid'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {loan.status === 'paid' ? 'Quitado' : 'Pendente'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 mt-0.5">
                      <span className="text-xs text-gray-500">Total: {formatBRL(loan.total)}</span>
                      <span className="text-xs text-gray-500">Pago: {formatBRL(loan.paid)}</span>
                      {remaining > 0 && (
                        <span className="text-xs text-amber-400/80 font-medium">Resta: {formatBRL(remaining)}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 mt-0.5">{loan.date}</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                    {loan.status === 'pending' && (
                      <button
                        onClick={() => markPaid(loan.id)}
                        className="text-xs text-green-400 hover:text-green-300 border border-green-500/30 hover:border-green-500/60 px-2 py-0.5 rounded-lg transition"
                        title="Marcar como quitado"
                      >
                        ✓ Quitado
                      </button>
                    )}
                    <button onClick={() => startEdit(loan)}   className="text-gray-600 hover:text-gray-300 transition p-1 text-sm" title="Editar">✏</button>
                    <button onClick={() => deleteLoan(loan.id)} className="text-gray-600 hover:text-red-400 transition p-1 text-sm" title="Excluir">🗑</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ProtectedWidget (main export) ───────────────────────────────────────────

export default function ProtectedWidget() {
  const { currentUser } = useAuth()
  const uid = currentUser?.uid ?? ''

  const {
    phase, passwords, loans, dataLoaded,
    setupPin, unlock, lock,
    savePasswords, saveLoans,
  } = useProtectedStore(uid)

  const [activeTab, setActiveTab] = useState<ActiveTab>('passwords')

  // ── Auto-lock timer ────────────────────────────────────────────────────────

  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doLock = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    lockTimerRef.current = null
    lock()
  }, [lock])

  const resetTimer = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    lockTimerRef.current = setTimeout(doLock, AUTO_LOCK_MS)
  }, [doLock])

  // Start timer when phase becomes 'unlocked'; clear on cleanup
  useEffect(() => {
    if (phase === 'unlocked') {
      resetTimer()
    } else {
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current)
        lockTimerRef.current = null
      }
    }
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── Render: loading ────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center text-gray-600 text-sm animate-pulse">
        Carregando…
      </div>
    )
  }

  // ── Render: setup / locked ────────────────────────────────────────────────

  if (phase === 'setup' || phase === 'locked') {
    return (
      <div className="relative h-full min-h-[220px] rounded-xl overflow-hidden bg-gradient-to-b from-amber-950/15 to-transparent">
        <PinScreen mode={phase} onSetup={setupPin} onUnlock={unlock} />
      </div>
    )
  }

  // ── Render: unlocked ──────────────────────────────────────────────────────

  return (
    <div
      className="relative h-full flex flex-col gap-3 rounded-xl bg-gradient-to-b from-amber-950/10 to-transparent"
      onPointerMove={resetTimer}
      onPointerDown={resetTimer}
      onKeyDown={resetTimer}
    >
      {/* Tab bar + lock button */}
      <div className="flex items-center justify-between">
        <div className="flex border border-gray-800 rounded-lg overflow-hidden">
          {(['passwords', 'loans'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                text-xs px-3 py-1.5 transition
                ${activeTab === tab
                  ? 'bg-gray-800 text-white font-medium'
                  : 'text-gray-500 hover:text-gray-300'}
              `}
            >
              {tab === 'passwords' ? '🔑 Senhas' : '💰 Empréstimos'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-amber-600/50 font-medium select-none" title="Área protegida desbloqueada">🔓</span>
          <button
            onClick={doLock}
            className="
              text-xs text-gray-600 hover:text-amber-400
              border border-gray-800 hover:border-amber-600/30
              px-2 py-1 rounded-lg transition
            "
            title="Trancar agora"
          >
            🔒
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {!dataLoaded ? (
          <div className="flex items-center justify-center py-10 text-gray-600 text-sm animate-pulse">
            Carregando dados…
          </div>
        ) : activeTab === 'passwords' ? (
          <PasswordsTab passwords={passwords} onSave={savePasswords} />
        ) : (
          <LoansTab loans={loans} onSave={saveLoans} />
        )}
      </div>
    </div>
  )
}
