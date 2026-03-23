import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CrewDashboardShell } from '@/components/dashboard/CrewDashboardShell'
import { getTodaysTasks, getTaskInstanceItems } from '@/lib/tasks'

export default async function CrewDashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get employee record
    const { data: employee } = await supabase
        .from('employees')
        .select('id, display_name')
        .eq('user_id', user.id)
        .single()

    if (!employee) {
        return (
            <div className="page center">
                <div className="callout" style={{ textAlign: 'center' }}>
                    <p>No crew profile found for this user.</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '0.5rem' }}>If you just created this account, an administrator needs to assign it to a crew profile.</p>
                </div>
            </div>
        )
    }

    const tasks = await getTodaysTasks(employee.id)

    // Fetch the actual task checklist items for each assigned instance for the day
    const tasksWithItems = await Promise.all(tasks.map(async (t: any) => ({
        ...t,
        items: await getTaskInstanceItems(t.task_assignment_instance_id)
    })))

    return (
        <div className="page">
            <h1>Crew Workspace</h1>
            <p className="section-lead" style={{ marginTop: '0.5rem' }}>Welcome back, {employee.display_name}.</p>

            <CrewDashboardShell employeeId={employee.id} tasks={tasksWithItems} />
        </div>
    )
}
