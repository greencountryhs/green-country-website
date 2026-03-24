'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

async function getCurrentEmployeeId() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { supabase, employeeId: null as string | null }

    const { data: employee, error } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (error || !employee) return { supabase, employeeId: null as string | null }

    return { supabase, employeeId: employee.id }
}

export async function getPersonalNotes() {
    const { supabase, employeeId } = await getCurrentEmployeeId()
    if (!employeeId) return []

    const { data, error } = await supabase
        .from('employee_private_notes')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })

    if (error) console.error("Error fetching personal notes:", error)
    return data || []
}

export async function createEmployeeNote(content: string) {
    const body = content.trim()
    if (!body) {
        return { error: { message: 'Note body is required' } }
    }

    const { supabase, employeeId } = await getCurrentEmployeeId()
    if (!employeeId) {
        return { error: { message: 'No employee profile linked to this user' } }
    }

    const { error } = await supabase
        .from('employee_private_notes')
        .insert([{ employee_id: employeeId, body }])

    if (error) console.error("Error creating personal note:", error)
    revalidatePath('/dashboard/crew')
    return { error }
}

export async function updateEmployeeNote(noteId: string, content: string) {
    const body = content.trim()
    if (!body) {
        return { error: { message: 'Note body is required' } }
    }

    const { supabase, employeeId } = await getCurrentEmployeeId()
    if (!employeeId) {
        return { error: { message: 'No employee profile linked to this user' } }
    }

    const { error } = await supabase
        .from('employee_private_notes')
        .update({ body })
        .eq('id', noteId)
        .eq('employee_id', employeeId)

    if (error) console.error("Error updating personal note:", error)
    revalidatePath('/dashboard/crew')
    return { error }
}

export async function deleteEmployeeNote(noteId: string) {
    const { supabase, employeeId } = await getCurrentEmployeeId()
    if (!employeeId) {
        return { error: { message: 'No employee profile linked to this user' } }
    }

    const { error } = await supabase
        .from('employee_private_notes')
        .delete()
        .eq('id', noteId)
        .eq('employee_id', employeeId)

    if (error) console.error("Error deleting personal note:", error)
    revalidatePath('/dashboard/crew')
    return { error }
}

type ManagerNoteReplyRow = { id: string; manager_note_id: string; body: string; created_at: string; employee_id: string }

function groupRepliesByManagerNoteId(rows: ManagerNoteReplyRow[] | null | undefined): Record<string, ManagerNoteReplyRow[]> {
    const map: Record<string, ManagerNoteReplyRow[]> = {}
    for (const r of rows || []) {
        if (!map[r.manager_note_id]) map[r.manager_note_id] = []
        map[r.manager_note_id].push(r)
    }
    return map
}

export async function getManagerInbox(employeeId: string) {
    const supabase = await createClient()

    // Do not nest manager_note_replies under manager_notes: PostgREST can fail the whole
    // request (empty data) if the embed cannot resolve or the replies table is missing.
    const { data, error } = await supabase
        .from('manager_note_reads')
        .select(`
            read_at,
            manager_notes (
                id,
                body,
                priority,
                created_at,
                created_by
            )
        `)
        .eq('employee_id', employeeId)

    if (error) console.error("Error fetching inbox:", error)

    const rows = data || []
    const noteIds = rows
        .map((row: any) => {
            const mn = Array.isArray(row.manager_notes) ? row.manager_notes[0] : row.manager_notes
            return mn?.id as string | undefined
        })
        .filter(Boolean) as string[]

    let repliesByNoteId: Record<string, ManagerNoteReplyRow[]> = {}
    if (noteIds.length > 0) {
        const { data: replyRows, error: replyErr } = await supabase
            .from('manager_note_replies')
            .select('id, manager_note_id, body, created_at, employee_id')
            .in('manager_note_id', noteIds)
            .eq('employee_id', employeeId)

        if (replyErr) {
            console.error('Error fetching manager note replies (inbox):', replyErr)
        } else {
            repliesByNoteId = groupRepliesByManagerNoteId(replyRows)
        }
    }

    const notes = rows.map((row: any) => {
        const managerNote = Array.isArray(row.manager_notes) ? row.manager_notes[0] : row.manager_notes
        const id = managerNote?.id as string | undefined
        return {
            ...managerNote,
            manager_note_replies: id ? (repliesByNoteId[id] || []) : [],
            isRead: !!row.read_at
        }
    })

    return notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function markNoteRead(noteId: string, employeeId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('manager_note_reads')
        .update({ read_at: new Date().toISOString() })
        .eq('manager_note_id', noteId)
        .eq('employee_id', employeeId)

    if (error) console.error("Error marking note as read:", error)
    revalidatePath('/dashboard/crew')
    return { error }
}

export async function createManagerNoteReply(managerNoteId: string, body: string) {
    const trimmed = body.trim()
    if (!trimmed) {
        return { error: { message: 'Reply body is required' } }
    }

    const { supabase, employeeId } = await getCurrentEmployeeId()
    if (!employeeId) {
        return { error: { message: 'No employee profile linked to this user' } }
    }

    const { data: receipt, error: receiptErr } = await supabase
        .from('manager_note_reads')
        .select('manager_note_id')
        .eq('manager_note_id', managerNoteId)
        .eq('employee_id', employeeId)
        .single()

    if (receiptErr || !receipt) {
        return { error: { message: 'You can only reply to notes assigned to you' } }
    }

    const { error } = await supabase
        .from('manager_note_replies')
        .insert([{
            manager_note_id: managerNoteId,
            employee_id: employeeId,
            body: trimmed
        }])

    if (error) console.error('Error creating manager note reply:', error)
    revalidatePath('/dashboard/crew')
    if (!error) {
        revalidatePath(`/dashboard/employees/${employeeId}`)
    }
    return { error }
}

export async function deleteManagerNoteForEmployee(managerNoteId: string, employeeId: string) {
    const noteId = managerNoteId?.trim()
    const empId = employeeId?.trim()
    if (!noteId || !empId) {
        return { error: { message: 'Invalid request' } }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: { message: 'Not authenticated' } }
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
        return { error: { message: 'Unauthorized' } }
    }

    const { data: receipt, error: receiptErr } = await supabase
        .from('manager_note_reads')
        .select('manager_note_id')
        .eq('manager_note_id', noteId)
        .eq('employee_id', empId)
        .maybeSingle()

    if (receiptErr || !receipt) {
        return { error: { message: 'Note not found for this employee' } }
    }

    const { error } = await supabase.from('manager_notes').delete().eq('id', noteId)

    if (error) {
        console.error('Error deleting manager note:', error)
        return { error: { message: error.message } }
    }

    revalidatePath(`/dashboard/employees/${empId}`)
    revalidatePath('/dashboard/crew')
    return { error: null }
}
