'use server'

import { createAdminClient } from '@/utils/supabase/service'
import { createClient } from '@/utils/supabase/server'

export async function inviteCrewMemberLogin(employeeId: string, email: string) {
    // 1. Verify caller is an admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Not authenticated")

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        throw new Error("Unauthorized: Only admins can provision logins")
    }

    // 2. Use Service Role Key to invite user
    const adminAuthClient = createAdminClient()

    const { data: inviteData, error: inviteError } = await adminAuthClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`
    })

    if (inviteError) {
        console.error("Invite error:", inviteError)
        return { error: inviteError.message }
    }

    const newUserId = inviteData.user.id

    // 3. The `on_auth_user_created` trigger in Postgres automatically creates the `profiles` row.
    // We just need to link the `employees` row to this `user_id`.

    const { error: updateError } = await adminAuthClient
        .from('employees')
        .update({ user_id: newUserId })
        .eq('id', employeeId)

    if (updateError) {
        console.error("Link error:", updateError)
        return { error: "Login created, but failed to link to employee record." }
    }

    return { success: true }
}
