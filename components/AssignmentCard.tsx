'use client'

import { useState, type FormEvent } from 'react'
import AssignmentFields, { type DetailValues } from './AssignmentFields'
import SubtaskList from './SubtaskList'
import { relativeDue } from '@/lib/dates'
import { ASSESSMENT_LABELS, type Assignment, type AssignmentPatch, type Subtask, type SubtaskPatch } from '@/lib/types'

type Props = {
  assignment: Assignment
  subtasks: Subtask[]
  defaultOpen: boolean
  onUpdate: (id: string, patch: AssignmentPatch) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onAddSubtask: (assignmentId: string, title: string, dueDate: string | null) => Promise<boolean>
  onUpdateSubtask: (id: string, patch: SubtaskPatch) => Promise<boolean>
  onDeleteSubtask: (id: string) => Promise<boolean>
  onMoveSubtask: (id: string, direction: -1 | 1) => Promise<void>
}

export default function AssignmentCard(props: Props) {
  const { assignment: a, subtasks } = props
  const [open, setOpen] = useState(props.defaultOpen)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(a.title)
  const [details, setDetails] = useState<DetailValues>(toDetails(a))
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const done = subtasks.filter((s) => s.completed).length
  const total = subtasks.length
  const pct = total ? Math.round((done / total) * 100) : 0
  const next = subtasks.find((s) => !s.completed)
  const allDone = total > 0 && done === total
  const due = a.deadline ? relativeDue(a.deadline) : null

  function startEdit() {
    setTitle(a.title)
    setDetails(toDetails(a))
    setEditError(null)
    setEditing(true)
  }

  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const t = title.trim()
    if (!t) {
      setEditError('The title can’t be empty.')
      return
    }
    setSaving(true)
    const ok = await props.onUpdate(a.id, {
      title: t,
      course: details.course.trim() || null,
      deadline: details.deadline || null,
      assessment_type: details.assessment_type,
      notes: details.notes.trim() || null,
    })
    setSaving(false)
    if (ok) setEditing(false)
  }

  return (
    <article className={`card assignment type-${a.assessment_type}${allDone ? ' is-complete' : ''}`}>
      <div className="assignment-head">
        <div className="assignment-meta">
          <span className={`badge badge-${a.assessment_type}`}>{ASSESSMENT_LABELS[a.assessment_type]}</span>
          {a.course && <span className="meta-course">{a.course}</span>}
          {due && <span className={`pill pill-${allDone ? 'later' : due.tone}`}>{due.text}</span>}
        </div>
        <div className="assignment-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={editing ? () => setEditing(false) : startEdit}>
            {editing ? 'Close' : 'Edit'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-danger-text"
            onClick={() => {
              if (window.confirm(`Delete “${a.title}” and all its steps? This can’t be undone.`)) props.onDelete(a.id)
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <h3 className="assignment-title" data-testid="core-item">{a.title}</h3>

      {editing && (
        <form className="edit-panel stack" onSubmit={saveEdit}>
          <div className="field">
            <label htmlFor={`edit-title-${a.id}`}>Title</label>
            <input id={`edit-title-${a.id}`} type="text" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <AssignmentFields idPrefix={`edit-${a.id}`} values={details} onChange={setDetails} />
          {editError && <p className="alert alert-error" role="alert">{editError}</p>}
          <div className="row-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}

      {!editing && a.notes && <p className="assignment-notes">{a.notes}</p>}

      <div className="progress-row">
        <div
          className="progress"
          role="progressbar"
          aria-label={`Progress for ${a.title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="progress-label">{total ? `${done}/${total} steps · ${pct}%` : 'No steps yet'}</span>
      </div>

      <div className={`next-step${allDone ? ' next-step-done' : ''}`}>
        {allDone ? (
          <span><strong>All steps done.</strong> Nice work — time to submit.</span>
        ) : next ? (
          <span><span className="next-label">Next step</span> {next.title}</span>
        ) : (
          <span><span className="next-label">Get started</span> Break this into small steps below.</span>
        )}
      </div>

      <button type="button" className="toggle-steps" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? 'Hide steps' : `Show steps${total ? ` (${total})` : ''}`}
        <svg viewBox="0 0 20 20" aria-hidden="true" className={open ? 'rot' : ''}><path d="M5 8l5 5 5-5z" /></svg>
      </button>

      {open && (
        <SubtaskList
          assignmentId={a.id}
          subtasks={subtasks}
          onAdd={props.onAddSubtask}
          onUpdate={props.onUpdateSubtask}
          onDelete={props.onDeleteSubtask}
          onMove={props.onMoveSubtask}
        />
      )}
    </article>
  )
}

function toDetails(a: Assignment): DetailValues {
  return {
    course: a.course ?? '',
    deadline: a.deadline ?? '',
    assessment_type: a.assessment_type,
    notes: a.notes ?? '',
  }
}
