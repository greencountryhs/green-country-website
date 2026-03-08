'use client'

import { useRef } from 'react'
import { createEmployeeNote } from '@/lib/notes'
import { SubmitButton } from '@/components/submit-button'

export function CreateNoteForm({ employeeId }: { employeeId: string }) {
    const formRef = useRef<HTMLFormElement>(null)

    async function action(formData: FormData) {
        const content = formData.get('content') as string
        if (content.trim()) {
            await createEmployeeNote(employeeId, content)
            formRef.current?.reset()
        }
    }

    return (
        <form ref={formRef} action={action} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
                type="text"
                name="content"
                placeholder="Reminders, measurements..."
                required
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
            />
            <SubmitButton text="Add" />
        </form>
    )
}
