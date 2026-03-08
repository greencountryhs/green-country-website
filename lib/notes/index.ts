'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPersonalNotes(employeeId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('employee_notes')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })

    if (error) console.error("Error fetching personal notes:", error)
    return data || []
}

export async function createEmployeeNote(employeeId: string, content: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('employee_notes')
        .insert([{ employee_id: employeeId, content }])

    if (error) console.error("Error creating personal note:", error)
    revalidatePath('/dashboard/crew')
    return { error }
}

export async function getManagerInbox(employeeId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('manager_note_reads')
        .select(`
            read_at,
            manager_notes (
                id,
                content,
                priority,
                created_at,
                author_id
            )
        `)
        .eq('employee_id', employeeId)

    if (error) console.error("Error fetching inbox:", error)

    // Flatten and sort manually to avoid PostgREST nested order syntax errors
    const notes = data?.map((row: any) => {
        // Handle array or single object from PostgREST relation
        const managerNote = Array.isArray(row.manager_notes) ? row.manager_notes[0] : row.manager_notes;
        return {
            ...managerNote,
            isRead: !!row.read_at
        };
    }) || []

    return notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function markNoteRead(noteId: string, employeeId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('manager_note_reads')
        .update({ read_at: new Date().toISOString() })
        .eq('note_id', noteId)
        .eq('employee_id', employeeId)

    if (error) console.error("Error marking note as read:", error)
    revalidatePath('/dashboard/crew')
    return { error }
}
