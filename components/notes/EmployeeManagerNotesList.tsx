'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deleteManagerNoteForEmployee } from '@/lib/notes'

const PAGE_SIZE = 5

export type EmployeeManagerNoteSerializable = {
    read_at: string | null
    manager_notes: {
        id: string
        body: string
        priority: string
        created_at: string
        created_by: string
        manager_note_replies: { id: string; body: string; created_at: string }[]
    } | null
}

function formatNoteDateTime(value: string | null | undefined) {
    return value
        ? new Date(value).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
          })
        : 'N/A'
}

export function EmployeeManagerNotesList({
    notes,
    employeeId
}: {
    notes: EmployeeManagerNoteSerializable[]
    employeeId: string
}) {
    const router = useRouter()
    const [expanded, setExpanded] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const valid = notes.filter((n) => n.manager_notes)
    const visible = expanded ? valid : valid.slice(0, PAGE_SIZE)
    const hasMore = valid.length > PAGE_SIZE

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {visible.map((n) => {
                    const mn = n.manager_notes!
                    return (
                        <div
                            key={mn.id}
                            style={{
                                background: '#f8fafc',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border)'
                            }}
                        >
                            <p style={{ margin: '0 0 0.5rem 0' }}>{mn.body}</p>
                            {Array.isArray(mn.manager_note_replies) && mn.manager_note_replies.length > 0 && (
                                <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {mn.manager_note_replies.map((reply) => (
                                        <div
                                            key={reply.id}
                                            style={{
                                                background: '#ffffff',
                                                border: '1px solid var(--border)',
                                                borderRadius: '4px',
                                                padding: '0.5rem'
                                            }}
                                        >
                                            <div style={{ fontSize: '0.85rem' }}>{reply.body}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                                                Reply: {formatNoteDateTime(reply.created_at)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.75rem',
                                    color: 'var(--muted)'
                                }}
                            >
                                <span>Sent: {formatNoteDateTime(mn.created_at)}</span>
                                <span>
                                    {n.read_at ? (
                                        <span style={{ color: '#166534' }}>Read ({formatNoteDateTime(n.read_at)})</span>
                                    ) : (
                                        'Unread'
                                    )}
                                </span>
                                <button
                                    type="button"
                                    className="link small"
                                    style={{ fontSize: '0.75rem', color: '#991b1b', marginLeft: 'auto' }}
                                    disabled={deletingId !== null}
                                    onClick={async () => {
                                        if (
                                            !confirm(
                                                'Delete this manager note for this crew member? Replies will be removed too.'
                                            )
                                        ) {
                                            return
                                        }
                                        setDeletingId(mn.id)
                                        try {
                                            const res = await deleteManagerNoteForEmployee(mn.id, employeeId)
                                            if (res?.error) {
                                                alert(res.error.message || 'Could not delete note')
                                                return
                                            }
                                            router.refresh()
                                        } finally {
                                            setDeletingId(null)
                                        }
                                    }}
                                >
                                    {deletingId === mn.id ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
            {hasMore && (
                <button
                    type="button"
                    className="link small"
                    style={{ marginTop: '0.75rem', display: 'inline-block' }}
                    onClick={() => setExpanded((e) => !e)}
                >
                    {expanded ? 'Show less' : `Show more (${valid.length - PAGE_SIZE} older)`}
                </button>
            )}
        </>
    )
}
