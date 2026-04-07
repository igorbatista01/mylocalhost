// ─── TimeNav ─────────────────────────────────────────────────────────────────
// Top navigation bar for temporal navigation (Day / Week / Month views).

export type ViewMode = 'day' | 'week' | 'month'

interface TimeNavProps {
  viewMode:   ViewMode
  /** Human-readable label for the current period (e.g. "Abril 2025") */
  label:      string
  /** True when the current period contains today → hides the "Hoje" button */
  isAtToday:  boolean
  onPrev:     () => void
  onNext:     () => void
  onToday:    () => void
  onSetMode:  (mode: ViewMode) => void
}

const MODE_LABELS: Record<ViewMode, string> = {
  day:   'Dia',
  week:  'Semana',
  month: 'Mês',
}

const PREV_LABELS: Record<ViewMode, string> = {
  day:   'Dia anterior',
  week:  'Semana anterior',
  month: 'Mês anterior',
}

const NEXT_LABELS: Record<ViewMode, string> = {
  day:   'Próximo dia',
  week:  'Semana seguinte',
  month: 'Próximo mês',
}

export default function TimeNav({
  viewMode,
  label,
  isAtToday,
  onPrev,
  onNext,
  onToday,
  onSetMode,
}: TimeNavProps) {
  return (
    <div className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center justify-between gap-3 px-6 py-2.5">

        {/* ← Prev */}
        <button
          onClick={onPrev}
          className="
            flex items-center gap-1.5 text-sm text-gray-500
            hover:text-white transition
            px-3 py-1.5 rounded-lg hover:bg-gray-800/60
            whitespace-nowrap
          "
        >
          ← {PREV_LABELS[viewMode]}
        </button>

        {/* Center: label + mode switcher */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Period label */}
          <span className="text-sm font-medium text-gray-200 truncate max-w-[220px] text-center">
            {label}
          </span>

          {/* Hoje button */}
          {!isAtToday && (
            <button
              onClick={onToday}
              className="
                text-xs text-brand-400 hover:text-brand-300
                border border-brand-500/30 hover:border-brand-500/60
                px-2.5 py-1 rounded-lg transition whitespace-nowrap
              "
            >
              Hoje
            </button>
          )}

          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-800 overflow-hidden">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onSetMode(mode)}
                className={`
                  text-xs px-3 py-1.5 transition
                  ${viewMode === mode
                    ? 'bg-gray-800 text-white font-medium'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40'}
                `}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        {/* Next → */}
        <button
          onClick={onNext}
          className="
            flex items-center gap-1.5 text-sm text-gray-500
            hover:text-white transition
            px-3 py-1.5 rounded-lg hover:bg-gray-800/60
            whitespace-nowrap
          "
        >
          {NEXT_LABELS[viewMode]} →
        </button>

      </div>
    </div>
  )
}
