'use client'

import { useFormStatus } from 'react-dom'
import { correctTimeEntryAction, createManualTimeEntryAction } from './actions'

export function EditTimeEntryForm({ entry, defaultClockIn, defaultClockOut }: { entry: any, defaultClockIn: string, defaultClockOut: string }) {
    return (
        <details>
            <summary className="link small" style={{ cursor: 'pointer' }}>Edit</summary>
            <form action={correctTimeEntryAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', background: 'var(--surface)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <input type="hidden" name="entryId" value={entry.id} />

                <label style={{ fontSize: '0.8rem' }}>Clock In (Local Time)</label>
                <input type="datetime-local" name="clockIn" defaultValue={defaultClockIn} required />

                <label style={{ fontSize: '0.8rem' }}>Clock Out (Local Time)</label>
                <input type="datetime-local" name="clockOut" defaultValue={defaultClockOut} />

                <label style={{ fontSize: '0.8rem' }}>Correction Note</label>
                <input type="text" name="reason" placeholder="Reason for edit..." required />

                <SubmitButton text="Save Edit" />
            </form>
        </details>
    )
}

export function CreateManualEntryForm({ employees }: { employees: { id: string, name: string }[] }) {
    return (
        <details>
            <summary className="cta secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>Add Manual Entry</summary>
            <form action={createManualTimeEntryAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', background: 'var(--surface)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border)', maxWidth: '400px' }}>
                <h4 style={{ margin: 0 }}>Create Manual Entry</h4>

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
