export type OpsStatusVariant =
    | 'scheduled'
    | 'active'
    | 'completed'
    | 'cancelled'
    | 'reopened'
    | 'paid'
    | 'unpaid'
    | 'overdue'
    | 'missing'
    | 'clocked-in'
    | 'off'

export function StatusBadge({
    variant,
    label,
    className = ''
}: {
    variant: OpsStatusVariant
    label?: string
    className?: string
}) {
    const text = label ?? variant.replace(/-/g, ' ')
    return (
        <span className={`ops-status ops-status--${variant} ${className}`.trim()}>
            {text}
        </span>
    )
}
