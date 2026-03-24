import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminEmployeeRecord } from '../actions'
import { SubmitButton } from '@/components/submit-button'
import { EmployeeManagerNotesList } from '@/components/notes/EmployeeManagerNotesList'

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
    const supabase = await createClient()

    // Enforce Manager/Admin protection
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') redirect('/dashboard')

    // Fetch Employee
    const { data: employee, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', params.id)
        .single()

    if (error || !employee) {
        return <div className="page center"><h1>Employee Not Found</h1></div>
    }

    // Fetch Time Entries
    const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employee.id)
        .order('clock_in', { ascending: false })
        .limit(10)

    // Calculate basic hours
    let totalHoursLoggedThisWeek = 0
    let lastActiveDate = 'N/A'
    if (timeEntries && timeEntries.length > 0) {
        lastActiveDate = new Date(timeEntries[0].clock_in).toLocaleDateString()
        totalHoursLoggedThisWeek = timeEntries.reduce((total, entry) => {
            if (entry.clock_out) {
                const diff = (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / (1000 * 60 * 60)
                return total + diff
            }
            return total
        }, 0)
    }

    // Fetch Target / Log Data
    const { data: logs } = await supabase
        .from('task_item_logs')
        .select(`
            status,
            logged_at,
            task_template_item_id,
            task_assignment_instances (
                title,
                assignment_date
            )
        `)
        .eq('employee_id', employee.id)
        .order('logged_at', { ascending: false })
        .limit(5)

    const uuidKey = (u: string | null | undefined) =>
        u == null || u === '' ? null : String(u).trim().toLowerCase()

    // Fetch Incoming Manager Notes (replies loaded separately — nested embed can fail the whole query)
    const { data: rawNotes } = await supabase
        .from('manager_note_reads')
        .select(`
            read_at,
            manager_note_id,
            manager_notes (
                id,
                body,
                priority,
                created_at,
                created_by
            )
        `)
        .eq('employee_id', employee.id)

    const noteIdsForReplies = [
        ...new Set(
            (rawNotes || [])
                .map((row: any) => {
                    const mn = Array.isArray(row.manager_notes) ? row.manager_notes[0] : row.manager_notes
                    const raw = (row.manager_note_id ?? mn?.id) as string | undefined
                    const k = uuidKey(raw)
                    return k || undefined
                })
                .filter(Boolean) as string[]
        )
    ]

    let repliesByNoteId: Record<string, { id: string; body: string; created_at: string; employee_id: string }[]> = {}
    if (noteIdsForReplies.length > 0) {
        const { data: replyRows, error: replyErr } = await supabase
            .from('manager_note_replies')
            .select('id, manager_note_id, body, created_at, employee_id')
            .in('manager_note_id', noteIdsForReplies)
            .eq('employee_id', employee.id)

        if (replyErr) {
            console.error('Error fetching manager note replies (employee detail):', replyErr)
        } else {
            if (process.env.NODE_ENV === 'development') {
                console.info('[employee detail] manager_note_replies', {
                    replyRowCount: replyRows?.length ?? 0,
                    noteIdCount: noteIdsForReplies.length
                })
            }
            for (const r of replyRows || []) {
                const k = uuidKey(r.manager_note_id)
                if (!k) continue
                if (!repliesByNoteId[k]) repliesByNoteId[k] = []
                repliesByNoteId[k].push(r)
            }
        }
    }

    const notes = (rawNotes || []).map((row: any) => {
        const mn = Array.isArray(row.manager_notes) ? row.manager_notes[0] : row.manager_notes
        const nid = uuidKey(row.manager_note_id ?? mn?.id)
        return {
            ...row,
            manager_notes: mn
                ? { ...mn, manager_note_replies: nid ? (repliesByNoteId[nid] || []) : [] }
                : mn
        }
    }).sort((a: any, b: any) => {
        const dateA = new Date(a.manager_notes?.created_at || 0).getTime()
        const dateB = new Date(b.manager_notes?.created_at || 0).getTime()
        return dateB - dateA
    })

    const notesForClient = notes.map((n: any) => ({
        read_at: n.read_at ?? null,
        manager_notes: n.manager_notes
            ? {
                  id: n.manager_notes.id,
                  body: n.manager_notes.body,
                  priority: n.manager_notes.priority,
                  created_at: n.manager_notes.created_at,
                  created_by: n.manager_notes.created_by,
                  manager_note_replies: (n.manager_notes.manager_note_replies || []).map((r: any) => ({
                      id: r.id,
                      body: r.body,
                      created_at: r.created_at
                  }))
              }
            : null
    }))

    // Resolve Manager's Own Employee ID for Note Sending
    const { data: managerEmp } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single()

    async function sendManagerNote(formData: FormData) {
        'use server'
        const supabaseServer = await createClient()
        const { data: { user } } = await supabaseServer.auth.getUser()
        if (!user) {
            throw new Error('Not authenticated')
        }

        const content = formData.get('content') as string
        const employeeId = formData.get('employeeId') as string

        if (!content || !employeeId) return

        const { data: authorEmployee, error: authorEmployeeErr } = await supabaseServer
            .from('employees')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (authorEmployeeErr || !authorEmployee) {
            throw new Error('Your admin account is not linked to an employee profile. Use "Fix Issue (Create Admin Profile)" and try again.')
        }

        const { data: note, error: noteErr } = await supabaseServer
            .from('manager_notes')
            .insert([{ created_by: user.id, title: 'Manager Note', body: content, priority: 'normal' }])
            .select('id')
            .single()

        if (note) {
            await supabaseServer
                .from('manager_note_reads')
                .insert([{ manager_note_id: note.id, employee_id: employeeId }])
        }

        revalidatePath(`/dashboard/employees/${employeeId}`)
    }

    return (
        <div className="page" style={{ maxWidth: '1000px' }}>
            <Link href="/dashboard/employees" className="link small" style={{ marginBottom: '1rem', display: 'inline-block' }}>
                &larr; Back to Crew List
            </Link>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
                <div>
                    <h1>{employee.display_name}</h1>
                    <div className="card" style={{ marginBottom: '2rem' }}>
                        <h3>Profile Detail</h3>
                        <p style={{ margin: '0.5rem 0', color: 'var(--muted)' }}>Pay Rate: ${(employee.pay_rate_cents / 100).toFixed(2)}/hr</p>
                        <p style={{ margin: '0.5rem 0', color: 'var(--muted)' }}>Email: {employee.email || 'N/A'}</p>
                        <p style={{ margin: '0.5rem 0', color: 'var(--muted)' }}>Status: {employee.active ? 'Active' : 'Inactive'}</p>
                        <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '4px', border: '1px solid var(--border)' }}>
                            <strong>Auth Status: </strong>
                            {employee.user_id ? <span style={{ color: '#166534' }}>Linked ({employee.user_id})</span> : <span style={{ color: '#991b1b' }}>Unlinked / Pending Invite</span>}
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: '2rem' }}>
                        <h3>Recent Task Completion</h3>
                        {(!logs || logs.length === 0) ? (
                            <p className="muted">No recent task logs.</p>
                        ) : (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {logs.map((log: any, idx) => (
                                    <li key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <strong>{log.task_assignment_instances?.title || "Legacy Task"}</strong>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{log.logged_at ? new Date(log.logged_at).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#166534' }}>✓ Completed</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="card">
                        <h3>Manager Notes</h3>
                        {(!notes || notes.length === 0) ? (
                            <p className="muted">No notes sent to this crew member.</p>
                        ) : (
                            <EmployeeManagerNotesList notes={notesForClient} employeeId={employee.id} />
                        )}
                    </div>
                </div>

                <div>
                    <div className="card" style={{ marginBottom: '1.5rem', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                        <h3>Send Priority Note</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>Note will appear on their Today board until acknowledged.</p>

                        {managerEmp?.id ? (
                            <form action={sendManagerNote} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <input type="hidden" name="employeeId" value={employee.id} />
                                <textarea name="content" required placeholder="Type a note..." rows={4} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', resize: 'vertical' }}></textarea>
                                <SubmitButton text="Send Note" pendingText="Sending..." />
                            </form>
                        ) : (
                            <form action={createAdminEmployeeRecord} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#fef2f2', padding: '1rem', borderRadius: '4px', border: '1px solid #fecaca' }}>
                                <p style={{ color: '#991b1b', fontSize: '0.85rem', margin: 0 }}>Your Admin account is not linked to an employee record so you cannot author notes.</p>
                                <button type="submit" className="cta secondary" style={{ background: 'white' }}>Fix Issue (Create Admin Profile)</button>
                            </form>
                        )}
                    </div>

                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h3>Hours (Recent 10)</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>{totalHoursLoggedThisWeek.toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--muted)' }}>hrs</span></div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>Last active: {lastActiveDate}</p>

                        <Link href="/dashboard/reports" className="link small" style={{ display: 'block', textAlign: 'center' }}>
                            View Full Reports &rarr;
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
