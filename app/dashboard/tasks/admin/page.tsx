import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CAPABILITIES } from '@/lib/auth/capabilities'
import { requireCapability } from '@/lib/auth/requireCapability'
import { getTaskEditorData } from '@/lib/tasks'
import { AddTaskButton } from '../scheduler/AddTaskButton'
import { InstanceActions } from '../scheduler/SchedulerActions'

export default async function AdminTasksPage() {
    const isAuthorized = await requireCapability(CAPABILITIES.MANAGE_TASKS)
    if (!isAuthorized) {
        redirect('/dashboard')
    }

    const supabase = await createClient()
    const todayStr = new Date().toISOString().split('T')[0]

    const editorData = await getTaskEditorData()

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
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <AddTaskButton dateStr={todayStr} editorData={editorData} label="Add Task" />
                    <Link href="/dashboard/tasks/scheduler" className="cta secondary">Open Week Scheduler</Link>
                </div>
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
                            if (t.target_type === 'employee') return t.employees?.display_name || 'Unknown Employee'
                            if (t.target_type === 'role') return t.roles?.name || 'Unknown Role'
                            return 'Unknown'
                        }).join(', ') || 'Unassigned'

                        const logsCount = inst.task_item_logs?.length || 0
                        const isPulled = inst.task_assignments?.assignment_date && inst.task_assignments.assignment_date !== inst.assignment_date

                        const displayMode = inst.display_mode || inst.task_assignments?.display_mode || 'full'
                        let typeLabel = 'General Task'
                        if (!isTitleOverride) {
                            if (displayMode === 'full') typeLabel = 'Static Checklist'
                            else if (displayMode === 'single' || displayMode === 'section') typeLabel = 'Interactive Checklist'
                            else typeLabel = 'Task'
                        }

                        // Map targets back for the action component
                        const actionTargets = targetMap.map((t: any) => ({
                            targetType: t.target_type,
                            employeeId: t.employee_id,
                            roleId: t.role_id
                        }))

                        return (
                            <div key={inst.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.4rem' }}>
                                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{displayTitle}</h2>
                                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: '#f3f4f6', color: '#475569', borderRadius: '4px', whiteSpace: 'nowrap', marginTop: '0.2rem' }}>
                                                {typeLabel}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 500, marginBottom: '0.5rem' }}>
                                            Assigned to: {targetsLabels}
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                                            <span style={{ color: inst.status === 'completed' ? '#166534' : 'var(--muted)', textTransform: 'capitalize' }}>
                                                Status: {inst.status}
                                            </span>
                                            <span style={{ color: 'var(--muted)' }}>
                                                Items Logged: {logsCount}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                                    <InstanceActions instanceId={inst.id} currentTargets={actionTargets} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
