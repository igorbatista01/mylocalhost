import { useState, useRef, useEffect } from 'react'
import { useDayContext } from '../context/DayContext'

// ─── QuoteWidget ──────────────────────────────────────────────────────────────

const DEFAULT_QUOTE = 'Escreva aqui a frase do seu dia…'

export default function QuoteWidget() {
  const { snapshot, isToday, updateQuote } = useDayContext()

  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')
  const textareaRef           = useRef<HTMLTextAreaElement>(null)

  const quote = snapshot?.quote ?? ''

  // ── Start editing ─────────────────────────────────────────────────────────

  function startEdit() {
    if (!isToday) return
    setDraft(quote)
    setEditing(true)
  }

  // Auto-focus and place cursor at end
  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [editing])

  // ── Commit edit ───────────────────────────────────────────────────────────

  function commitEdit() {
    const trimmed = draft.trim()
    updateQuote(trimmed)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter (without shift) saves; Escape cancels
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commitEdit()
    }
    if (e.key === 'Escape') {
      setEditing(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[120px] gap-3 px-2">

      {/* Read-only badge */}
      {!isToday && (
        <span className="text-xs text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full self-center">
          📅 Somente leitura
        </span>
      )}

      {editing ? (
        /* ── Editing mode ── */
        <div className="w-full flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            rows={4}
            placeholder={DEFAULT_QUOTE}
            className="
              w-full resize-none bg-transparent
              text-center text-lg italic text-gray-200
              placeholder-gray-700 leading-relaxed
              focus:outline-none
              border-b border-brand-500/40 pb-1
              transition
            "
          />
          <p className="text-xs text-gray-700 text-center select-none">
            Enter para salvar · Shift+Enter para nova linha · Esc para cancelar
          </p>
        </div>
      ) : (
        /* ── Display mode ── */
        <div
          onClick={startEdit}
          className={`
            w-full text-center leading-relaxed select-none
            ${isToday ? 'cursor-pointer group' : 'cursor-default'}
          `}
          title={isToday ? 'Clique para editar' : undefined}
        >
          {quote ? (
            <>
              {/* Opening quote mark */}
              <span
                className="
                  block text-4xl text-brand-500/20 font-serif leading-none
                  mb-1 select-none
                "
                aria-hidden
              >
                "
              </span>

              <p
                className="
                  text-lg italic text-gray-200 leading-relaxed
                  group-hover:text-white transition
                "
              >
                {quote}
              </p>

              {/* Closing quote mark */}
              <span
                className="
                  block text-4xl text-brand-500/20 font-serif leading-none
                  mt-1 rotate-180 select-none
                "
                aria-hidden
              >
                "
              </span>
            </>
          ) : (
            <p
              className={`
                text-sm leading-relaxed
                ${isToday
                  ? 'text-gray-700 group-hover:text-gray-500 transition italic'
                  : 'text-gray-700 italic'}
              `}
            >
              {isToday ? 'Clique para escrever a frase do dia…' : 'Nenhuma frase registrada.'}
            </p>
          )}

          {/* Edit hint — only today, only when there's text */}
          {isToday && quote && (
            <p className="
              text-xs text-gray-700 mt-2
              opacity-0 group-hover:opacity-100 transition
            ">
              Clique para editar
            </p>
          )}
        </div>
      )}
    </div>
  )
}
