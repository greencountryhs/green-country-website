import { createClient } from '@/utils/supabase/server';
import { CAPABILITIES } from '@/lib/auth/capabilities';
import { requireCapability } from '@/lib/auth/requireCapability';
import type { TimeClockEventRecord } from './clockEvents';

export async function getRecentClockEvents(options?: {
    employeeId?: string;
    limit?: number;
}): Promise<TimeClockEventRecord[]> {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_TIME_REPORTS);
    if (!isAuthorized) {
        return [];
    }

    const supabase = await createClient();
    const limit = options?.limit ?? 50;

    let query = supabase
        .from('time_clock_events')
        .select(`
            id,
            employee_id,
            user_id,
            time_entry_id,
            event_type,
            source,
            error_message,
            created_at,
            employees ( display_name )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('getRecentClockEvents failed:', error);
        return [];
    }

    return (data || []).map((row) => ({
        ...row,
        employees: Array.isArray(row.employees) ? row.employees[0] ?? null : row.employees
    })) as TimeClockEventRecord[];
}
