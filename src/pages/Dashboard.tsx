import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import toast from 'react-hot-toast'

import { useAuth }            from '../context/AuthContext'
import { useTheme }           from '../context/ThemeContext'
import { useDayContext }      from '../context/DayContext'
import { useDashboardConfig } from '../hooks/useDashboardConfig'
import WidgetContainer        from '../components/WidgetContainer'
import AddWidgetModal         from '../components/AddWidgetModal'
import OnboardingModal        from '../components/OnboardingModal'
import SkeletonWidget         from '../components/SkeletonWidget'
import TimeNav                from '../components/TimeNav'
import type { ViewMode }      from '../components/TimeNav'
import WeekView               from './WeekView'
import MonthView              from './MonthView'
import PlaceholderWidget      from '../widgets/PlaceholderWidget'
import KanbanWidget           from '../widgets/KanbanWidget'
import HabitsWidget           from '../widgets/HabitsWidget'
import NotesWidget            from '../widgets/NotesWidget'
import CounterWidget          from '../widgets/CounterWidget'
import QuoteWidget            from '../widgets/QuoteWidget'
import ProtectedWidget        from '../widgets/ProtectedWidget'

import {
  todayString,
  addDays,
  addWeeks,
  addMonths,
  isSameWeek,
  isSameMonth,
  formatDayLabel,
  formatWeekLabel,
  formatMonthLabel,
} from '../lib/dateUtils'

import type { UserRole, Widget } from '../types'

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    admin:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
    premium: 'bg-amber-500/20  text-amber-300  border-amber-500/30',
    user:    'bg-gray-700/40   text-gray-500   border-gray-700',
  }
  const labels: Record<UserRole, string> = {
    admin: 'Admin', premium: 'Premium', user: 'Usuário',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles[role]}`}>
      {labels[role]}
    </span>
  )
}

// ─── Default counter config ───────────────────────────────────────────────────

const DEFAULT_COUNTER_CONFIG = { name: 'Contador', initialValue: 0, step: 1 }

// ─── Widget renderer ──────────────────────────────────────────────────────────

function renderWidgetContent(
  widget: Widget,
  updateWidget: (id: string, changes: Partial<Omit<Widget, 'id'>>) => void,
) {
  switch (widget.type) {
    case 'kanban':
      return <KanbanWidget />
    case 'habits':
      return <HabitsWidget />
    case 'notes':
      return <NotesWidget />
    case 'quote':
      return <QuoteWidget />
    case 'protected':
      return <ProtectedWidget />
    case 'counter': {
      const cfg = { ...DEFAULT_COUNTER_CONFIG, ...(widget.config as object) }
      return (
        <CounterWidget
          widgetId={widget.id}
          config={cfg as { name: string; initialValue: number; step: number }}
          onConfigChange={(newConfig) => updateWidget(widget.id, { config: newConfig as unknown as Record<string, unknown> })}
        />
      )
    }
    default:
      return <PlaceholderWidget type={widget.type} />
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { currentUser, userProfile, isAdmin, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const { viewDate, setViewDate, isToday } = useDayContext()

  const {
    widgets,
    loading,
    addWidget,
    addWidgetBatch,
    removeWidget,
    updateWidget,
    reorderWidgets,
  } = useDashboardConfig()

  // ── Onboarding ───────────────────────────────────────────────────────────

  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const flag = localStorage.getItem('mhl-show-onboarding')
    if (flag === '1' && !loading) {
      setShowOnboarding(true)
      localStorage.removeItem('mhl-show-onboarding')
    }
  }, [loading])

  async function handleOnboardingComplete(
    selected: Array<{ type: import('../types').WidgetType; title: string }>,
  ) {
    setShowOnboarding(false)
    if (selected.length > 0) {
      await addWidgetBatch(selected)
      toast.success(`${selected.length} widget${selected.length > 1 ? 's' : ''} adicionado${selected.length > 1 ? 's' : ''}! 🎉`)
    }
  }

  // ── Temporal navigation state ────────────────────────────────────────────

  const [viewMode,   setViewMode]   = useState<ViewMode>('day')
  // navAnchor is the "current position" in the calendar for week/month views
  const [navAnchor,  setNavAnchor]  = useState<string>(todayString())

  const [showAddModal, setShowAddModal] = useState(false)

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // ── Navigation handlers ──────────────────────────────────────────────────

  /** Move the anchor forward/backward depending on view mode */
  function handlePrev() {
    if (viewMode === 'day') {
      const d = addDays(navAnchor, -1)
      setNavAnchor(d)
      setViewDate(d)
    } else if (viewMode === 'week') {
      setNavAnchor((prev) => addWeeks(prev, -1))
    } else {
      setNavAnchor((prev) => addMonths(prev, -1))
    }
  }

  function handleNext() {
    if (viewMode === 'day') {
      const d = addDays(navAnchor, 1)
      setNavAnchor(d)
      setViewDate(d)
    } else if (viewMode === 'week') {
      setNavAnchor((prev) => addWeeks(prev, 1))
    } else {
      setNavAnchor((prev) => addMonths(prev, 1))
    }
  }

  /** Jump to today in day view */
  function handleToday() {
    const today = todayString()
    setNavAnchor(today)
    setViewDate(today)
    setViewMode('day')
  }

  /** Switch view mode; when going to day, sync viewDate with anchor */
  function handleSetMode(mode: ViewMode) {
    setViewMode(mode)
    if (mode === 'day') {
      setViewDate(navAnchor)
    }
  }

  /**
   * Called by WeekView / MonthView when the user clicks "Hoje → abrir modo edição"
   * on the today card inside the modal.
   */
  function handleGoToDay(date: string) {
    setNavAnchor(date)
    setViewDate(date)
    setViewMode('day')
  }

  // ── Computed nav label ───────────────────────────────────────────────────

  const navLabel = viewMode === 'day'
    ? formatDayLabel(navAnchor)
    : viewMode === 'week'
    ? formatWeekLabel(navAnchor)
    : formatMonthLabel(navAnchor)

  const isAtToday = viewMode === 'day'
    ? navAnchor === todayString()
    : viewMode === 'week'
    ? isSameWeek(navAnchor, todayString())
    : isSameMonth(navAnchor, todayString())

  // ── Drag-and-drop ────────────────────────────────────────────────────────

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = widgets.findIndex((w) => w.id === active.id)
    const newIndex  = widgets.findIndex((w) => w.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      reorderWidgets(arrayMove(widgets, oldIndex, newIndex))
    }
  }

  const role = userProfile?.role ?? 'user'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* ── Onboarding modal ────────────────────────────────────────────── */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-xl font-bold tracking-tight">
          My<span className="text-brand-500">LocalHost</span>
        </h1>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="
                hidden sm:inline-flex
                text-xs text-purple-400 hover:text-purple-300
                border border-purple-500/30 rounded-lg px-3 py-1.5 transition
              "
            >
              ⚙ Admin
            </Link>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="
              text-gray-500 hover:text-white transition
              p-1.5 rounded-lg hover:bg-gray-800/60 text-base
            "
            title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <RoleBadge role={role} />

          {/* Profile link */}
          <Link
            to="/profile"
            className="
              flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition
              max-w-[120px] sm:max-w-[180px] truncate
            "
            title="Perfil"
          >
            <span className="hidden sm:inline truncate">
              {currentUser?.displayName || currentUser?.email}
            </span>
            <span className="w-7 h-7 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {(currentUser?.displayName || currentUser?.email || '?')[0].toUpperCase()}
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-white transition hidden sm:inline"
          >
            Sair
          </button>
        </div>
      </header>

      {/* ── Temporal navigation bar ─────────────────────────────────────── */}
      <TimeNav
        viewMode={viewMode}
        label={navLabel}
        isAtToday={isAtToday}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onSetMode={handleSetMode}
      />

      {/* ── Main content (switches by view mode) ────────────────────────── */}

      {viewMode === 'week' && (
        <WeekView anchorDate={navAnchor} onGoToDay={handleGoToDay} />
      )}

      {viewMode === 'month' && (
        <MonthView anchorDate={navAnchor} onGoToDay={handleGoToDay} />
      )}

      {viewMode === 'day' && (
        <main className="p-6 pb-28 flex-1">
          {/* Greeting + date */}
          <div className="mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-semibold">
                Olá{currentUser?.displayName ? `, ${currentUser.displayName}` : ''} 👋
              </h2>
              {!isToday && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  Histórico
                </span>
              )}
            </div>

            <p className="text-gray-500 text-sm mt-1 capitalize">
              {formatDayLabel(viewDate)}
            </p>

            {!isToday && (
              <p className="text-xs text-amber-500/70 mt-1">
                📅 Visualizando dia passado — widgets em modo somente leitura
              </p>
            )}
          </div>

          {/* Skeleton loading state */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <SkeletonWidget key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && widgets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center animate-fade-in">
              <div className="text-6xl select-none">🧩</div>
              <h3 className="text-lg font-semibold text-gray-300">
                Seu dashboard está vazio
              </h3>
              <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                Adicione widgets para montar seu espaço pessoal do jeito que você
                quiser — Kanban, hábitos, notas e muito mais.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="
                  mt-2 bg-brand-500 hover:bg-brand-600 text-white
                  text-sm font-medium px-5 py-2.5 rounded-xl transition
                "
              >
                + Adicionar primeiro widget
              </button>
            </div>
          )}

          {/* Widget grid with drag-and-drop */}
          {!loading && widgets.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={widgets.map((w) => w.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {widgets.map((widget) => (
                    <WidgetContainer
                      key={widget.id}
                      id={widget.id}
                      title={widget.title}
                      onRemove={() => {
                        removeWidget(widget.id)
                        toast.success('Widget removido')
                      }}
                      onTitleChange={(newTitle) =>
                        updateWidget(widget.id, { title: newTitle })
                      }
                    >
                      {renderWidgetContent(widget, updateWidget)}
                    </WidgetContainer>
                  ))}

                  {/* Add widget card — always visible at the end of the grid */}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="
                      flex flex-col items-center justify-center gap-3
                      min-h-[180px] rounded-2xl
                      border-2 border-dashed border-gray-700/60
                      hover:border-brand-500/50 hover:bg-brand-500/5
                      text-gray-600 hover:text-brand-400
                      transition-all duration-200 group
                    "
                  >
                    <span className="
                      text-3xl w-12 h-12 rounded-full
                      flex items-center justify-center
                      border-2 border-current
                      group-hover:scale-110 transition-transform duration-200
                      font-light leading-none
                    ">+</span>
                    <span className="text-sm font-medium">Adicionar widget</span>
                  </button>
                </div>
              </SortableContext>
            </DndContext>
          )}
        </main>
      )}

      {/* ── FAB — add widget (day view only, when widgets exist) ────────── */}
      {viewMode === 'day' && !loading && widgets.length > 0 && (
        <button
          onClick={() => setShowAddModal(true)}
          className="
            fixed bottom-6 right-6
            bg-brand-500 hover:bg-brand-600
            text-white text-sm font-medium
            px-5 py-3 rounded-2xl
            shadow-lg shadow-brand-500/20
            transition
            flex items-center gap-2
          "
        >
          <span className="text-lg leading-none font-light">+</span>
          Adicionar widget
        </button>
      )}

      {/* ── Add widget modal ─────────────────────────────────────────────── */}
      {showAddModal && (
        <AddWidgetModal
          onAdd={(type, title) => {
            addWidget(type, title)
            toast.success(`Widget "${title}" adicionado!`)
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
