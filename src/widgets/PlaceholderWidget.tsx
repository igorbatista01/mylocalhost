import type { WidgetType } from '../types'

// ─── Metadata per widget type ─────────────────────────────────────────────────

const WIDGET_META: Record<WidgetType, { icon: string; label: string }> = {
  kanban:    { icon: '📋', label: 'Kanban' },
  habits:    { icon: '✅', label: 'Hábitos' },
  notes:     { icon: '📝', label: 'Notas' },
  counter:   { icon: '🔢', label: 'Contador' },
  quote:     { icon: '💬', label: 'Citação' },
  focus:     { icon: '⏱',  label: 'Foco' },
  protected: { icon: '🔒', label: 'Protegido' },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  type: WidgetType
}

export default function PlaceholderWidget({ type }: Props) {
  const meta = WIDGET_META[type] ?? { icon: '🧩', label: type }

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <span className="text-4xl select-none">{meta.icon}</span>
      <p className="text-sm text-gray-500">
        Widget <strong className="text-gray-400">{meta.label}</strong>
      </p>
      <p className="text-xs text-gray-700 mt-0.5">Em construção...</p>
    </div>
  )
}
