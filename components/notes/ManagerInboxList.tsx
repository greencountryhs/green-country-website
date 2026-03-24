'use client'

import { markNoteRead } from '@/lib/notes'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createManagerNoteReply } from '@/lib/notes'

const PAGE_SIZE = 5

export function ManagerInboxList({ notes, employeeId }: { notes: any[], employeeId: string }) {
    const router = useRouter()
    const [expanded, setExpanded] = useState(false)
    const [drafts, setDrafts] = useState<Record<string, string>>({})
    const [replying, setReplying] = useState<Record<string, boolean>>({})
    const formatNoteDateTime = (value: string | null | undefined) =>
        value
            ? new Date(value).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            })
            : 'N/A'

    if (notes.length === 0) {
        return <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No manager notes at this time.</p>
    }

    const hasMore = notes.length > PAGE_SIZE
    const visible = expanded ? notes : notes.slice(0, PAGE_SIZE)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {visible.map((note) => (
                <div
                    key={note.id}
                    style={{
                        padding: '1rem',
                        background: '#ffffff',
                        borderRadius: '6px',
                        borderLeft: note.isRead ? '4px solid #e5e7eb' : '4px solid var(--primary)',
                        opacity: note.isRead ? 0.7 : 1,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: note.priority === 'urgent' ? '#dc2626' : 'var(--muted)' }}>
                            {note.priority}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {formatNoteDateTime(note.created_at)}
                        </span>
                    </div>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem' }}>{note.body ?? note.content}</p>

                    {Array.isArray(note.manager_note_replies) && note.manager_note_replies.length > 0 && (
                        <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {note.manager_note_replies.map((reply: any) => (
                                <div key={reply.id} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.5rem' }}>
                                    <div style={{ fontSize: '0.85rem' }}>{reply.body}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                                        Replied {formatNoteDateTime(reply.created_at)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <textarea
                            rows={2}
                            placeholder="Reply to this note..."
                            value={drafts[note.id] || ''}
                            onChange={(e) => setDrafts(prev => ({ ...prev, [note.id]: e.target.value }))}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', resize: 'vertical', background: '#fff' }}
                        />
                        <button
                            type="button"
                            className="cta secondary"
                            disabled={!!replying[note.id]}
                            onClick={async () => {
                                const draft = (drafts[note.id] || '').trim()
                                if (!draft) return
                                setReplying(prev => ({ ...prev, [note.id]: true }))
                                const result = await createManagerNoteReply(note.id, draft)
                                setReplying(prev => ({ ...prev, [note.id]: false }))
                                if (!result?.error) {
                                    setDrafts(prev => ({ ...prev, [note.id]: '' }))
                                    router.refresh()
                                }
                            }}
                            style={{ minWidth: '90px' }}
                        >
                            {replying[note.id] ? 'Replying...' : 'Reply'}
                        </button>
                    </div>

                    {!note.isRead && (
                        <button
                            onClick={async () => {
                                await markNoteRead(note.id, employeeId)
                                router.refresh()
                            }}
                            className="link small"
                            style={{ fontSize: '0.8rem', padding: 0 }}
                        >
                            Mark as Read
                        </button>
                    )}
                </div>
            ))}
            {hasMore && (
                <button
                    type="button"
                    className="link small"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => setExpanded((e) => !e)}
                >
                    {expanded ? 'Show less' : `Show more (${notes.length - PAGE_SIZE} older)`}
                </button>
            )}
        </div>
    )
}
