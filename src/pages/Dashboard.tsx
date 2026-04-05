import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { currentUser, logout } = useAuth()
  const navigate                = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Topbar */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">
          My<span className="text-brand-500">LocalHost</span>
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{currentUser?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">Seu Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">
            Arraste e solte os widgets para reorganizar.
          </p>
        </div>

        {/* Widget grid placeholder — será populado com dnd-kit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {['Relógio', 'Notas', 'Tarefas'].map((name) => (
            <div
              key={name}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 min-h-[160px] flex items-center justify-center"
            >
              <span className="text-gray-500 text-sm">Widget: {name}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
