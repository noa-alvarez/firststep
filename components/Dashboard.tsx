'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import AssignmentCard from './AssignmentCard'
import AssignmentFields, { EMPTY_DETAILS, type DetailValues } from './AssignmentFields'
import Calendar from './Calendar'
import { createClient } from '@/lib/supabase/client'
import { daysUntil } from '@/lib/dates'
import { isAssignmentDone, PENDING_EVENT } from '@/lib/progress'
import { PRIORITY_RANK, type Assignment, type AssignmentPatch, type Subtask, type SubtaskPatch } from '@/lib/types'

type View = 'list' | 'calendar'
type Filter = 'all' | 'pending' | 'done'
type SortBy = 'deadline' | 'priority'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'done', label: 'Done' },
]

// Merge freshly loaded rows with anything added locally while the request was in flight.
function mergeById<T extends { id: string }>(prev: T[], loaded: T[]): T[] {
  const ids = new Set(loaded.map((r) => r.id))
  return [...prev.filter((r) => !ids.has(r.id)), ...loaded]
}

function byPosition(a: Subtask, b: Subtask) {
  return a.position - b.position || a.created_at.localeCompare(b.created_at)
}

function byDeadline(x: Assignment, y: Assignment) {
  if (x.deadline && y.deadline && x.deadline !== y.deadline) return x.deadline < y.deadline ? -1 : 1
  if (x.deadline && !y.deadline) return -1
  if (!x.deadline && y.deadline) return 1
  return 0
}

function byPriority(x: Assignment, y: Assignment) {
  return PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority]
}

export default function Dashboard() {
  const supabase = useMemo(() => createClient(), [])
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const showParam = searchParams.get('show')
  const filter: Filter = showParam === 'pending' || showParam === 'done' ? showParam : 'all'

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('list')
  const [sortBy, setSortBy] = useState<SortBy>('deadline')

  const [title, setTitle] = useState('')
  const [details, setDetails] = useState<DetailValues>(EMPTY_DETAILS)
  const [showDetails, setShowDetails] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [justCreated, setJustCreated] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [a, s] = await Promise.all([
      supabase.from('assignments').select('*').order('created_at', { ascending: false }),
      supabase.from('subtasks').select('*').order('position', { ascending: true }),
    ])
    if (a.error || s.error) {
      setError(`Couldn’t load your assignments: ${(a.error ?? s.error)!.message}`)
    } else {
      setAssignments((prev) => mergeById(prev, a.data as Assignment[]))
      setSubtasks((prev) => mergeById(prev, s.data as Subtask[]))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  // The pending badge link should always land on the list, not the calendar.
  useEffect(() => {
    if (filter === 'pending') setView('list')
  }, [filter])

  const stepsByAssignment = useMemo(() => {
    const map = new Map<string, Subtask[]>()
    for (const s of [...subtasks].sort(byPosition)) {
      const list = map.get(s.assignment_id)
      if (list) list.push(s)
      else map.set(s.assignment_id, [s])
    }
    return map
  }, [subtasks])

  const isDone = useCallback((a: Assignment) => isAssignmentDone(stepsByAssignment.get(a.id) ?? []), [stepsByAssignment])

  const counts = useMemo(() => {
    const done = assignments.filter(isDone).length
    return { all: assignments.length, done, pending: assignments.length - done }
  }, [assignments, isDone])

  useEffect(() => {
    if (!loading) window.dispatchEvent(new CustomEvent(PENDING_EVENT, { detail: counts.pending }))
  }, [loading, counts.pending])

  const visible = useMemo(() => {
    const list = assignments.filter((a) => (filter === 'all' ? true : filter === 'done' ? isDone(a) : !isDone(a)))
    return list.sort((x, y) => {
      const primary = sortBy === 'priority' ? byPriority(x, y) || byDeadline(x, y) : byDeadline(x, y) || byPriority(x, y)
      return primary || y.created_at.localeCompare(x.created_at)
    })
  }, [assignments, filter, sortBy, isDone])

  const stats = useMemo(() => {
    const done = subtasks.filter((s) => s.completed).length
    const dueThisWeek = assignments.filter((a) => a.deadline && daysUntil(a.deadline) >= 0 && daysUntil(a.deadline) <= 7).length
    return { done, total: subtasks.length, dueThisWeek }
  }, [assignments, subtasks])

  // Update the URL in place (no server round trip); Next keeps useSearchParams in sync.
  function setFilter(next: Filter) {
    window.history.replaceState(null, '', next === 'all' ? pathname : `${pathname}?show=${next}`)
  }

  // ---- assignments -------------------------------------------------------

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const t = title.trim()
    if (!t) {
      setFormError('Give your assignment a title.')
      return
    }
    setFormError(null)
    setSaving(true)
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        title: t,
        course: details.course.trim() || null,
        deadline: details.deadline || null,
        assessment_type: details.assessment_type,
        priority: details.priority,
        notes: details.notes.trim() || null,
      })
      .select()
      .single()
    setSaving(false)
    if (error) {
      setFormError(`Couldn’t save: ${error.message}`)
      return
    }
    setAssignments((prev) => [data as Assignment, ...prev])
    setJustCreated((data as Assignment).id)
    setTitle('')
    setDetails(EMPTY_DETAILS)
    setShowDetails(false)
    // A brand-new assignment is pending, so make sure the current filter shows it.
    if (filter === 'done') setFilter('all')
  }

  async function updateAssignment(id: string, patch: AssignmentPatch) {
    const { data, error } = await supabase.from('assignments').update(patch).eq('id', id).select().single()
    if (error) {
      setError(`Couldn’t update the assignment: ${error.message}`)
      return false
    }
    setAssignments((prev) => prev.map((a) => (a.id === id ? (data as Assignment) : a)))
    return true
  }

  async function deleteAssignment(id: string) {
    const { error } = await supabase.from('assignments').delete().eq('id', id)
    if (error) {
      setError(`Couldn’t delete the assignment: ${error.message}`)
      return false
    }
    setAssignments((prev) => prev.filter((a) => a.id !== id))
    setSubtasks((prev) => prev.filter((s) => s.assignment_id !== id))
    return true
  }

  // ---- subtasks ----------------------------------------------------------

  async function addSubtask(assignmentId: string, stepTitle: string, dueDate: string | null) {
    const siblings = stepsByAssignment.get(assignmentId) ?? []
    const position = siblings.length ? Math.max(...siblings.map((s) => s.position)) + 1 : 0
    const { data, error } = await supabase
      .from('subtasks')
      .insert({ assignment_id: assignmentId, title: stepTitle, due_date: dueDate, position })
      .select()
      .single()
    if (error) {
      setError(`Couldn’t add the step: ${error.message}`)
      return false
    }
    setSubtasks((prev) => [...prev, data as Subtask])
    return true
  }

  async function updateSubtask(id: string, patch: SubtaskPatch) {
    const before = subtasks
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    const { data, error } = await supabase.from('subtasks').update(patch).eq('id', id).select().single()
    if (error) {
      setSubtasks(before)
      setError(`Couldn’t update the step: ${error.message}`)
      return false
    }
    setSubtasks((prev) => prev.map((s) => (s.id === id ? (data as Subtask) : s)))
    return true
  }

  async function deleteSubtask(id: string) {
    const { error } = await supabase.from('subtasks').delete().eq('id', id)
    if (error) {
      setError(`Couldn’t delete the step: ${error.message}`)
      return false
    }
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
    return true
  }

  async function moveSubtask(id: string, direction: -1 | 1) {
    const target = subtasks.find((s) => s.id === id)
    if (!target) return
    const list = [...(stepsByAssignment.get(target.assignment_id) ?? [])]
    const from = list.findIndex((s) => s.id === id)
    const to = from + direction
    if (to < 0 || to >= list.length) return
    ;[list[from], list[to]] = [list[to], list[from]]

    const changed = list
      .map((s, index) => ({ id: s.id, position: index, old: s.position }))
      .filter((c) => c.position !== c.old)
    const before = subtasks
    const newPos = new Map(changed.map((c) => [c.id, c.position]))
    setSubtasks((prev) => prev.map((s) => (newPos.has(s.id) ? { ...s, position: newPos.get(s.id)! } : s)))

    const results = await Promise.all(
      changed.map((c) => supabase.from('subtasks').update({ position: c.position }).eq('id', c.id)),
    )
    const failed = results.find((r) => r.error)
    if (failed?.error) {
      setSubtasks(before)
      setError(`Couldn’t reorder the steps: ${failed.error.message}`)
    }
  }

  const emptyMessage =
    filter === 'pending'
      ? { title: 'Nothing pending', body: 'Every assignment has all its steps done. Enjoy the break, or add the next one above.' }
      : filter === 'done'
        ? { title: 'Nothing finished yet', body: 'An assignment counts as done once all of its steps are ticked off.' }
        : { title: 'No assignments yet', body: 'Type the title of something you’ve been putting off above. That’s your first step.' }

  return (
    <div className="container dashboard">
      <div className="dash-head">
        <div>
          <h1 className="dash-title">Your assignments</h1>
          <p className="muted">One small step at a time. Add an assignment, then break it into steps.</p>
        </div>
        <dl className="stats">
          <div><dt>Pending</dt><dd>{counts.pending}</dd></div>
          <div><dt>Steps done</dt><dd>{stats.done}/{stats.total}</dd></div>
          <div><dt>Due in 7 days</dt><dd>{stats.dueThisWeek}</dd></div>
        </dl>
      </div>

      <form className="card new-assignment" onSubmit={handleCreate} aria-label="Add an assignment">
        <label htmlFor="core-input" className="new-label">What do you need to get done?</label>
        <div className="new-row">
          <input
            id="core-input"
            data-testid="core-input"
            type="text"
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Marketing essay on brand loyalty"
            autoComplete="off"
          />
          <button type="submit" data-testid="core-submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add assignment'}
          </button>
        </div>
        <button
          type="button"
          className="link-btn"
          onClick={() => setShowDetails((s) => !s)}
          aria-expanded={showDetails}
          aria-controls="new-details"
        >
          {showDetails ? 'Hide details' : '+ Add course, deadline, type, priority or notes (optional)'}
        </button>
        {showDetails && (
          <div id="new-details">
            <AssignmentFields idPrefix="new" values={details} onChange={setDetails} />
          </div>
        )}
        {formError && <p className="alert alert-error" role="alert">{formError}</p>}
      </form>

      {error && (
        <div className="alert alert-error alert-row" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Dashboard view">
        <button type="button" role="tab" aria-selected={view === 'list'} className={`tab${view === 'list' ? ' is-active' : ''}`} onClick={() => setView('list')}>
          List
        </button>
        <button type="button" role="tab" aria-selected={view === 'calendar'} className={`tab${view === 'calendar' ? ' is-active' : ''}`} onClick={() => setView('calendar')}>
          Calendar
        </button>
      </div>

      {view === 'list' ? (
        <>
          <div className="list-toolbar">
            <div className="filter-chips" role="group" aria-label="Show assignments">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`chip${filter === f.key ? ' is-active' : ''}`}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} <span className="chip-count">{counts[f.key]}</span>
                </button>
              ))}
            </div>
            <div className="sort-control">
              <label htmlFor="sort-by" className="small muted">Sort by</label>
              <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                <option value="deadline">Deadline</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>

          <section aria-label="Assignment list" className="assignment-list">
            {loading && assignments.length === 0 ? (
              <p className="muted">Loading your assignments…</p>
            ) : visible.length === 0 ? (
              <div className="card empty">
                <h2>{emptyMessage.title}</h2>
                <p className="muted">{emptyMessage.body}</p>
              </div>
            ) : (
              visible.map((a) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  subtasks={stepsByAssignment.get(a.id) ?? []}
                  defaultOpen={a.id === justCreated}
                  onUpdate={updateAssignment}
                  onDelete={deleteAssignment}
                  onAddSubtask={addSubtask}
                  onUpdateSubtask={updateSubtask}
                  onDeleteSubtask={deleteSubtask}
                  onMoveSubtask={moveSubtask}
                />
              ))
            )}
          </section>
        </>
      ) : (
        <Calendar assignments={assignments} subtasks={subtasks} />
      )}
    </div>
  )
}
