import { getPersonalNotes } from '@/lib/notes'
import { CreateNoteForm } from '@/components/notes/CreateNoteForm'
export async function PersonalNotesCard({ employeeId }: { employeeId: string }) {
    const notes = await getPersonalNotes(employeeId)

    return (
        <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Personal Notes</h3>
            <CreateNoteForm employeeId={employeeId} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {notes.length === 0 ? (
                    <p style={{ color: 'var(--muted)' }}>No personal notes yet.</p>
                ) : (
                    notes.map(note => (
                        <div key={note.id} style={{ padding: '0.75rem', background: '#f3f4f6', borderRadius: '4px', fontSize: '0.9rem' }}>
                            {note.content}
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                                {new Date(note.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
