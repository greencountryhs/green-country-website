'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteEmployeeNote, updateEmployeeNote } from '@/lib/notes'

export function PrivateNoteItem({
    noteId,
    initialBody,
    createdAt
}: {
    noteId: string
    initialBody: string
    createdAt: string
}) {
    const router = useRouter()
    const [body, setBody] = useState(initialBody)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    async function handleSave() {
        setIsSaving(true)
        const result = await updateEmployeeNote(noteId, body)
        setIsSaving(false)
        if (!result?.error) {
            router.refresh()
        }
    }

    async function handleDelete() {
        const confirmed = window.confirm('Delete this note?')
        if (!confirmed) return

        setIsDeleting(true)
        const result = await deleteEmployeeNote(noteId)
        setIsDeleting(false)
        if (!result?.error) {
            router.refresh()
        }
    }

    return (
        <div style={{ padding: '0.75rem', background: '#f3f4f6', borderRadius: '4px', fontSize: '0.9rem' }}>
            <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', resize: 'vertical', background: '#fff' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {new Date(createdAt).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || isDeleting}
                        className="link small"
                        style={{ padding: 0 }}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isSaving || isDeleting}
                        className="link small"
                        style={{ padding: 0, color: '#b91c1c' }}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    )
}
