import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CAPABILITIES } from '@/lib/auth/capabilities'
import { requireCapability } from '@/lib/auth/requireCapability'

export default async function AdminTasksPage() {
    const isAuthorized = await requireCapability(CAPABILITIES.MANAGE_TASKS)
    if (!isAuthorized) {
        redirect('/dashboard')
    }

    const supabase = await createClient()

    // Fetch all active instances for the admin view
    const { data: instances, error } = await supabase
        .from('task_assignment_instances')
        .select(`
            id,
            scheduled_date,
            status,
            task_assignments (
                name,
                display_mode,
                task_assignment_targets (
                    employees (
                        display_name
                    )
                )
            )
        `)
        .order('scheduled_date', { ascending: true })

    if (error) console.error("Error fetching admin assignments:", error)

    return (
        <div className="page" style={{ maxWidth: '800px' }}>
            <Link href="/dashboard" className="link small" style={{ display: 'inline-block', marginBottom: '1rem' }}>
                &larr; Back to Dashboard
            </Link>

            <h1>Task Overview (Admin)</h1>
            <p className="section-lead">View and manage scheduled task instances across all crews.</p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                <button className="cta">Create New Assignment</button>
            </div>

            {(!instances || instances.length === 0) ? (
                <div className="card callout">
                    <p style={{ margin: 0, color: 'var(--muted)', textAlign: 'center' }}>No active task instances found in the system.</p>
                </div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem' }}>Assignment Name</th>
                            <th style={{ padding: '0.75rem' }}>Scheduled Date</th>
                            <th style={{ padding: '0.75rem' }}>Assigned Crew</th>
                            <th style={{ padding: '0.75rem' }}>Mode</th>
                        </tr>
                    </thead>
                    <tbody>
                        {instances.map((inst: any) => {
                            const assignment = Array.isArray(inst.task_assignments) ? inst.task_assignments[0] : inst.task_assignments;
                            const targets = Array.isArray(assignment?.task_assignment_targets) ? assignment.task_assignment_targets : (assignment?.task_assignment_targets ? [assignment.task_assignment_targets] : []);

                            return (
                                <tr key={inst.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{assignment?.name || 'Unknown'}</td>
                                    <td style={{ padding: '0.75rem', color: 'var(--muted)' }}>
                                        {new Date(inst.scheduled_date).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        {targets.map((t: any) => t.employees?.display_name).join(', ') || 'Unassigned'}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: '#f3f4f6', borderRadius: '4px' }}>
                                            {assignment?.display_mode}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}
        </div>
    )
}
