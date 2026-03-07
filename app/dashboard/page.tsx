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

            <div className="cards" style={{ maxWidth: '400px', margin: '2rem auto', display: 'flex', flexDirection: 'column' }}>
                {isAdmin && (
                    <Link href="/dashboard/employees" className="cta" style={{ padding: '1.5rem', fontSize: '1.2rem' }}>
                        Employee Management
                    </Link>
                )}
                <Link href="/dashboard/time" className="cta secondary" style={{ padding: '1.5rem', fontSize: '1.2rem', marginTop: '1rem' }}>
                    Time Tracking
                </Link>
            </div>

            <form action="/auth/signout" method="post" style={{ marginTop: '2rem' }}>
                <button type="submit" className="link small">Sign Out</button>
            </form>
        </div>
    );
}
