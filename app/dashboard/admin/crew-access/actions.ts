'use server'

import { createAdminClient } from '@/utils/supabase/service'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { inviteCrewMemberLogin } from '@/app/dashboard/employees/actions'

async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error("Unauthorized: Admins only")

    return { user, supabase }
}

export async function adminSetTempPassword(authUserId: string, newPassword: string) {
    try {
        await requireAdmin()
        const adminAuthClient = createAdminClient()
        const timestamp = new Date().toISOString()

        console.log(`[AUDIT - ${timestamp}] adminSetTempPassword invoked for auth user ${authUserId}`)

        const { error } = await adminAuthClient.auth.admin.updateUserById(authUserId, {
            password: newPassword,
            email_confirm: true
        })

        if (error) {
            console.error(`[AUDIT - ${timestamp}] Error setting temp password:`, error)
            return { error: `Provider Error: ${error.message}` }
        }

        revalidatePath('/dashboard/admin/crew-access')
        return { success: true }
    } catch (e: any) {
        return { error: `Server Error: ${e.message}` }
    }
}

export async function adminRepairLink(employeeId: string, targetAuthUserId: string | null) {
    try {
        await requireAdmin()
        const adminAuthClient = createAdminClient()
        const timestamp = new Date().toISOString()

        console.log(`[AUDIT - ${timestamp}] adminRepairLink invoked. Employee: ${employeeId}, Linking to AuthUser: ${targetAuthUserId || 'NULL'}`)

        const { error } = await adminAuthClient
            .from('employees')
            .update({ user_id: targetAuthUserId })
            .eq('id', employeeId)

        if (error) {
            console.error(`[AUDIT - ${timestamp}] DB error unlinking/linking:`, error)
            return { error: `Database Error: ${error.message}` }
        }

        revalidatePath('/dashboard/admin/crew-access')
        return { success: true }
    } catch (e: any) {
        return { error: `Server Error: ${e.message}` }
    }
}

export async function adminSendInvite(employeeId: string, email: string) {
    // Reusing the hardened invite action
    const res = await inviteCrewMemberLogin(employeeId, email);
    if (!res?.error) {
        revalidatePath('/dashboard/admin/crew-access')
    }
    return res;
}
