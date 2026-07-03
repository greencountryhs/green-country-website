import type { SupabaseClient } from '@supabase/supabase-js';
import {
    isExactDuplicate,
    rangesOverlap,
    TIME_ENTRY_DUPLICATE_MESSAGE,
    TIME_ENTRY_OPEN_SHIFT_MESSAGE,
    TIME_ENTRY_OVERLAP_MESSAGE,
    parseTimeEntryRange
} from './overlap';
import { timeEntryFailure } from './errors';

const OPEN_END_SENTINEL = '9999-12-31T23:59:59.999Z';

type ConflictCheckParams = {
    employeeId: string;
    clockIn: string;
    clockOut: string | null;
    excludeEntryId?: string;
};

type ParsedRange = { start: Date; end: Date | null };

/** PostgREST filter literal for timestamptz values (colons require quoting). */
function postgrestTimestampLiteral(iso: string): string {
    return `"${iso.replace(/"/g, '\\"')}"`;
}

function parseRangeOrError(
    clockIn: string,
    clockOut: string | null
): { ok: true; range: ParsedRange } | { ok: false; error: string } {
    try {
        return { ok: true, range: parseTimeEntryRange(clockIn, clockOut) };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid time range';
        return { ok: false, error: message };
    }
}

function conflictMessageFor(
    params: ConflictCheckParams,
    range: ParsedRange,
    conflicts: Array<{ clock_in: string; clock_out: string | null }>
): string {
    const { start, end } = range;

    for (const row of conflicts) {
        const otherStart = new Date(row.clock_in);
        const otherEnd = row.clock_out ? new Date(row.clock_out) : null;
        if (isExactDuplicate(start, end, otherStart, otherEnd)) {
            return TIME_ENTRY_DUPLICATE_MESSAGE;
        }
    }

    if (params.clockOut === null) {
        for (const row of conflicts) {
            if (row.clock_out === null) {
                return TIME_ENTRY_OPEN_SHIFT_MESSAGE;
            }
        }
    }

    return TIME_ENTRY_OVERLAP_MESSAGE;
}

export async function findConflictingTimeEntries(
    supabase: SupabaseClient,
    params: ConflictCheckParams
) {
    const parsed = parseRangeOrError(params.clockIn, params.clockOut);
    if (parsed.ok === false) {
        return { ok: false as const, error: parsed.error, conflicts: [] as Array<{ clock_in: string; clock_out: string | null }> };
    }

    const { start, end } = parsed.range;
    const endBound = params.clockOut ?? OPEN_END_SENTINEL;
    const clockInLiteral = postgrestTimestampLiteral(params.clockIn);

    let query = supabase
        .from('time_entries')
        .select('id, clock_in, clock_out')
        .eq('employee_id', params.employeeId)
        .lt('clock_in', endBound)
        .or(`clock_out.is.null,clock_out.gt.${clockInLiteral}`);

    if (params.excludeEntryId) {
        query = query.neq('id', params.excludeEntryId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('findConflictingTimeEntries query failed:', {
            employeeId: params.employeeId,
            clockIn: params.clockIn,
            clockOut: params.clockOut,
            code: error.code,
            message: error.message
        });
        return {
            ok: false as const,
            error: 'Unable to check for conflicting time entries. Please try again.',
            conflicts: [] as Array<{ clock_in: string; clock_out: string | null }>
        };
    }

    const conflicts = (data || []).filter((row) => {
        const otherStart = new Date(row.clock_in);
        const otherEnd = row.clock_out ? new Date(row.clock_out) : null;
        return (
            isExactDuplicate(start, end, otherStart, otherEnd) ||
            rangesOverlap(start, end, otherStart, otherEnd)
        );
    });

    return { ok: true as const, range: parsed.range, conflicts };
}

export async function checkTimeEntryConflict(
    supabase: SupabaseClient,
    params: ConflictCheckParams
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        const result = await findConflictingTimeEntries(supabase, params);
        if (result.ok === false) {
            return timeEntryFailure(result.error);
        }
        if (result.conflicts.length === 0) {
            return { ok: true as const };
        }
        return timeEntryFailure(conflictMessageFor(params, result.range, result.conflicts));
    } catch (err) {
        console.error('checkTimeEntryConflict unexpected error:', err);
        return timeEntryFailure('Unable to validate time entry. Please try again.');
    }
}

/** @deprecated Prefer checkTimeEntryConflict for user-facing flows. */
export async function assertNoTimeEntryConflict(
    supabase: SupabaseClient,
    params: ConflictCheckParams
): Promise<void> {
    const result = await checkTimeEntryConflict(supabase, params);
    if (result.ok === false) {
        throw new Error(result.error);
    }
}
