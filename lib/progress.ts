import type { Subtask } from './types'

type StepState = Pick<Subtask, 'assignment_id' | 'completed'>

// The dashboard broadcasts its pending count so the header badge stays in sync without refetching.
export const PENDING_EVENT = 'firststep:pending-count'

// An assignment is done once it has steps and every step is complete; anything else is pending.
export function isAssignmentDone(steps: Pick<Subtask, 'completed'>[]): boolean {
  return steps.length > 0 && steps.every((s) => s.completed)
}

export function countPending(assignmentIds: string[], subtasks: StepState[]): number {
  const byAssignment = new Map<string, StepState[]>()
  for (const s of subtasks) {
    const list = byAssignment.get(s.assignment_id)
    if (list) list.push(s)
    else byAssignment.set(s.assignment_id, [s])
  }
  return assignmentIds.filter((id) => !isAssignmentDone(byAssignment.get(id) ?? [])).length
}
