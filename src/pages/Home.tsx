import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white px-4">
      <h1 className="text-5xl font-bold mb-3 tracking-tight">
        My<span className="text-brand-500">LocalHost</span>
      </h1>
      <p className="text-gray-400 text-lg mb-8 text-center max-w-md">
        Seu sistema operacional de vida pessoal. Widgets reorganizáveis, tudo em um painel.
      </p>
      <div className="flex gap-4">
        <Link
          to="/register"
          className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-6 py-3 rounded-xl transition"
        >
          Começar agora
        </Link>
        <Link
          to="/login"
          className="border border-gray-700 hover:border-gray-500 text-gray-300 px-6 py-3 rounded-xl transition"
        >
          Entrar
        </Link>
      </div>
    </div>
  )
}
