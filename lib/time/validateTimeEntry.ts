import type { SupabaseClient } from '@supabase/supabase-js';
import {
    isExactDuplicate,
    rangesOverlap,
    TIME_ENTRY_OVERLAP_MESSAGE,
    parseTimeEntryRange
} from './overlap';

const OPEN_END_SENTINEL = '9999-12-31T23:59:59.999Z';

type ConflictCheckParams = {
    employeeId: string;
    clockIn: string;
    clockOut: string | null;
    excludeEntryId?: string;
};

export async function findConflictingTimeEntries(
    supabase: SupabaseClient,
    params: ConflictCheckParams
) {
    const { start, end } = parseTimeEntryRange(params.clockIn, params.clockOut);
    const endBound = params.clockOut ?? OPEN_END_SENTINEL;

    let query = supabase
        .from('time_entries')
        .select('id, clock_in, clock_out')
        .eq('employee_id', params.employeeId)
        .lt('clock_in', endBound)
        .or(`clock_out.is.null,clock_out.gt.${params.clockIn}`);

    if (params.excludeEntryId) {
        query = query.neq('id', params.excludeEntryId);
    }

    const { data, error } = await query;
    if (error) {
        throw new Error('Failed to validate time entry: ' + error.message);
    }

    return (data || []).filter((row) => {
        const otherStart = new Date(row.clock_in);
        const otherEnd = row.clock_out ? new Date(row.clock_out) : null;
        return (
            isExactDuplicate(start, end, otherStart, otherEnd) ||
            rangesOverlap(start, end, otherStart, otherEnd)
        );
    });
}

export async function assertNoTimeEntryConflict(
    supabase: SupabaseClient,
    params: ConflictCheckParams
): Promise<void> {
    const conflicts = await findConflictingTimeEntries(supabase, params);
    if (conflicts.length > 0) {
        throw new Error(TIME_ENTRY_OVERLAP_MESSAGE);
    }
}
