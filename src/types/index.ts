export interface User {
  uid: string
  email: string | null
  displayName: string | null
}

export type WidgetType =
  | 'clock'
  | 'notes'
  | 'tasks'
  | 'habits'
  | 'weather'
  | 'pomodoro'

export interface Widget {
  id: string
  type: WidgetType
  title: string
  order: number
  config?: Record<string, unknown>
}

export interface DashboardLayout {
  userId: string
  widgets: Widget[]
  updatedAt: Date
}
