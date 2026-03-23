import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MobileSidebarWrapper } from '@/components/dashboard/MobileSidebarWrapper'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Role detection
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = profile?.role === 'admin'

    // We can also check specific capabilities if needed, but for the basic nav:
    // admin sees mostly everything. crew sees their specific items.
    
    // We optionally fetch the generic employee display name if linked
    const { data: employee } = await supabase
        .from('employees')
        .select('display_name')
        .eq('user_id', user.id)
        .single()

    const displayName = employee?.display_name || user.email || 'Crew Member'

    const signOut = async () => {
        'use server'
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect('/login')
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
            {/* Topbar */}
            <header style={{ 
                backgroundColor: '#1e293b', 
                color: 'white', 
                padding: '0 1.5rem', 
                height: '60px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                zIndex: 10
            }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '0.5px', paddingLeft: '2rem' }}>
                    GC Operations
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    <span style={{ color: '#94a3b8' }}>{displayName}</span>
                    <form action={signOut}>
                        <button type="submit" style={{ 
                            background: 'transparent', 
                            border: '1px solid #475569', 
                            color: '#cbd5e1', 
                            cursor: 'pointer',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '4px',
                            fontSize: '0.8rem'
                        }}>
                            Logout
                        </button>
                    </form>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                <MobileSidebarWrapper>
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <Link href="/dashboard" className="nav-link" style={navLinkStyle}>Dashboard</Link>
                        {isAdmin && <Link href="/dashboard/employees" className="nav-link" style={navLinkStyle}>Crew</Link>}
                        <Link href="/dashboard/tasks" className="nav-link" style={navLinkStyle}>My Tasks</Link>
                        {isAdmin && <Link href="/dashboard/tasks/scheduler" className="nav-link" style={navLinkStyle}>Scheduler</Link>}
                        {isAdmin && <Link href="/dashboard/tasks/admin" className="nav-link" style={navLinkStyle}>Today Board</Link>}
                        {isAdmin && <Link href="/dashboard/reports" className="nav-link" style={navLinkStyle}>Reports</Link>}
                    </div>
                </MobileSidebarWrapper>

                {/* Main Content Area */}
                <main style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}

const navLinkStyle = {
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    color: '#334155',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: '0.95rem',
    display: 'block',
    transition: 'background-color 0.15s ease'
}
