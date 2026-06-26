type IconName =
    | 'dashboard'
    | 'crew'
    | 'tasks'
    | 'scheduler'
    | 'board'
    | 'reports'
    | 'time'
    | 'payroll'
    | 'resources'
    | 'payments'
    | 'help'

const paths: Record<IconName, string> = {
    dashboard: 'M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z',
    crew: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm11 10v-2a4 4 0 00-3-3.87M19 8a4 4 0 010 8',
    tasks: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
    scheduler: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
    board: 'M4 6h16M4 12h10M4 18h14',
    reports: 'M9 17v-6M13 17V7M17 17v-4M3 21h18',
    time: 'M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    payroll: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
    resources: 'M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 7H20M4 12h16',
    payments: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    help: 'M12 18h.01M9.09 9a3 3 0 015.83 1c0 2-3 2-3 4'
}

export function OpsIcon({ name, size = 18 }: { name: IconName; size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d={paths[name]} />
        </svg>
    )
}
