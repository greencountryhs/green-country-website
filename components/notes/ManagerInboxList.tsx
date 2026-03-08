'use client'

import { markNoteRead } from '@/lib/notes'

export function ManagerInboxList({ notes, employeeId }: { notes: any[], employeeId: string }) {
    if (notes.length === 0) {
        return <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No manager notes at this time.</p>
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {notes.map((note) => (
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
                            {new Date(note.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem' }}>{note.content}</p>

                    {!note.isRead && (
                        <button
                            onClick={() => markNoteRead(note.id, employeeId)}
                            className="link small"
                            style={{ fontSize: '0.8rem', padding: 0 }}
                        >
                            Mark as Read
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
}
