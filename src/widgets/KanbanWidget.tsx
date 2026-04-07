import { useState, useMemo, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core'
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import toast from 'react-hot-toast'
import { useDayContext } from '../context/DayContext'
import type { KanbanColumn, KanbanTask, KanbanData } from '../types'

// ─── Confetti burst ───────────────────────────────────────────────────────────

function ConfettiBurst({ x, y }: { x: number; y: number }) {
  const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#a855f7', '#ef4444']
  const particles = Array.from({ length: 8 }, (_, i) => ({
    color: colors[i % colors.length],
    angle: (i * 360) / 8,
    delay: i * 30,
  }))

  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="confetti-particle"
          style={{
            left: x,
            top: y,
            backgroundColor: p.color,
            transform: `rotate(${p.angle}deg)`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const DEFAULT_KANBAN: KanbanData = {
  columns: [
    { id: 'col-a', title: 'A Fazer',  order: 0 },
    { id: 'col-b', title: 'Fazendo',  order: 1 },
    { id: 'col-c', title: 'Feito',    order: 2 },
  ],
  tasks: [],
}

// ─── KanbanCard ───────────────────────────────────────────────────────────────

interface CardProps {
  task:        KanbanTask
  isCompleted: boolean
  isReadOnly:  boolean
  onEdit:      (id: string, title: string) => void
  onDelete:    (id: string) => void
}

function KanbanCard({ task, isCompleted, isReadOnly, onEdit, onDelete }: CardProps) {
  const [editing, setEditing]   = useState(false)
  const [value,   setValue]     = useState(task.title)
  const [hovered, setHovered]   = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isReadOnly })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.25 : 1,
  }

  function commitEdit() {
    setEditing(false)
    const trimmed = value.trim()
    if (trimmed && trimmed !== task.title) onEdit(task.id, trimmed)
    else setValue(task.title)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative bg-gray-800/60 border rounded-xl px-3 py-2.5
        transition-all duration-150
        ${isCompleted
          ? 'border-green-800/40 bg-green-900/10'
          : 'border-gray-700/50 hover:border-gray-600/70'}
        ${isDragging ? 'shadow-none' : 'shadow-sm'}
      `}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        {!isReadOnly && (
          <span
            {...attributes}
            {...listeners}
            className="
              text-gray-600 cursor-grab active:cursor-grabbing
              mt-0.5 text-xs select-none flex-shrink-0
              hover:text-gray-400 transition
            "
          >
            ⠿
          </span>
        )}

        {/* Completion badge */}
        {isCompleted && (
          <span className="text-green-400 flex-shrink-0 mt-0.5 text-xs leading-none">✓</span>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editing && !isReadOnly ? (
            <input
              className="
                w-full bg-transparent text-sm text-white
                outline-none border-b border-brand-500 pb-0.5
              "
              value={value}
              autoFocus
              onChange={(e) => setValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  commitEdit()
                if (e.key === 'Escape') { setValue(task.title); setEditing(false) }
              }}
            />
          ) : (
            <span
              className={`
                text-sm leading-snug break-words block transition
                ${isCompleted
                  ? 'line-through text-gray-500'
                  : 'text-gray-200'}
                ${!isReadOnly ? 'cursor-pointer hover:text-white' : ''}
              `}
              onClick={() => !isReadOnly && setEditing(true)}
              title={!isReadOnly ? 'Clique para editar' : undefined}
            >
              {task.title}
            </span>
          )}
        </div>

        {/* Delete button — visible on hover */}
        {!isReadOnly && hovered && !editing && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
            className="
              flex-shrink-0 text-gray-600 hover:text-red-400
              transition text-lg leading-none mt-[-1px]
            "
            title="Remover tarefa"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

// ─── KanbanColumnView ─────────────────────────────────────────────────────────

interface ColumnProps {
  column:       KanbanColumn
  tasks:        KanbanTask[]
  isLastColumn: boolean
  isReadOnly:   boolean
  onAddTask:    (columnId: string, title: string) => void
  onEditTask:   (taskId: string,   title: string) => void
  onDeleteTask: (taskId: string) => void
}

function KanbanColumnView({
  column, tasks, isLastColumn, isReadOnly,
  onAddTask, onEditTask, onDeleteTask,
}: ColumnProps) {
  const [newTitle,   setNewTitle]   = useState('')
  const [showInput,  setShowInput]  = useState(false)

  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order)
  const taskIds     = sortedTasks.map((t) => t.id)

  function handleAdd() {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    onAddTask(column.id, trimmed)
    setNewTitle('')
    setShowInput(false)
  }

  return (
    <div className="flex flex-col flex-1 min-w-[180px] bg-gray-900/40 rounded-2xl border border-gray-800/60">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-800/40">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">
          {column.title}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-600">{tasks.length}</span>
          {!isReadOnly && (
            <button
              onClick={() => setShowInput(true)}
              className="text-gray-500 hover:text-brand-400 transition text-lg leading-none"
              title="Adicionar tarefa"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Task list */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 flex flex-col gap-2 p-2.5 min-h-[72px]
          rounded-b-2xl transition-colors duration-100
          ${isOver ? 'bg-brand-500/5' : ''}
        `}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              isCompleted={isLastColumn}
              isReadOnly={isReadOnly}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>

        {/* Quick-add input */}
        {showInput && !isReadOnly && (
          <div className="mt-1 flex flex-col gap-1.5">
            <input
              className="
                w-full bg-gray-800 border border-gray-700 rounded-xl
                px-3 py-2 text-sm text-white placeholder-gray-600
                focus:outline-none focus:border-brand-500 transition
              "
              placeholder="Nova tarefa…"
              value={newTitle}
              autoFocus
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  handleAdd()
                if (e.key === 'Escape') { setNewTitle(''); setShowInput(false) }
              }}
              onBlur={() => { if (!newTitle.trim()) setShowInput(false) }}
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleAdd}
                className="
                  text-xs bg-brand-500 hover:bg-brand-600
                  text-white px-3 py-1 rounded-lg transition
                "
              >
                Adicionar
              </button>
              <button
                onClick={() => { setNewTitle(''); setShowInput(false) }}
                className="text-xs text-gray-500 hover:text-white px-2 py-1 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────

interface SettingsPanelProps {
  columns:  KanbanColumn[]
  onAdd:    () => void
  onRemove: (id: string) => void
  onRename: (id: string, title: string) => void
  onClose:  () => void
}

function SettingsPanel({ columns, onAdd, onRemove, onRename, onClose }: SettingsPanelProps) {
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [editValue,  setEditValue]  = useState('')

  function startEdit(col: KanbanColumn) {
    setEditingId(col.id)
    setEditValue(col.title)
  }

  function commitRename() {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="
      absolute inset-0 z-20 bg-gray-900/97 backdrop-blur-sm
      rounded-2xl p-4 flex flex-col
    ">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">⚙ Configurar Colunas</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition text-xl leading-none"
        >
          ×
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Clique no nome da coluna para renomeá-la.
      </p>

      {/* Column list */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex items-center gap-2 bg-gray-800/60 rounded-xl px-3 py-2.5"
          >
            {editingId === col.id ? (
              <input
                className="
                  flex-1 bg-transparent text-sm text-white
                  outline-none border-b border-brand-500 pb-0.5
                "
                value={editValue}
                autoFocus
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')  commitRename()
                  if (e.key === 'Escape') setEditingId(null)
                }}
              />
            ) : (
              <span
                className="flex-1 text-sm text-gray-300 cursor-pointer hover:text-white transition"
                onClick={() => startEdit(col)}
              >
                {col.title}
              </span>
            )}

            {columns.length > 1 && (
              <button
                onClick={() => onRemove(col.id)}
                className="text-gray-600 hover:text-red-400 transition text-lg leading-none flex-shrink-0"
                title="Remover coluna"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add column */}
      <button
        onClick={onAdd}
        className="
          mt-3 w-full text-sm text-brand-400 hover:text-brand-300
          border border-brand-500/30 hover:border-brand-500/60
          rounded-xl py-2 transition
        "
      >
        + Nova coluna
      </button>
    </div>
  )
}

// ─── KanbanWidget ─────────────────────────────────────────────────────────────

export default function KanbanWidget() {
  const { snapshot, isToday, updateKanban } = useDayContext()

  const [localData,    setLocalData]    = useState<KanbanData | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [confetti,     setConfetti]     = useState<{ x: number; y: number; id: number } | null>(null)
  const confettiTimer                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from snapshot (runs once when snapshot loads, and when date changes)
  useEffect(() => {
    if (!snapshot) return
    const k = snapshot.kanban
    if (!k || !k.columns || k.columns.length === 0) {
      setLocalData(DEFAULT_KANBAN)
    } else {
      setLocalData(k)
    }
  }, [snapshot])

  const data = localData ?? DEFAULT_KANBAN

  const sortedColumns = useMemo(
    () => [...data.columns].sort((a, b) => a.order - b.order),
    [data.columns],
  )

  const lastColumnId = sortedColumns[sortedColumns.length - 1]?.id

  const activeTask = useMemo(
    () => data.tasks.find((t) => t.id === activeTaskId) ?? null,
    [data.tasks, activeTaskId],
  )

  // ── Persist helper ─────────────────────────────────────────────────────────

  function persist(next: KanbanData) {
    setLocalData(next)
    if (isToday) updateKanban(next)
  }

  // ── Task CRUD ──────────────────────────────────────────────────────────────

  function addTask(columnId: string, title: string) {
    const colTasks = data.tasks.filter((t) => t.columnId === columnId)
    const task: KanbanTask = {
      id:       genId(),
      title,
      columnId,
      order:    colTasks.length,
    }
    persist({ ...data, tasks: [...data.tasks, task] })
  }

  function editTask(taskId: string, title: string) {
    persist({
      ...data,
      tasks: data.tasks.map((t) => t.id === taskId ? { ...t, title } : t),
    })
  }

  function deleteTask(taskId: string) {
    persist({ ...data, tasks: data.tasks.filter((t) => t.id !== taskId) })
  }

  // ── Column management ──────────────────────────────────────────────────────

  function addColumn() {
    const col: KanbanColumn = {
      id:    genId(),
      title: `Coluna ${data.columns.length + 1}`,
      order: data.columns.length,
    }
    persist({ ...data, columns: [...data.columns, col] })
  }

  function removeColumn(colId: string) {
    persist({
      columns: data.columns.filter((c) => c.id !== colId),
      tasks:   data.tasks.filter((t) => t.columnId !== colId),
    })
  }

  function renameColumn(colId: string, title: string) {
    persist({
      ...data,
      columns: data.columns.map((c) => c.id === colId ? { ...c, title } : c),
    })
  }

  // ── DnD helpers ────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  /** Returns the column id for a given draggable/droppable id */
  function resolveColumnId(id: string): string | undefined {
    if (data.columns.some((c) => c.id === id)) return id
    return data.tasks.find((t) => t.id === id)?.columnId
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTaskId(String(active.id))
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeId   = String(active.id)
    const overId     = String(over.id)
    if (activeId === overId) return

    const fromColId = resolveColumnId(activeId)
    const toColId   = resolveColumnId(overId)
    if (!fromColId || !toColId || fromColId === toColId) return

    // Optimistically move the task to the target column
    setLocalData((prev) => {
      if (!prev) return prev
      const destTasks = prev.tasks.filter((t) => t.columnId === toColId)
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === activeId
            ? { ...t, columnId: toColId, order: destTasks.length }
            : t,
        ),
      }
    })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTaskId(null)
    if (!over) return

    const activeId = String(active.id)
    const overId   = String(over.id)

    setLocalData((prev) => {
      if (!prev) return prev

      const activeTask = prev.tasks.find((t) => t.id === activeId)
      if (!activeTask) return prev

      const toColId   = resolveColumnId(overId) ?? activeTask.columnId
      const wasDone   = activeTask.columnId === lastColumnId
      const nowDone   = toColId === lastColumnId

      const colTasks  = prev.tasks
        .filter((t) => t.columnId === activeTask.columnId)
        .sort((a, b) => a.order - b.order)

      let nextTasks: KanbanTask[]

      if (activeTask.columnId === toColId && activeId !== overId) {
        const oldIdx = colTasks.findIndex((t) => t.id === activeId)
        const newIdx = colTasks.findIndex((t) => t.id === overId)

        if (oldIdx === -1 || newIdx === -1) {
          nextTasks = prev.tasks
        } else {
          const reordered = arrayMove(colTasks, oldIdx, newIdx)
            .map((t, i) => ({ ...t, order: i }))
          nextTasks = prev.tasks.map((t) => {
            const r = reordered.find((x) => x.id === t.id)
            return r ?? t
          })
        }
      } else {
        const groups: Record<string, KanbanTask[]> = {}
        for (const t of prev.tasks) {
          if (!groups[t.columnId]) groups[t.columnId] = []
          groups[t.columnId].push(t)
        }
        nextTasks = Object.values(groups).flatMap((group) =>
          [...group].sort((a, b) => a.order - b.order).map((t, i) => ({ ...t, order: i })),
        )
      }

      // Fire confetti + toast when a task lands in the last column
      if (!wasDone && nowDone) {
        toast.success('Tarefa concluída! 🎉')
        if (confettiTimer.current) clearTimeout(confettiTimer.current)
        setConfetti({ x: 50, y: 50, id: Date.now() })
        confettiTimer.current = setTimeout(() => setConfetti(null), 800)
      }

      const result = { ...prev, tasks: nextTasks }
      if (isToday) updateKanban(result)
      return result
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!snapshot) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-600 text-sm animate-pulse">
        Carregando…
      </div>
    )
  }

  return (
    <div className="relative h-full flex flex-col gap-3">
      {/* Confetti overlay */}
      {confetti && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
          <ConfettiBurst key={confetti.id} x={confetti.x} y={confetti.y} />
        </div>
      )}

      {/* Settings panel overlay */}
      {showSettings && (
        <SettingsPanel
          columns={sortedColumns}
          onAdd={addColumn}
          onRemove={removeColumn}
          onRename={renameColumn}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Toolbar row */}
      <div className="flex items-center justify-between gap-2 min-h-[24px]">
        {!isToday ? (
          <span className="text-xs text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
            📅 Somente leitura
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={() => setShowSettings(true)}
          className="text-gray-600 hover:text-gray-300 transition text-sm leading-none"
          title="Configurar colunas"
        >
          ⚙
        </button>
      </div>

      {/* Empty state */}
      {data.tasks.length === 0 && isToday && (
        <div className="flex flex-col items-center justify-center py-4 gap-2 text-center animate-fade-in">
          <span className="text-2xl select-none">📋</span>
          <p className="text-gray-500 text-xs leading-relaxed max-w-[200px]">
            Nenhuma tarefa ainda. Clique no <strong>+</strong> de uma coluna para começar!
          </p>
        </div>
      )}

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col sm:flex-row gap-3 overflow-x-auto pb-1">
          {sortedColumns.map((col) => (
            <KanbanColumnView
              key={col.id}
              column={col}
              tasks={data.tasks.filter((t) => t.columnId === col.id)}
              isLastColumn={col.id === lastColumnId}
              isReadOnly={!isToday}
              onAddTask={addTask}
              onEditTask={editTask}
              onDeleteTask={deleteTask}
            />
          ))}
        </div>

        {/* Drag overlay — floats next to the cursor */}
        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="
              bg-gray-800 border border-gray-500 rounded-xl
              px-3 py-2.5 shadow-2xl shadow-black/50
              text-sm text-gray-200 rotate-1
              pointer-events-none select-none
            ">
              {activeTask.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
