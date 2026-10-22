export const ASSESSMENT_TYPES = ['assignment', 'midterm', 'final', 'group_project'] as const
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number]

export const ASSESSMENT_LABELS: Record<AssessmentType, string> = {
  assignment: 'Assignment',
  midterm: 'Midterm',
  final: 'Final exam',
  group_project: 'Group project',
}

export const PRIORITIES = ['high', 'normal', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'High',
  normal: 'Normal',
  low: 'Low',
}

export const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 }

export type Assignment = {
  id: string
  user_id: string
  title: string
  course: string | null
  deadline: string | null // YYYY-MM-DD
  notes: string | null
  assessment_type: AssessmentType
  priority: Priority
  created_at: string
  updated_at: string
}

export type Subtask = {
  id: string
  assignment_id: string
  user_id: string
  title: string
  due_date: string | null // YYYY-MM-DD
  completed: boolean
  position: number
  created_at: string
  updated_at: string
}

export type AssignmentPatch = Partial<Pick<Assignment, 'title' | 'course' | 'deadline' | 'notes' | 'assessment_type' | 'priority'>>
export type SubtaskPatch = Partial<Pick<Subtask, 'title' | 'due_date' | 'completed' | 'position'>>
