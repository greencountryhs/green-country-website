export function NotificationBell({ count }: { count: number }) {
    if (count === 0) return null

    return (
        <div style={{
            background: 'var(--primary)',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 'bold'
        }}>
            {count}
        </div>
    )
}
