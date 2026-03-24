import { getPersonalNotes } from '@/lib/notes'
import { CreateNoteForm } from '@/components/notes/CreateNoteForm'
import { PrivateNoteItem } from '@/components/notes/PrivateNoteItem'
export async function PersonalNotesCard({ employeeId: _employeeId }: { employeeId: string }) {
    const notes = await getPersonalNotes()

    return (
        <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Personal Notes</h3>
            <CreateNoteForm />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {notes.length === 0 ? (
                    <p style={{ color: 'var(--muted)' }}>No personal notes yet.</p>
                ) : (
                    notes.map(note => (
                        <PrivateNoteItem key={note.id} noteId={note.id} initialBody={note.body} createdAt={note.created_at} />
                    ))
                )}
            </div>
        </div>
    )
}
