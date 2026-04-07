import { useState, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { useDayContext } from '../context/DayContext'

// ─── NotesWidget ──────────────────────────────────────────────────────────────

export default function NotesWidget() {
  const { snapshot, isToday, updateNotes } = useDayContext()

  const [input, setInput]   = useState('')
  const inputRef            = useRef<HTMLInputElement>(null)

  const notes: string[] = snapshot?.notes ?? []

  // ── Add note ──────────────────────────────────────────────────────────────

  function addNote() {
    const text = input.trim()
    if (!text || !isToday) return
    updateNotes([...notes, text])
    setInput('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') addNote()
  }

  // ── Remove note ───────────────────────────────────────────────────────────

  function removeNote(index: number) {
    if (!isToday) return
    updateNotes(notes.filter((_, i) => i !== index))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* Read-only badge */}
      {!isToday && (
        <span className="text-xs text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full self-start">
          📅 Somente leitura
        </span>
      )}

      {/* Input row — today only */}
      {isToday && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nova nota… (Enter para salvar)"
            className="
              flex-1 bg-gray-800 border border-gray-700 rounded-xl
              px-3 py-2 text-sm text-white placeholder-gray-600
              focus:outline-none focus:border-brand-500 transition
            "
          />
          <button
            onClick={addNote}
            disabled={!input.trim()}
            className="
              px-3 py-2 rounded-xl text-sm font-medium
              bg-brand-500/10 text-brand-400 border border-brand-500/30
              hover:bg-brand-500/20 hover:border-brand-500/60
              disabled:opacity-30 disabled:cursor-not-allowed
              transition
            "
            title="Adicionar nota"
          >
            +
          </button>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
          <span className="text-3xl select-none">📝</span>
          <p className="text-gray-600 text-sm">
            {isToday ? 'Nenhuma nota ainda. Escreva algo!' : 'Nenhuma nota neste dia.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto">
          {notes.map((note, i) => (
            <li
              key={i}
              className="
                group flex items-start gap-2
                bg-gray-800/50 border border-gray-800 rounded-xl
                px-3 py-2.5 text-sm text-gray-200
                hover:border-gray-700 transition
              "
            >
              {/* Note dot */}
              <span className="text-brand-500/60 mt-0.5 flex-shrink-0 select-none">•</span>

              {/* Note text */}
              <span className="flex-1 break-words leading-snug">{note}</span>

              {/* Remove button — only today, on hover */}
              {isToday && (
                <button
                  onClick={() => removeNote(i)}
                  className="
                    opacity-0 group-hover:opacity-100
                    text-gray-600 hover:text-red-400
                    transition text-lg leading-none flex-shrink-0 mt-[-2px]
                  "
                  title="Remover nota"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
