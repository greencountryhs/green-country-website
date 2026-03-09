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
    const todayStr = new Date().toISOString().split('T')[0]

    // Fetch today's active instances for the admin Today Board
    const { data: instances, error } = await supabase
        .from('task_assignment_instances')
        .select(`
            id,
            assignment_date,
            status,
            title,
            is_override,
            display_mode,
            created_at,
            task_assignments (
                title,
                display_mode,
                assignment_date
            ),
            task_assignment_instance_targets (
                target_type,
                employees ( display_name ),
                roles ( name )
            ),
            task_item_logs ( id, status )
        `)
        .eq('assignment_date', todayStr)
        .order('created_at', { ascending: true })

    if (error) console.error("Error fetching admin Today Board:", error)

    return (
        <div className="page" style={{ maxWidth: '1000px' }}>
            <Link href="/dashboard" className="link small" style={{ display: 'inline-block', marginBottom: '1rem' }}>
                &larr; Back to Dashboard
            </Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 style={{ margin: 0 }}>Today's Board</h1>
                <Link href="/dashboard/tasks/scheduler" className="cta primary">Open Week Scheduler</Link>
            </div>
            <p className="section-lead">Live view of today's running instances across all crews.</p>

            {(!instances || instances.length === 0) ? (
                <div className="card callout">
                    <p style={{ margin: 0, color: 'var(--muted)', textAlign: 'center' }}>No active task instances found for today.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                    {instances.map((inst: any) => {
                        const baseTitle = inst.task_assignments?.title || 'Unknown'
                        const isTitleOverride = inst.is_override
                        const displayTitle = inst.title || baseTitle

                        const targetMap = inst.task_assignment_instance_targets || []
                        const targetsLabels = targetMap.map((t: any) => {
                            if (t.target_type === 'all_crew') return 'All Crew'
                            if (t.target_type === 'employee') return t.employees?.display_name || 'Emp'
                            if (t.target_type === 'role') return t.roles?.name || 'Role'
                            return 'Unknown'
                        }).join(', ') || 'Unassigned'

                        const logsCount = inst.task_item_logs?.length || 0
                        const isPulled = inst.task_assignments?.assignment_date && inst.task_assignments.assignment_date !== inst.assignment_date

                        return (
                            <div key={inst.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{displayTitle}</h2>
                                        {isTitleOverride && <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: '#fef08a', color: '#854d0e', borderRadius: '4px', fontWeight: 600 }}>Custom Title</span>}
                                        {isPulled && <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: '#bae6fd', color: '#0369a1', borderRadius: '4px', fontWeight: 600 }}>Shifted Date</span>}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                                        <strong>Targets:</strong> {targetsLabels}
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                                        <span style={{ color: inst.status === 'completed' ? '#166534' : 'var(--muted)' }}>
                                            Status: {inst.status}
                                        </span>
                                        <span style={{ color: 'var(--muted)' }}>
                                            Items Logged: {logsCount}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#f3f4f6', borderRadius: '4px' }}>
                                        Mode: {inst.display_mode || inst.task_assignments?.display_mode}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
