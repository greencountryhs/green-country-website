import { createClient } from '@/utils/supabase/server';

/**
 * Fetches all capability IDs for a given user.
 * If no userId is provided, fetches for the currently authenticated user.
 */
export async function getUserCapabilities(userId?: string): Promise<string[]> {
    const supabase = await createClient();
    const capabilities = new Set<string>();

    let uid = userId;
    if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        uid = user.id;
    }

    try {
        // 1. Fallback / Bundle Base: Check the `profiles` table for a legacy 'admin' or 'employee' role.
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', uid)
            .single();

        if (profile?.role) {
            // Give Master override if the profile is admin
            if (profile.role === 'admin') {
                capabilities.add('admin');
            }

            // Fetch default capabilities for this role
            const { data: defaultCaps } = await supabase
                .from('role_capabilities')
                .select('capability_id')
                .eq('role_id', profile.role);

            if (defaultCaps) {
                defaultCaps.forEach(c => capabilities.add(c.capability_id));
            }
        }

        // 2. Database Capability Checks: Check explicit `employee_roles` mapping
        const { data: employee } = await supabase
            .from('employees')
            .select('id')
            .eq('user_id', uid)
            .single();

        if (employee) {
            const { data: empRoles } = await supabase
                .from('employee_roles')
                .select('role_id')
                .eq('employee_id', employee.id);

            if (empRoles && empRoles.length > 0) {
                const roleIds = empRoles.map(er => er.role_id);

                const { data: roleCaps } = await supabase
                    .from('role_capabilities')
                    .select('capability_id')
                    .in('role_id', roleIds);

                if (roleCaps) {
                    roleCaps.forEach(c => capabilities.add(c.capability_id));
                }
            }
        }
    } catch (error) {
        console.error("Error fetching user capabilities:", error);
    }

    return Array.from(capabilities);
}
