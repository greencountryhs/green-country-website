import { createAdminClient } from '@/utils/supabase/service'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CrewAccessClient } from './CrewAccessClient'

export const dynamic = 'force-dynamic'

export default async function AdminCrewAccessPage() {
    // 1. Verify Admin Capability via RLS / Server Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') redirect('/dashboard')

    const adminAuthClient = createAdminClient()

    // 2. Fetch all known Employees
    const { data: employees, error: empError } = await adminAuthClient
        .from('employees')
        .select('*')
        .order('display_name')

    if (empError) {
        return <div className="page center">Error loading employee roster {empError.message}</div>
    }

    // 3. Fetch all known Supabase Auth Users (max 1000 for this query, scale with pagination later if needed)
    const { data: authData, error: authError } = await adminAuthClient.auth.admin.listUsers()

    if (authError) {
        return <div className="page center">Failed to connect to Provider Auth API: {authError.message}</div>
    }

    const authUsers = authData?.users || []

    // 4. Merge Data
    const mergedData = employees.map(emp => {
        // Try to locate the auth user primarily by strict binding (user_id), fallback to email match if floating
        let matchedUser = emp.user_id ? authUsers.find(u => u.id === emp.user_id) : null;

        if (!matchedUser && emp.email) {
            matchedUser = authUsers.find(u => u.email?.toLowerCase() === emp.email?.toLowerCase());
        }

        return {
            employee_id: emp.id,
            display_name: emp.display_name,
            employee_email: emp.email,
            active: emp.active,
            linked_user_id: emp.user_id,
            auth_user: matchedUser || null
        }
    })

    return (
        <div className="page" style={{ maxWidth: '1000px' }}>
            <Link href="/dashboard" className="link small" style={{ marginBottom: '1rem', display: 'inline-block' }}>
                &larr; Back to Dashboard
            </Link>

            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: '0 0 0.5rem 0' }}>Crew Auth & Access Terminal</h1>
                <p className="section-lead">
                    Secure internal tool bypassing standard email flows. Execute API-level password resets, fix broken auth mappings, and resolve rate limits instantly. <strong>Use with caution.</strong>
                </p>
            </div>

            <CrewAccessClient crewData={mergedData} />
        </div>
    )
}
