export function ProjectOverviewCard() {
    return (
        <div className="card">
            <h3>Project Overview</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                Select a task to view its associated project context and crew-visible notes here.
            </p>
            {/* Project Overview details will populate here in the future based on task context */}
        </div>
    )
}
