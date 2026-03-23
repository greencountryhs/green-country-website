import { PersonalNotesCard } from './PersonalNotesCard'
import { UnreadManagerNotesCard } from './UnreadManagerNotesCard'
import { ProjectOverviewCard } from './ProjectOverviewCard'
import { CrewTimeClock } from './CrewTimeClock'
import { TaskDisplayList } from '@/app/dashboard/tasks/TaskDisplayList'

export function CrewDashboardShell({ employeeId, tasks = [] }: { employeeId: string, tasks?: any[] }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <CrewTimeClock employeeId={employeeId} />
                
                {tasks.length === 0 ? (
                    <div className="card">
                        <h3 style={{ margin: '0 0 1rem 0' }}>Today's Tasks</h3>
                        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No tasks scheduled for today.</p>
                    </div>
                ) : (
                    tasks.map((t: any) => (
                        <div key={t.task_assignment_instance_id} className="card">
                            <h3 style={{ margin: '0 0 1rem 0' }}>{t.assignment_name}</h3>
                            <TaskDisplayList
                                instanceId={t.task_assignment_instance_id}
                                employeeId={employeeId}
                                displayMode={t.display_mode}
                                initialItems={t.items}
                            />
                        </div>
                    ))
                )}

                <PersonalNotesCard employeeId={employeeId} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <UnreadManagerNotesCard employeeId={employeeId} />
                <ProjectOverviewCard />
            </div>
        </div>
    )
}
