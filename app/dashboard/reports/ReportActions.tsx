'use client'

import { useFormState, useFormStatus } from 'react-dom'
import {
    correctTimeEntryAction,
    createManualTimeEntryAction,
    deleteTimeEntryAction,
    errorBannerStyle,
    initialReportFormState
} from './actions'

function FormError({ message }: { message: string | null }) {
    if (!message) return null
    return (
        <div className="callout ops-callout ops-callout--error" style={errorBannerStyle} role="alert">
            {message}
        </div>
    )
}

export function EditTimeEntryForm({ entry, defaultClockIn, defaultClockOut }: { entry: any, defaultClockIn: string, defaultClockOut: string }) {
    const [state, formAction] = useFormState(correctTimeEntryAction, initialReportFormState)

    return (
        <details>
            <summary className="link small" style={{ cursor: 'pointer' }}>Edit</summary>
            <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', background: 'var(--surface)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <FormError message={state.error} />
                {state.success && (
                    <div className="callout" style={{ background: '#ecfdf5', color: '#166534', borderColor: '#bbf7d0', marginBottom: '0.75rem' }}>
                        Entry updated.
                    </div>
                )}

                <input type="hidden" name="entryId" value={entry.id} />

                <label style={{ fontSize: '0.8rem' }}>Clock In (Local Time)</label>
                <input type="datetime-local" name="clockIn" defaultValue={defaultClockIn} required />

                <label style={{ fontSize: '0.8rem' }}>Clock Out (Local Time)</label>
                <input type="datetime-local" name="clockOut" defaultValue={defaultClockOut} />

                <label style={{ fontSize: '0.8rem' }}>Correction Note</label>
                <input type="text" name="reason" placeholder="Reason for edit..." required />

                <SubmitButton text="Save Edit" />
            </form>

            <form 
                action={deleteTimeEntryAction} 
                onSubmit={(e) => { 
                    if(!confirm("Are you sure you want to permanently delete this time entry?")) { 
                        e.preventDefault() 
                    } 
                }} 
                style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', background: '#fef2f2', padding: '1rem', borderRadius: '4px', border: '1px solid #fecaca' }}
            >
                <input type="hidden" name="entryId" value={entry.id} />
                <h4 style={{ margin: 0, color: '#dc2626' }}>Delete Entry</h4>
                <label style={{ fontSize: '0.8rem', color: '#991b1b' }}>Optional Audit Note</label>
                <input type="text" name="reason" placeholder="Reason for deletion..." />
                
                <DeleteSubmitButton />
            </form>
        </details>
    )
}

function DeleteSubmitButton() {
    const { pending } = useFormStatus()
    return (
        <button type="submit" disabled={pending} className="cta" style={{ padding: '0.5rem', background: '#dc2626', color: 'white' }}>
            {pending ? 'Deleting...' : 'Delete Permanently'}
        </button>
    )
}

export function CreateManualEntryForm({ employees }: { employees: { id: string, name: string }[] }) {
    const [state, formAction] = useFormState(createManualTimeEntryAction, initialReportFormState)

    return (
        <details>
            <summary className="cta secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>Add Manual Entry</summary>
            <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', background: 'var(--surface)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border)', maxWidth: '400px' }}>
                <h4 style={{ margin: 0 }}>Create Manual Entry</h4>
                <FormError message={state.error} />
                {state.success && (
                    <div className="callout" style={{ background: '#ecfdf5', color: '#166534', borderColor: '#bbf7d0', marginBottom: '0.75rem' }}>
                        Entry created.
                    </div>
                )}

                <label style={{ fontSize: '0.8rem' }}>Crew Member</label>
                <select name="employeeId" required>
                    <option value="">Select...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>

                <label style={{ fontSize: '0.8rem' }}>Clock In (Local Time)</label>
                <input type="datetime-local" name="clockIn" required />

                <label style={{ fontSize: '0.8rem' }}>Clock Out (Local Time)</label>
                <input type="datetime-local" name="clockOut" required />

                <label style={{ fontSize: '0.8rem' }}>Note</label>
                <input type="text" name="reason" placeholder="Reason..." required />

                <SubmitButton text="Create Entry" />
            </form>
        </details>
    )
}

function SubmitButton({ text }: { text: string }) {
    const { pending } = useFormStatus()
    return (
        <button type="submit" disabled={pending} className="cta primary" style={{ padding: '0.5rem' }}>
            {pending ? 'Saving...' : text}
        </button>
    )
}
