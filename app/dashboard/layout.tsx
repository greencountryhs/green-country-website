import './dashboard-theme.css'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { MobileSidebarWrapper } from '@/components/dashboard/MobileSidebarWrapper'
import { DashboardNav } from '@/components/dashboard/ops/DashboardNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = profile?.role === 'admin'

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
        <div className="ops-app">
            <header className="ops-header">
                <div className="ops-header__brand">
                    Level &amp; Anvil <span>Operations</span>
                </div>
                <div className="ops-header__user">
                    <span className="ops-header__name">{displayName}</span>
                    <form action={signOut}>
                        <button
                            type="submit"
                            className="ops-btn ops-btn--secondary"
                            style={{
                                padding: '0.4rem 0.75rem',
                                minHeight: 36,
                                fontSize: '0.82rem',
                                background: 'transparent',
                                color: '#e2e8f0',
                                borderColor: '#4b5563'
                            }}
                        >
                            Logout
                        </button>
                    </form>
                </div>
            </header>

            <div className="ops-shell">
                <MobileSidebarWrapper>
                    <DashboardNav isAdmin={isAdmin} />
                </MobileSidebarWrapper>

                <main className="ops-main">
                    <div className="ops-main__inner ops-page">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
