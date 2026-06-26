import Link from 'next/link'

export function PageHeader({
    title,
    lead,
    backHref = '/dashboard',
    backLabel = 'Back to Dashboard',
    actions
}: {
    title: string
    lead?: string
    backHref?: string
    backLabel?: string
    actions?: React.ReactNode
}) {
    return (
        <header className="ops-page-header">
            <Link href={backHref} className="ops-page-header__back">
                ← {backLabel}
            </Link>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h1>{title}</h1>
                    {lead && <p className="ops-page-header__lead">{lead}</p>}
                </div>
                {actions}
            </div>
        </header>
    )
}
