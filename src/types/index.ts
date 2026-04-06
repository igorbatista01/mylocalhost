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
