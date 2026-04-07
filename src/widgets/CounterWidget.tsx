import { useState } from 'react'
import { useDayContext } from '../context/DayContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CounterConfig {
  name:         string
  initialValue: number
  step:         number
}

interface Props {
  widgetId:        string
  config:          CounterConfig
  onConfigChange?: (config: CounterConfig) => void
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────

interface SettingsProps {
  config:  CounterConfig
  onSave:  (config: CounterConfig) => void
  onClose: () => void
}

function SettingsPanel({ config, onSave, onClose }: SettingsProps) {
  const [name,         setName]         = useState(config.name)
  const [initialValue, setInitialValue] = useState(String(config.initialValue))
  const [step,         setStep]         = useState(String(config.step))

  function handleSave() {
    const parsedInitial = parseFloat(initialValue)
    const parsedStep    = parseFloat(step)
    if (isNaN(parsedStep) || parsedStep === 0) return
    onSave({
      name:         name.trim() || 'Contador',
      initialValue: isNaN(parsedInitial) ? 0 : parsedInitial,
      step:         parsedStep,
    })
    onClose()
  }

  return (
    <div className="absolute inset-0 z-20 bg-gray-900/97 backdrop-blur-sm rounded-2xl p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">⚙ Configurar Contador</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-3 flex-1">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Nome</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            className="
              bg-gray-800 border border-gray-700 rounded-xl
              px-3 py-2 text-sm text-white placeholder-gray-600
              focus:outline-none focus:border-brand-500 transition
            "
            placeholder="Ex: Litros de água"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Valor inicial</span>
          <input
            type="number"
            value={initialValue}
            onChange={(e) => setInitialValue(e.target.value)}
            className="
              bg-gray-800 border border-gray-700 rounded-xl
              px-3 py-2 text-sm text-white placeholder-gray-600
              focus:outline-none focus:border-brand-500 transition
            "
            placeholder="0"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Passo (incremento)</span>
          <input
            type="number"
            value={step}
            step="0.1"
            onChange={(e) => setStep(e.target.value)}
            className="
              bg-gray-800 border border-gray-700 rounded-xl
              px-3 py-2 text-sm text-white placeholder-gray-600
              focus:outline-none focus:border-brand-500 transition
            "
            placeholder="1"
          />
          <span className="text-xs text-gray-600">Ex: 1 para inteiros, 0.5 para meios</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2 rounded-xl transition"
        >
          Salvar
        </button>
        <button
          onClick={onClose}
          className="px-4 text-sm text-gray-500 hover:text-white transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── CounterWidget ────────────────────────────────────────────────────────────

export default function CounterWidget({ widgetId, config, onConfigChange }: Props) {
  const { snapshot, isToday, updateCounter } = useDayContext()

  const [showSettings, setShowSettings] = useState(false)

  const counterId = widgetId
  const value     = snapshot?.counters?.[counterId] ?? config.initialValue

  const stepStr   = config.step % 1 === 0
    ? String(config.step)
    : config.step.toFixed(1)

  // ── Actions ──────────────────────────────────────────────────────────────

  function increment() {
    if (!isToday) return
    const next = parseFloat((value + config.step).toFixed(10))
    updateCounter(counterId, next)
  }

  function decrement() {
    if (!isToday) return
    const next = parseFloat((value - config.step).toFixed(10))
    updateCounter(counterId, next)
  }

  function handleConfigSave(newConfig: CounterConfig) {
    onConfigChange?.(newConfig)
  }

  // ── Display value — clean up floating-point dust ──────────────────────────

  const displayValue = Number.isInteger(value)
    ? String(value)
    : value.toFixed(
        config.step.toString().includes('.')
          ? config.step.toString().split('.')[1].length
          : 0
      )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col items-center justify-center gap-4 h-full min-h-[160px]">

      {/* Settings overlay */}
      {showSettings && (
        <SettingsPanel
          config={config}
          onSave={handleConfigSave}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Toolbar */}
      <div className="absolute top-0 right-0 flex items-center gap-2">
        {!isToday && (
          <span className="text-xs text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
            📅 Somente leitura
          </span>
        )}
        <button
          onClick={() => setShowSettings(true)}
          className="text-gray-600 hover:text-gray-300 transition text-sm leading-none"
          title="Configurar contador"
        >
          ⚙
        </button>
      </div>

      {/* Counter name */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest text-center">
        {config.name}
      </p>

      {/* Value display */}
      <div
        className="
          text-6xl font-bold tabular-nums text-white
          leading-none select-none tracking-tight
        "
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {displayValue}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={decrement}
          disabled={!isToday}
          className="
            w-12 h-12 rounded-2xl
            bg-gray-800/60 border border-gray-700
            text-xl text-gray-300 font-light
            hover:bg-gray-700/60 hover:border-gray-600 hover:text-white
            active:scale-95
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-all duration-100
          "
          title={`−${stepStr}`}
        >
          −
        </button>

        <span className="text-xs text-gray-700 select-none">±{stepStr}</span>

        <button
          onClick={increment}
          disabled={!isToday}
          className="
            w-12 h-12 rounded-2xl
            bg-brand-500/10 border border-brand-500/30
            text-xl text-brand-400 font-light
            hover:bg-brand-500/20 hover:border-brand-500/60 hover:text-brand-300
            active:scale-95
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-all duration-100
          "
          title={`+${stepStr}`}
        >
          +
        </button>
      </div>
    </div>
  )
}
