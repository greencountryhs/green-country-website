'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFormState, useFormStatus } from 'react-dom'
import {
    correctTimeEntryAction,
    createManualTimeEntryAction,
    deleteTimeEntryAction
} from './actions'
import { errorBannerStyle, initialReportFormState } from './formState'

function FormError({ message }: { message: string | null }) {
    if (!message) return null
    return (
        <div className="ops-callout ops-callout--error" style={errorBannerStyle} role="alert">
            {message}
        </div>
    )
}

function SuccessBanner({ message }: { message: string }) {
    return (
        <div className="ops-callout ops-callout--success" style={{ marginBottom: '0.75rem' }}>
            {message}
        </div>
    )
}

function useRefreshOnSuccess(success: boolean) {
    const router = useRouter()
    useEffect(() => {
        if (success) {
            router.refresh()
        }
    }, [success, router])
}

export function EditTimeEntryForm({ entry, defaultClockIn, defaultClockOut }: { entry: any, defaultClockIn: string, defaultClockOut: string }) {
    const [state, formAction] = useFormState(correctTimeEntryAction, initialReportFormState)
    useRefreshOnSuccess(state.success)

    return (
        <details className="reports-edit-details">
            <summary className="ops-btn ops-btn--secondary reports-edit-summary">
                Edit / Delete
            </summary>
            <div style={{ marginTop: '0.75rem', minWidth: 260 }}>
                <form action={formAction} className="reports-inline-form ops-card ops-card--flat">
                    <FormError message={state.error} />
                    {state.success && <SuccessBanner message="Entry updated." />}

                    <input type="hidden" name="entryId" value={entry.id} />

                    <label className="reports-field-label">Clock in (local)</label>
                    <input type="datetime-local" name="clockIn" defaultValue={defaultClockIn} required className="reports-field-input" />

                    <label className="reports-field-label">Clock out (local)</label>
                    <input type="datetime-local" name="clockOut" defaultValue={defaultClockOut} className="reports-field-input" />

                    <label className="reports-field-label">Correction note</label>
                    <input type="text" name="reason" placeholder="Reason for edit…" required className="reports-field-input" />

                    <SubmitButton text="Save edit" variant="primary" />
                </form>

                <form
                    action={deleteTimeEntryAction}
                    onSubmit={(e) => {
                        if (!confirm('Permanently delete this time entry?')) {
                            e.preventDefault()
                        }
                    }}
                    className="reports-inline-form"
                    style={{ marginTop: '0.75rem', background: '#fdf4f4', borderColor: '#e8b4b4' }}
                >
                    <input type="hidden" name="entryId" value={entry.id} />
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#9b2c2c', fontSize: '0.95rem' }}>Delete entry</h4>
                    <label className="reports-field-label" style={{ color: '#7f1d1d' }}>Optional audit note</label>
                    <input type="text" name="reason" placeholder="Reason for deletion…" className="reports-field-input" />
                    <DeleteSubmitButton />
                </form>
            </div>
        </details>
    )
}

function DeleteSubmitButton() {
    const { pending } = useFormStatus()
    return (
        <button type="submit" disabled={pending} className="ops-btn ops-btn--destructive" style={{ marginTop: '0.5rem' }}>
            {pending ? 'Deleting…' : 'Delete permanently'}
        </button>
    )
}

export function CreateManualEntryForm({ employees }: { employees: { id: string, name: string }[] }) {
    const [state, formAction] = useFormState(createManualTimeEntryAction, initialReportFormState)
    useRefreshOnSuccess(state.success)

    return (
        <form action={formAction} className="reports-manual-form">
            <FormError message={state.error} />
            {state.success && <SuccessBanner message="Manual time entry created." />}

            <div className="reports-manual-grid">
                <div>
                    <label className="reports-field-label">Crew member</label>
                    <select name="employeeId" required className="reports-field-input">
                        <option value="">Select…</option>
                        {employees.map((e) => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="reports-field-label">Clock in (local)</label>
                    <input type="datetime-local" name="clockIn" required className="reports-field-input" />
                </div>

                <div>
                    <label className="reports-field-label">Clock out (local)</label>
                    <input type="datetime-local" name="clockOut" required className="reports-field-input" />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="reports-field-label">Note (required)</label>
                    <input type="text" name="reason" placeholder="Why this entry is being added…" required className="reports-field-input" />
                </div>
            </div>

            <SubmitButton text="Add manual time entry" variant="primary" />
        </form>
    )
}

function SubmitButton({ text, variant }: { text: string; variant: 'primary' | 'secondary' }) {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending}
            className={`ops-btn ops-btn--${variant}`}
            style={{ marginTop: '0.75rem' }}
        >
            {pending ? 'Saving…' : text}
        </button>
    )
}
