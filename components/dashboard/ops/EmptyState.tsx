export function EmptyState({
    title,
    description,
    children
}: {
    title: string
    description?: string
    children?: React.ReactNode
}) {
    return (
        <div className="ops-card ops-empty">
            <h3>{title}</h3>
            {description && <p>{description}</p>}
            {children && <div style={{ marginTop: '1rem' }}>{children}</div>}
        </div>
    )
}
