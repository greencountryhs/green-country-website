'use server'

import { createAdminClient } from '@/utils/supabase/service'
import { createClient } from '@/utils/supabase/server'

export async function inviteCrewMemberLogin(employeeId: string, email: string) {
    try {
        console.log(`[actions.ts] Starting invite flow for employee: ${employeeId}, email: ${email}`);

        // 1. Verify caller is an admin
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: "Not authenticated" }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return { error: "Unauthorized: Only admins can provision logins" }
        }

        // 2. Use Service Role Key to invite user
        // Note: createAdminClient throws if SUPABASE_SERVICE_ROLE_KEY is missing.
        // Putting it inside try/catch prevents the server action from crashing.
        console.log(`[actions.ts] Admin authenticated. Initializing admin auth client...`);
        const adminAuthClient = createAdminClient()

        let siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
            process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
            process.env.NEXT_PUBLIC_VERCEL_URL ||
            process.env.VERCEL_URL ||
            'http://localhost:3000'

        if (!siteUrl.startsWith('http')) {
            siteUrl = `https://${siteUrl}`
        }

        console.log(`[actions.ts] Sending invite via Supabase API... Target Redirect: ${siteUrl}/auth/confirm`);
        const { data: inviteData, error: inviteError } = await adminAuthClient.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${siteUrl}/auth/confirm`
        })

        if (inviteError) {
            console.error("[actions.ts] Supabase invite error:", inviteError)
            return { error: `Supabase Invite Error: ${inviteError.message}` }
        }

        const newUserId = inviteData.user.id
        console.log(`[actions.ts] Invite sent successfully. New Auth User ID: ${newUserId}`);

        // 3. The `on_auth_user_created` trigger in Postgres automatically creates the `profiles` row.
        // We just need to link the `employees` row to this `user_id`.

        console.log(`[actions.ts] Linking new Auth User ID to Employee Record ${employeeId}...`);
        const { error: updateError } = await adminAuthClient
            .from('employees')
            .update({ user_id: newUserId })
            .eq('id', employeeId)

        if (updateError) {
            console.error("[actions.ts] Employee Link error:", updateError)
            return { error: `Login created, but failed to link to employee record: ${updateError.message}` }
        }

        console.log(`[actions.ts] Successfully linked login to employee record.`);
        return { success: true }

    } catch (e: any) {
        console.error("[actions.ts] Fatal exception in inviteCrewMemberLogin:", e)
        return { error: `Fatal Server Error: ${e.message || "Unknown error during invite process"}` }
    }
}
