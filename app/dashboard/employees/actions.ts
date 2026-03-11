'use server'

import { createAdminClient } from '@/utils/supabase/service'
import { createClient } from '@/utils/supabase/server'
import { getURL } from '@/utils/get-url'

export async function inviteCrewMemberLogin(employeeId: string, email: string) {
    try {
        const timestamp = new Date().toISOString()
        console.log(`[AUDIT - ${timestamp}] Starting invite flow for employee: ${employeeId}, email: ${email}`);

        // 1. Verify caller is an admin
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: "Not authenticated" }

        if (user.email && email.trim().toLowerCase() === user.email.toLowerCase()) {
            return { error: "Safety Guard: You cannot invite your own admin email address as a crew member. Please use a different email (or a +alias like admin+test1@gmail.com) to test the invite flow without modifying your admin account." }
        }

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

        const siteUrl = getURL()

        console.log(`[AUDIT - ${timestamp}] Sending invite via Supabase API (API CALL 1 of 1)... Target Redirect: ${siteUrl}auth/confirm`);
        const { data: inviteData, error: inviteError } = await adminAuthClient.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${siteUrl}auth/confirm`
        })

        if (inviteError) {
            console.error(`[AUDIT - ${timestamp}] Supabase invite error:`, inviteError)

            if (inviteError.message?.toLowerCase().includes('rate limit')) {
                return { error: `Email Rate Limit Exceeded. Supabase enforces a strict limit (often 3 emails per hour) to prevent spam. Please wait before trying again.` }
            }

            return { error: `Supabase Invite Error: ${inviteError.message}` }
        }

        const newUserId = inviteData.user.id
        console.log(`[AUDIT - ${timestamp}] Invite sent successfully. New Auth User ID: ${newUserId}`);

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
