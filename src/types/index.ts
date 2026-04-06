// ─── User & Roles ───────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'premium' | 'user'

export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  role: UserRole
  createdAt: Date
  invitedBy?: string // uid of admin who generated the invite
}

// ─── Invites ─────────────────────────────────────────────────────────────────

export interface InviteCode {
  code: string
  role: 'user' | 'premium'
  createdBy: string       // admin uid
  createdByName: string   // admin display name
  createdAt: Date
  used: boolean
  usedBy?: string         // uid of user who used the code
  usedByName?: string
  usedAt?: Date
}

// ─── Widgets ─────────────────────────────────────────────────────────────────

export type WidgetType =
  | 'kanban'
  | 'habits'
  | 'notes'
  | 'counter'
  | 'quote'
  | 'focus'
  | 'protected'

export interface Widget {
  id: string
  type: WidgetType
  title: string
  position: number              // order in the grid
  config: Record<string, unknown>
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardConfig {
  widgets: Widget[]
}

// ─── Kanban (snapshot sub-types) ─────────────────────────────────────────────

export interface KanbanTask {
  id: string
  title: string
  columnId: string
  order: number
}

export interface KanbanColumn {
  id: string
  title: string
  order: number
}

export interface KanbanData {
  columns: KanbanColumn[]
  tasks: KanbanTask[]
}

// ─── Focus widget ─────────────────────────────────────────────────────────────

export interface FocusData {
  title: string
  description: string
}

// ─── Day Snapshot ─────────────────────────────────────────────────────────────
// Stored at /users/{uid}/days/{YYYY-MM-DD}

export interface DaySnapshot {
  date: string                          // YYYY-MM-DD
  kanban: KanbanData
  habits: Record<string, boolean>       // habitId → checked
  notes: string[]
  quote: string
  counters: Record<string, number>      // counterId → value
  focus: FocusData
  createdAt: Date
  frozenAt: Date | null                 // null while today; set when the day passes
}

/** Partial update shapes passed to the update helpers */
export type DaySnapshotSection = keyof Omit<DaySnapshot, 'date' | 'createdAt' | 'frozenAt'>
