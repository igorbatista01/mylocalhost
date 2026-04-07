import type { WidgetType } from '../types'

// ─── Widget catalogue ─────────────────────────────────────────────────────────

interface WidgetOption {
  type: WidgetType
  icon: string
  name: string
  description: string
  defaultTitle: string
}

const WIDGET_OPTIONS: WidgetOption[] = [
  {
    type:         'kanban',
    icon:         '📋',
    name:         'Kanban',
    description:  'Quadro de tarefas por colunas',
    defaultTitle: 'Meu Kanban',
  },
  {
    type:         'habits',
    icon:         '✅',
    name:         'Hábitos',
    description:  'Rastreamento de hábitos diários',
    defaultTitle: 'Meus Hábitos',
  },
  {
    type:         'notes',
    icon:         '📝',
    name:         'Notas',
    description:  'Bloco de notas rápidas',
    defaultTitle: 'Notas',
  },
  {
    type:         'counter',
    icon:         '🔢',
    name:         'Contador',
    description:  'Contador incremental simples',
    defaultTitle: 'Contador',
  },
  {
    type:         'quote',
    icon:         '💬',
    name:         'Citação',
    description:  'Citação inspiracional do dia',
    defaultTitle: 'Citação do Dia',
  },
  {
    type:         'focus',
    icon:         '⏱',
    name:         'Foco',
    description:  'Timer Pomodoro e sessões de foco',
    defaultTitle: 'Foco',
  },
  {
    type:         'protected',
    icon:         '🔒',
    name:         'Protegido',
    description:  'Senhas e empréstimos protegidos por PIN',
    defaultTitle: 'Privado',
  },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onAdd: (type: WidgetType, title: string) => void
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddWidgetModal({ onAdd, onClose }: Props) {
  function handleSelect(option: WidgetOption) {
    onAdd(option.type, option.defaultTitle)
    onClose()
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Adicionar Widget</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition text-2xl leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Widget grid */}
        <div className="grid grid-cols-2 gap-3">
          {WIDGET_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => handleSelect(option)}
              className="
                flex items-start gap-3 p-4
                bg-gray-800 hover:bg-gray-750 hover:border-gray-600
                border border-gray-700/50
                rounded-xl transition text-left
                group
              "
            >
              <span className="text-2xl flex-shrink-0 mt-0.5">{option.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white group-hover:text-brand-400 transition">
                  {option.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
