'use client'

import { useState, type FormEvent } from 'react'
import { formatShort, relativeDue } from '@/lib/dates'
import type { Subtask, SubtaskPatch } from '@/lib/types'

type Props = {
  assignmentId: string
  subtasks: Subtask[]
  onAdd: (assignmentId: string, title: string, dueDate: string | null) => Promise<boolean>
  onUpdate: (id: string, patch: SubtaskPatch) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onMove: (id: string, direction: -1 | 1) => Promise<void>
}

export default function SubtaskList({ assignmentId, subtasks, onAdd, onUpdate, onDelete, onMove }: Props) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    setAdding(true)
    const ok = await onAdd(assignmentId, t, due || null)
    setAdding(false)
    if (ok) {
      setTitle('')
      setDue('')
    }
  }

  return (
    <div className="subtasks">
      {subtasks.length > 0 ? (
        <ol className="subtask-list">
          {subtasks.map((s, i) => (
            <SubtaskRow
              key={s.id}
              subtask={s}
              isFirst={i === 0}
              isLast={i === subtasks.length - 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))}
        </ol>
      ) : (
        <p className="muted small">No steps yet. What’s the smallest thing you could do first? Try “Read the brief” or “Find 3 sources”.</p>
      )}

      <form className="subtask-add" onSubmit={handleAdd}>
        <label htmlFor={`new-step-${assignmentId}`} className="sr-only">New step</label>
        <input
          id={`new-step-${assignmentId}`}
          type="text"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a step…"
        />
        <label htmlFor={`new-step-due-${assignmentId}`} className="sr-only">Step due date (optional)</label>
        <input
          id={`new-step-due-${assignmentId}`}
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="date-compact"
        />
        <button type="submit" className="btn btn-secondary btn-sm" disabled={adding || !title.trim()}>
          {adding ? 'Adding…' : 'Add step'}
        </button>
      </form>
    </div>
  )
}

function SubtaskRow({
  subtask,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMove,
}: {
  subtask: Subtask
  isFirst: boolean
  isLast: boolean
  onUpdate: Props['onUpdate']
  onDelete: Props['onDelete']
  onMove: Props['onMove']
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(subtask.title)
  const [due, setDue] = useState(subtask.due_date ?? '')
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setTitle(subtask.title)
    setDue(subtask.due_date ?? '')
    setEditing(true)
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    setSaving(true)
    const ok = await onUpdate(subtask.id, { title: t, due_date: due || null })
    setSaving(false)
    if (ok) setEditing(false)
  }

  if (editing) {
    return (
      <li className="subtask subtask-editing">
        <form className="subtask-edit" onSubmit={save}>
          <label htmlFor={`edit-step-${subtask.id}`} className="sr-only">Step title</label>
          <input id={`edit-step-${subtask.id}`} type="text" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <label htmlFor={`edit-step-due-${subtask.id}`} className="sr-only">Step due date</label>
          <input id={`edit-step-due-${subtask.id}`} type="date" value={due} onChange={(e) => setDue(e.target.value)} className="date-compact" />
          <div className="row-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !title.trim()}>Save</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </li>
    )
  }

  const due_ = subtask.due_date ? relativeDue(subtask.due_date) : null

  return (
    <li className={`subtask${subtask.completed ? ' is-done' : ''}`}>
      <label className="subtask-check">
        <input
          type="checkbox"
          checked={subtask.completed}
          onChange={(e) => onUpdate(subtask.id, { completed: e.target.checked })}
        />
        <span className="subtask-title">{subtask.title}</span>
      </label>
      {subtask.due_date && due_ && (
        <span className={`pill pill-${subtask.completed ? 'later' : due_.tone}`} title={formatShort(subtask.due_date)}>
          {formatShort(subtask.due_date)}
        </span>
      )}
      <div className="icon-actions">
        <button type="button" className="icon-btn" onClick={() => onMove(subtask.id, -1)} disabled={isFirst} aria-label={`Move “${subtask.title}” up`}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5l-5 6h10z" /></svg>
        </button>
        <button type="button" className="icon-btn" onClick={() => onMove(subtask.id, 1)} disabled={isLast} aria-label={`Move “${subtask.title}” down`}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 15l5-6H5z" /></svg>
        </button>
        <button type="button" className="icon-btn" onClick={startEdit} aria-label={`Edit “${subtask.title}”`}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5zm11.7-6.8a.7.7 0 000-1l-1.4-1.4a.7.7 0 00-1 0l-1.2 1.2 2.5 2.5 1.1-1.3z" /></svg>
        </button>
        <button
          type="button"
          className="icon-btn icon-btn-danger"
          onClick={() => {
            if (window.confirm(`Delete the step “${subtask.title}”?`)) onDelete(subtask.id)
          }}
          aria-label={`Delete “${subtask.title}”`}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3h6l1 1h3v2H3V4h3l1-1zm-2 4h10l-.8 9.2A2 2 0 0112.2 18H7.8a2 2 0 01-2-1.8L5 7z" /></svg>
        </button>
      </div>
    </li>
  )
}
