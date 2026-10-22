'use client'

import { ASSESSMENT_LABELS, ASSESSMENT_TYPES, type AssessmentType } from '@/lib/types'

export type DetailValues = {
  course: string
  deadline: string
  assessment_type: AssessmentType
  notes: string
}

export const EMPTY_DETAILS: DetailValues = { course: '', deadline: '', assessment_type: 'assignment', notes: '' }

// The optional fields shared by the "new assignment" and "edit assignment" forms.
export default function AssignmentFields({
  idPrefix,
  values,
  onChange,
}: {
  idPrefix: string
  values: DetailValues
  onChange: (next: DetailValues) => void
}) {
  return (
    <div className="details-grid">
      <div className="field">
        <label htmlFor={`${idPrefix}-course`}>Course <span className="optional">optional</span></label>
        <input
          id={`${idPrefix}-course`}
          type="text"
          maxLength={120}
          value={values.course}
          onChange={(e) => onChange({ ...values, course: e.target.value })}
          placeholder="e.g. Microeconomics"
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-deadline`}>Deadline <span className="optional">optional</span></label>
        <input
          id={`${idPrefix}-deadline`}
          type="date"
          value={values.deadline}
          onChange={(e) => onChange({ ...values, deadline: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-type`}>Type</label>
        <select
          id={`${idPrefix}-type`}
          value={values.assessment_type}
          onChange={(e) => onChange({ ...values, assessment_type: e.target.value as AssessmentType })}
        >
          {ASSESSMENT_TYPES.map((t) => (
            <option key={t} value={t}>{ASSESSMENT_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div className="field field-wide">
        <label htmlFor={`${idPrefix}-notes`}>Notes <span className="optional">optional</span></label>
        <textarea
          id={`${idPrefix}-notes`}
          rows={3}
          maxLength={5000}
          value={values.notes}
          onChange={(e) => onChange({ ...values, notes: e.target.value })}
          placeholder="Rubric links, word count, group members…"
        />
      </div>
    </div>
  )
}
