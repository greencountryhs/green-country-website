import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminEmployeeRecord } from '../actions'

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

    // Fetch Incoming Manager Notes
    const { data: notes } = await supabase
        .from('manager_note_reads')
        .select(`
            read_at,
            manager_notes (
                content,
                priority,
                created_at,
                author_id
            )
        `)
        .eq('employee_id', employee.id)
        .order('manager_notes(created_at)', { ascending: false })

    // Resolve Manager's Own Employee ID for Note Sending
    const { data: managerEmp } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single()

    async function sendManagerNote(formData: FormData) {
        'use server'
        const supabaseServer = await createClient()
        const content = formData.get('content') as string
        const employeeId = formData.get('employeeId') as string
        const authorId = formData.get('authorId') as string

        if (!content || !authorId) return

        const { data: note, error: noteErr } = await supabaseServer
            .from('manager_notes')
            .insert([{ author_id: authorId, content, priority: 'normal' }])
            .select('id')
            .single()

        if (note) {
            await supabaseServer
                .from('manager_note_reads')
                .insert([{ note_id: note.id, employee_id: employeeId }])
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                {notes.map((n: any, idx) => (
                                    <div key={idx} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <p style={{ margin: '0 0 0.5rem 0' }}>{n.manager_notes?.content}</p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)' }}>
                                            <span>Sent: {new Date(n.manager_notes?.created_at).toLocaleDateString()}</span>
                                            <span>{n.read_at ? <span style={{ color: '#166534' }}>Read ({new Date(n.read_at).toLocaleDateString()})</span> : 'Unread'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                <input type="hidden" name="authorId" value={managerEmp.id} />
                                <textarea name="content" required placeholder="Type a note..." rows={4} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', resize: 'vertical' }}></textarea>
                                <button type="submit" className="cta primary" style={{ width: '100%', padding: '0.5rem' }}>Send Note</button>
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
