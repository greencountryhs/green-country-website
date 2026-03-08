import { PersonalNotesCard } from './PersonalNotesCard'
import { UnreadManagerNotesCard } from './UnreadManagerNotesCard'
import { ProjectOverviewCard } from './ProjectOverviewCard'

export function CrewDashboardShell({ employeeId }: { employeeId: string }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="card">
                    <h3>Today's Tasks (Coming Soon)</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Task engine foundation will load here.</p>
                </div>
                <PersonalNotesCard employeeId={employeeId} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <UnreadManagerNotesCard employeeId={employeeId} />
                <ProjectOverviewCard />
            </div>
        </div>
    )
}
