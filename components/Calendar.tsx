'use client'

import { useMemo, useState } from 'react'
import { DATE_LOCALE, formatLong, formatShort, toKey, todayKey } from '@/lib/dates'
import { ASSESSMENT_LABELS, type AssessmentType, type Assignment, type Subtask } from '@/lib/types'

type CalEvent = {
  id: string
  date: string
  kind: 'deadline' | 'step'
  title: string
  parent: string | null
  type: AssessmentType
  completed: boolean
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Calendar({ assignments, subtasks }: { assignments: Assignment[]; subtasks: Subtask[] }) {
  const today = todayKey()
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [selected, setSelected] = useState(today)

  // Built from the same saved assignments and subtasks shown in the list view.
  const byDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    const push = (e: CalEvent) => {
      const list = map.get(e.date)
      if (list) list.push(e)
      else map.set(e.date, [e])
    }
    const parents = new Map(assignments.map((a) => [a.id, a]))
    for (const a of assignments) {
      if (a.deadline) {
        const steps = subtasks.filter((s) => s.assignment_id === a.id)
        const complete = steps.length > 0 && steps.every((s) => s.completed)
        push({ id: `a-${a.id}`, date: a.deadline, kind: 'deadline', title: a.title, parent: a.course, type: a.assessment_type, completed: complete })
      }
    }
    for (const s of subtasks) {
      const parent = parents.get(s.assignment_id)
      if (s.due_date && parent) {
        push({ id: `s-${s.id}`, date: s.due_date, kind: 'step', title: s.title, parent: parent.title, type: parent.assessment_type, completed: s.completed })
      }
    }
    for (const list of map.values()) list.sort((x, y) => (x.kind === y.kind ? 0 : x.kind === 'deadline' ? -1 : 1))
    return map
  }, [assignments, subtasks])

  const cells = useMemo(() => {
    const y = cursor.getFullYear()
    const m = cursor.getMonth()
    const offset = (new Date(y, m, 1).getDay() + 6) % 7
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const count = Math.ceil((offset + daysInMonth) / 7) * 7
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(y, m, 1 - offset + i)
      return { key: toKey(d), day: d.getDate(), inMonth: d.getMonth() === m }
    })
  }, [cursor])

  const upcoming = useMemo(() => {
    return [...byDate.entries()]
      .filter(([date]) => date >= today)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .flatMap(([, events]) => events)
      .filter((e) => !e.completed)
      .slice(0, 8)
  }, [byDate, today])

  const monthLabel = cursor.toLocaleDateString(DATE_LOCALE, { month: 'long', year: 'numeric' })
  const selectedEvents = byDate.get(selected) ?? []

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  }

  function goToday() {
    const n = new Date()
    setCursor(new Date(n.getFullYear(), n.getMonth(), 1))
    setSelected(today)
  }

  return (
    <section className="calendar-layout" aria-label="Calendar">
      <div className="card calendar">
        <div className="cal-toolbar">
          <h2 className="cal-month">{monthLabel}</h2>
          <div className="cal-nav">
            <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 5l-5 5 5 5z" /></svg>
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={goToday}>Today</button>
            <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 5l5 5-5 5z" /></svg>
            </button>
          </div>
        </div>

        <div className="cal-grid" role="grid" aria-label={monthLabel}>
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-weekday" role="columnheader">{w}</div>
          ))}
          {cells.map((c) => {
            const events = byDate.get(c.key) ?? []
            const cls = ['cal-cell', !c.inMonth && 'is-out', c.key === today && 'is-today', c.key === selected && 'is-selected']
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={c.key}
                type="button"
                role="gridcell"
                className={cls}
                onClick={() => setSelected(c.key)}
                aria-pressed={c.key === selected}
                aria-label={`${formatLong(c.key)}${events.length ? `, ${events.length} item${events.length > 1 ? 's' : ''}` : ''}`}
              >
                <span className="cal-day">{c.day}</span>
                {events.length > 0 && (
                  <>
                    <span className="cal-chips">
                      {events.slice(0, 2).map((e) => (
                        <span key={e.id} className={`cal-chip chip-${e.kind} chip-${e.type}${e.completed ? ' is-done' : ''}`}>
                          {e.title}
                        </span>
                      ))}
                      {events.length > 2 && <span className="cal-more">+{events.length - 2} more</span>}
                    </span>
                    <span className="cal-dots" aria-hidden="true">
                      {events.slice(0, 3).map((e) => (
                        <span key={e.id} className={`cal-dot chip-${e.kind} chip-${e.type}`} />
                      ))}
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>

        <div className="cal-legend small muted">
          <span><span className="legend-swatch legend-deadline" /> Assignment deadline</span>
          <span><span className="legend-swatch legend-step" /> Step due</span>
        </div>
      </div>

      <aside className="cal-side">
        <div className="card">
          <h3 className="side-title">{formatLong(selected)}</h3>
          {selectedEvents.length ? (
            <ul className="agenda">
              {selectedEvents.map((e) => (
                <AgendaItem key={e.id} event={e} />
              ))}
            </ul>
          ) : (
            <p className="muted small">Nothing due this day.</p>
          )}
        </div>

        <div className="card">
          <h3 className="side-title">Coming up</h3>
          {upcoming.length ? (
            <ul className="agenda">
              {upcoming.map((e) => (
                <AgendaItem key={e.id} event={e} showDate />
              ))}
            </ul>
          ) : (
            <p className="muted small">Add deadlines to assignments or steps and they’ll appear here.</p>
          )}
        </div>

        <p className="muted small">
          This calendar shows the deadlines saved in FirstStep. Syncing with Google Calendar or other calendars is planned but not available yet.
        </p>
      </aside>
    </section>
  )
}

function AgendaItem({ event: e, showDate = false }: { event: CalEvent; showDate?: boolean }) {
  return (
    <li className={`agenda-item${e.completed ? ' is-done' : ''}`}>
      <span className={`agenda-bar chip-${e.kind} chip-${e.type}`} aria-hidden="true" />
      <div>
        <div className="agenda-title">{e.title}</div>
        <div className="agenda-sub small muted">
          {showDate && `${formatShort(e.date)} · `}
          {e.kind === 'deadline'
            ? `${ASSESSMENT_LABELS[e.type]} deadline${e.parent ? ` · ${e.parent}` : ''}`
            : `Step of ${e.parent}`}
          {e.completed && ' · done'}
        </div>
      </div>
    </li>
  )
}

