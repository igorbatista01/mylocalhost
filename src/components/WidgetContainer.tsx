import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

interface Props {
  id: string
  title: string
  onRemove: () => void
  onTitleChange: (newTitle: string) => void
  children: ReactNode
}

export default function WidgetContainer({
  id,
  title,
  onRemove,
  onTitleChange,
  children,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue]     = useState(title)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.45 : 1,
    zIndex:     isDragging ? 50 : undefined,
  }

  function handleTitleSubmit() {
    setEditingTitle(false)
    const trimmed = titleValue.trim()
    if (trimmed && trimmed !== title) {
      onTitleChange(trimmed)
    } else {
      setTitleValue(title) // revert if empty or unchanged
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="
        bg-gray-900/80 border border-gray-800 rounded-2xl
        flex flex-col min-h-[160px]
        shadow-sm hover:border-gray-700 transition-colors
      "
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800/70">
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="
            text-gray-600 cursor-grab active:cursor-grabbing
            hover:text-gray-400 transition select-none
            text-base leading-none
          "
          title="Arrastar widget"
        >
          ⠿
        </span>

        {/* Editable title */}
        {editingTitle ? (
          <input
            className="
              flex-1 bg-transparent text-sm font-medium text-white
              outline-none border-b border-brand-500 pb-0.5
            "
            value={titleValue}
            autoFocus
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit()
              if (e.key === 'Escape') {
                setTitleValue(title)
                setEditingTitle(false)
              }
            }}
          />
        ) : (
          <span
            className="
              flex-1 text-sm font-medium text-gray-300
              cursor-pointer hover:text-white transition truncate
            "
            onClick={() => setEditingTitle(true)}
            title="Clique para editar o título"
          >
            {title}
          </span>
        )}

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="
            text-gray-600 hover:text-red-400 transition
            text-xl leading-none ml-1 flex-shrink-0
          "
          title="Remover widget"
        >
          ×
        </button>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 p-4">
        {children}
      </div>
    </div>
  )
}
