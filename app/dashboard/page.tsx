import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardHome() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    console.log("=== SERVER DEBUG LOG ===");
    console.log("User Email:", user.email);
    console.log("User ID:", user.id);
    console.log("Profile Data:", profile);
    console.log("Profile Error:", profileError);
    console.log("========================");

    const isAdmin = profile?.role === 'admin';

    return (
        <div className="page center">
            <h1>Green Country Dashboard</h1>
            <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--muted)', background: '#f3f4f6', display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem 0.8rem', borderRadius: '4px', textAlign: 'left' }}>
                <div><strong>Detected email:</strong> {user.email}</div>
                <div><strong>Detected user id:</strong> {user.id}</div>
                <div><strong>Profile found:</strong> {profile ? 'Yes' : 'No'}</div>
                <div><strong>Profile query error:</strong> {profileError ? profileError.message : 'none'}</div>
                <div><strong>Detected role:</strong> {profile?.role ?? 'none'}</div>
            </div>
            <p className="section-lead">
                Select an option below to manage employees or track time.
            </p>

            <div className="cards" style={{ maxWidth: '400px', margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {isAdmin && (
                    <>
                        <Link href="/dashboard/tasks/admin" className="cta" style={{ padding: '1.5rem', fontSize: '1.2rem' }}>
                            Today's Board
                        </Link>
                        <Link href="/dashboard/tasks/scheduler" className="cta" style={{ padding: '1.5rem', fontSize: '1.2rem' }}>
                            Week Scheduler
                        </Link>
                        <Link href="/dashboard/reports" className="cta" style={{ padding: '1.5rem', fontSize: '1.2rem' }}>
                            Operational Reports
                        </Link>
                        <Link href="/dashboard/employees" className="cta" style={{ padding: '1.5rem', fontSize: '1.2rem' }}>
                            Crew Management
                        </Link>
                        <Link href="/dashboard/payroll" className="cta" style={{ padding: '1.5rem', fontSize: '1.2rem' }}>
                            Payroll
                        </Link>
                    </>
                )}
                <Link href="/dashboard/time" className="cta secondary" style={{ padding: '1.5rem', fontSize: '1.2rem' }}>
                    Time Tracking
                </Link>
                {!isAdmin && (
                    <Link href="/dashboard/crew" className="cta" style={{ padding: '1.5rem', fontSize: '1.2rem', backgroundColor: '#3b82f6' }}>
                        My Crew Workspace
                    </Link>
                )}
            </div>

            <form action={async () => {
                'use server';
                const supabase = await createClient();
                await supabase.auth.signOut();
                redirect('/login');
            }} style={{ marginTop: '2rem' }}>
                <button type="submit" className="link small">Sign Out</button>
            </form>
        </div>
    );
}
