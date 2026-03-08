import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTodaysTasks } from '@/lib/tasks'
import { TaskDisplayList } from '@/app/dashboard/tasks/TaskDisplayList'

export default async function CrewTasksPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!employee) {
        redirect('/dashboard')
    }

    const tasks = await getTodaysTasks(employee.id)

    return (
        <div className="page">
            <Link href="/dashboard/crew" className="link small" style={{ display: 'inline-block', marginBottom: '1rem' }}>
                &larr; Back to Dashboard
            </Link>

            <h1>Today's Tasks</h1>

            {tasks.length === 0 ? (
                <div className="card callout" style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <p style={{ margin: 0, color: 'var(--muted)' }}>No tasks scheduled for today.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1.5rem' }}>
                    {tasks.map((t: any) => (
                        <div key={t.instance_id} className="card">
                            <h2 style={{ fontSize: '1.3rem', margin: '0 0 1rem 0' }}>{t.assignment_name}</h2>
                            <TaskDisplayList
                                instanceId={t.instance_id}
                                employeeId={employee.id}
                                displayMode={t.display_mode}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
