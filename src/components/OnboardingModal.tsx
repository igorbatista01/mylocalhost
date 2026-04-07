import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import type { WidgetType } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuggestedWidget {
  type: WidgetType
  title: string
  emoji: string
  description: string
}

interface Props {
  onComplete: (selected: Array<{ type: WidgetType; title: string }>) => void
  onSkip: () => void
}

// ─── Suggested widgets ────────────────────────────────────────────────────────

const SUGGESTED: SuggestedWidget[] = [
  {
    type: 'kanban',
    title: 'Minhas Tarefas',
    emoji: '📋',
    description: 'Organize tarefas em colunas — A Fazer, Fazendo, Feito.',
  },
  {
    type: 'habits',
    title: 'Hábitos',
    emoji: '✅',
    description: 'Acompanhe seus hábitos diários e mantenha sequências.',
  },
  {
    type: 'quote',
    title: 'Frase do Dia',
    emoji: '💬',
    description: 'Registre uma frase ou pensamento que inspire o seu dia.',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingModal({ onComplete, onSkip }: Props) {
  const { currentUser } = useAuth()
  const [selected, setSelected] = useState<Set<number>>(new Set([0, 1, 2]))

  const firstName =
    currentUser?.displayName?.split(' ')[0] ?? 'por aqui'

  function toggleWidget(index: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function handleMount() {
    const toAdd = Array.from(selected).sort().map((i) => ({
      type: SUGGESTED[i].type,
      title: SUGGESTED[i].title,
    }))
    onComplete(toAdd)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-800 animate-scale-in">

        {/* Welcome header */}
        <div className="text-center mb-7">
          <div className="text-5xl mb-3 select-none">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Bem-vindo, {firstName}!
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
            Seu dashboard está pronto. Escolha quais widgets quer adicionar agora
            — você pode mudar isso a qualquer momento.
          </p>
        </div>

        {/* Widget selector */}
        <div className="flex flex-col gap-3 mb-7">
          {SUGGESTED.map((w, i) => {
            const isSelected = selected.has(i)
            return (
              <button
                key={w.type}
                onClick={() => toggleWidget(i)}
                className={`
                  flex items-center gap-4 p-4 rounded-xl border transition text-left w-full
                  ${isSelected
                    ? 'border-brand-500/60 bg-brand-500/10'
                    : 'border-gray-700/50 bg-gray-800/40 hover:border-gray-600'}
                `}
              >
                <span className="text-2xl select-none flex-shrink-0">{w.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isSelected ? 'text-brand-300' : 'text-gray-200'}`}>
                    {w.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{w.description}</p>
                </div>
                {/* Checkbox */}
                <div
                  className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    transition-all duration-150
                    ${isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-600'}
                  `}
                >
                  {isSelected && (
                    <span className="text-white text-[10px] font-bold leading-none">✓</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleMount}
            disabled={selected.size === 0}
            className="
              w-full bg-brand-500 hover:bg-brand-600
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white font-semibold py-3 rounded-xl transition text-sm
            "
          >
            Montar meu dashboard →
          </button>
          <button
            onClick={onSkip}
            className="w-full text-sm text-gray-500 hover:text-gray-300 py-2 transition"
          >
            Pular por agora
          </button>
        </div>
      </div>
    </div>
  )
}
