'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { OpsIcon } from './Icon'

type NavItem = {
    href: string
    label: string
    icon: Parameters<typeof OpsIcon>[0]['name']
    adminOnly?: boolean
    crewOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
    { href: '/dashboard', label: 'Home', icon: 'dashboard' },
    { href: '/dashboard/crew', label: 'Crew Workspace', icon: 'tasks' },
    { href: '/dashboard/my-pay', label: 'My Pay', icon: 'payroll', crewOnly: true },
    { href: '/dashboard/time', label: 'Time Clock', icon: 'time' },
    { href: '/dashboard/tasks', label: 'My Tasks', icon: 'tasks' },
    { href: '/dashboard/employees', label: 'Crew', icon: 'crew', adminOnly: true },
    { href: '/dashboard/tasks/scheduler', label: 'Scheduler', icon: 'scheduler', adminOnly: true },
    { href: '/dashboard/tasks/admin', label: 'Today Board', icon: 'board', adminOnly: true },
    { href: '/dashboard/reports', label: 'Reports', icon: 'reports', adminOnly: true },
    { href: '/dashboard/payroll', label: 'Payroll', icon: 'payroll', adminOnly: true },
    { href: '/dashboard/resources', label: 'Resources', icon: 'resources' }
]

function isActive(pathname: string, href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
}

export function DashboardNav({ isAdmin }: { isAdmin: boolean }) {
    const pathname = usePathname()
    const items = NAV_ITEMS.filter((item) => {
        if (item.adminOnly && !isAdmin) return false
        if (item.crewOnly && isAdmin) return false
        return true
    })

    const fieldHrefs = isAdmin
        ? ['/dashboard', '/dashboard/crew', '/dashboard/time', '/dashboard/tasks', '/dashboard/resources']
        : ['/dashboard', '/dashboard/crew', '/dashboard/my-pay', '/dashboard/time', '/dashboard/tasks', '/dashboard/resources']

    const fieldItems = items.filter((i) => fieldHrefs.includes(i.href))
    const adminItems = items.filter((i) => i.adminOnly)

    return (
        <nav aria-label="Operations navigation">
            <div className="ops-nav-section">Field</div>
            {fieldItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={`ops-nav-link${isActive(pathname, item.href) ? ' ops-nav-link--active' : ''}`}
                >
                    <OpsIcon name={item.icon} />
                    {item.label}
                </Link>
            ))}
            {isAdmin && adminItems.length > 0 && (
                <>
                    <div className="ops-nav-section">Admin</div>
                    {adminItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`ops-nav-link${isActive(pathname, item.href) ? ' ops-nav-link--active' : ''}`}
                        >
                            <OpsIcon name={item.icon} />
                            {item.label}
                        </Link>
                    ))}
                </>
            )}
        </nav>
    )
}
