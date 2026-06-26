import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { PushNotificationSettings } from '@/components/dashboard/PushNotificationSettings';
import { OpsIcon } from '@/components/dashboard/ops/Icon';

type HomeTile = {
    href: string;
    title: string;
    description: string;
    icon: Parameters<typeof OpsIcon>[0]['name'];
    adminOnly?: boolean;
    crewOnly?: boolean;
    variant?: 'primary' | 'default';
};

const TILES: HomeTile[] = [
    {
        href: '/dashboard/crew',
        title: 'Crew Workspace',
        description: 'Today’s tasks, checklists, and clock-in.',
        icon: 'tasks',
        crewOnly: true,
        variant: 'primary'
    },
    {
        href: '/dashboard/time',
        title: 'Time Clock',
        description: 'Clock in or out for yourself or the crew.',
        icon: 'time'
    },
    {
        href: '/dashboard/tasks',
        title: 'My Tasks',
        description: 'View and complete assigned work.',
        icon: 'tasks'
    },
    {
        href: '/dashboard/tasks/admin',
        title: "Today's Board",
        description: 'Full-day task overview for the office.',
        icon: 'board',
        adminOnly: true
    },
    {
        href: '/dashboard/tasks/scheduler',
        title: 'Week Scheduler',
        description: 'Plan and assign work across the week.',
        icon: 'scheduler',
        adminOnly: true
    },
    {
        href: '/dashboard/reports',
        title: 'Operational Reports',
        description: 'Hours, missing clock-outs, and time corrections.',
        icon: 'reports',
        adminOnly: true
    },
    {
        href: '/dashboard/employees',
        title: 'Crew Management',
        description: 'Rates, profiles, and crew access.',
        icon: 'crew',
        adminOnly: true
    },
    {
        href: '/dashboard/payroll',
        title: 'Payroll',
        description: 'Pay periods, hours, payments, and adjustments.',
        icon: 'payroll',
        adminOnly: true
    },
    {
        href: '/dashboard/resources',
        title: 'Resources & Help',
        description: 'SOPs, safety, training, and how-to guides.',
        icon: 'resources'
    }
];

export default async function DashboardHome() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAdmin = profile?.role === 'admin';

    const visibleTiles = TILES.filter((tile) => {
        if (tile.adminOnly && !isAdmin) return false;
        if (tile.crewOnly && isAdmin) return false;
        return true;
    });

    return (
        <div>
            <header className="ops-page-header">
                <h1>Operations Dashboard</h1>
                <p className="ops-page-header__lead">
                    Practical tools for field work, time, tasks, and crew coordination — organized and ready for the job site.
                </p>
            </header>

            <div className="ops-grid-cards">
                {visibleTiles.map((tile) => (
                    <Link key={tile.href} href={tile.href} className="ops-home-tile">
                        <span className="ops-home-tile__icon">
                            <OpsIcon name={tile.icon} size={22} />
                        </span>
                        <span className="ops-home-tile__title">{tile.title}</span>
                        <p className="ops-home-tile__desc">{tile.description}</p>
                    </Link>
                ))}
            </div>

            <div style={{ marginTop: '2rem' }}>
                <PushNotificationSettings />
            </div>
        </div>
    );
}
