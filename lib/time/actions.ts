'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkTimeEntryConflict } from './validateTimeEntry';
import {
    resolveTimeEntryFailure,
    timeEntryFailure,
    timeEntrySuccess
} from './errors';

async function assertCanClockEmployee(
    supabase: Awaited<ReturnType<typeof createClient>>,
    employeeId: string
): Promise<{ authorized: true } | { authorized: false; error: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { authorized: false, error: 'Unauthorized' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role === 'admin') {
        return { authorized: true };
    }

    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', employeeId)
        .maybeSingle();

    if (!employee) {
        return { authorized: false, error: 'Unauthorized' };
    }

    return { authorized: true };
}

function revalidateTimePaths() {
    revalidatePath('/dashboard/time');
    revalidatePath('/dashboard/crew');
    revalidatePath('/dashboard/reports');
    revalidatePath('/dashboard/payroll');
}

export async function clockInTimeEntry(employeeId: string) {
    try {
        const supabase = await createClient();
        const auth = await assertCanClockEmployee(supabase, employeeId);
        if (auth.authorized === false) {
            return timeEntryFailure(auth.error);
        }

        const now = new Date().toISOString();
        const conflict = await checkTimeEntryConflict(supabase, {
            employeeId,
            clockIn: now,
            clockOut: null
        });
        if (conflict.ok === false) {
            return timeEntryFailure(conflict.error);
        }

        const { data, error } = await supabase
            .from('time_entries')
            .insert([{ employee_id: employeeId, clock_in: now }])
            .select('id, clock_in')
            .single();

        if (error || !data) {
            console.error('clockInTimeEntry insert failed:', error);
            return timeEntryFailure(resolveTimeEntryFailure(error ?? {}, 'Failed to clock in'));
        }

        revalidateTimePaths();
        return timeEntrySuccess(data);
    } catch (err) {
        console.error('clockInTimeEntry unexpected error:', err);
        throw err;
    }
}

export async function clockOutTimeEntry(
    entryId: string,
    questionnaire?: {
        workSummary?: string;
        supplyNeeds?: string;
        dayNotes?: string;
        blockers?: string;
        followUpNeeded?: boolean;
    }
)
{
    try {
        const supabase = await createClient();

        const { data: entry, error: fetchErr } = await supabase
            .from('time_entries')
            .select('id, employee_id, clock_in, clock_out')
            .eq('id', entryId)
            .single();

        if (fetchErr || !entry) {
            return timeEntryFailure('Time entry not found');
        }

        if (entry.clock_out) {
            return timeEntryFailure('This shift is already clocked out');
        }

        const auth = await assertCanClockEmployee(supabase, entry.employee_id);
        if (auth.authorized === false) {
            return timeEntryFailure(auth.error);
        }

        const now = new Date().toISOString();
        const conflict = await checkTimeEntryConflict(supabase, {
            employeeId: entry.employee_id,
            clockIn: entry.clock_in,
            clockOut: now,
            excludeEntryId: entryId
        });
        if (conflict.ok === false) {
            return timeEntryFailure(conflict.error);
        }

        const updatePayload: Record<string, unknown> = { clock_out: now };
        if (questionnaire) {
            updatePayload.clock_out_work_summary = questionnaire.workSummary?.trim() || null;
            updatePayload.clock_out_supply_needs = questionnaire.supplyNeeds?.trim() || null;
            updatePayload.clock_out_day_notes = questionnaire.dayNotes?.trim() || null;
            updatePayload.clock_out_blockers = questionnaire.blockers?.trim() || null;
            updatePayload.clock_out_follow_up_needed = !!questionnaire.followUpNeeded;
        }

        const { error } = await supabase
            .from('time_entries')
            .update(updatePayload)
            .eq('id', entryId);

        if (error) {
            console.error('clockOutTimeEntry update failed:', error);
            return timeEntryFailure(resolveTimeEntryFailure(error, 'Failed to clock out'));
        }

        revalidateTimePaths();
        return timeEntrySuccess(undefined);
    } catch (err) {
        console.error('clockOutTimeEntry unexpected error:', err);
        throw err;
    }
}

export async function bulkClockInTimeEntries(employeeIds: string[]): Promise<{
    clockedIn: number;
    skipped: number;
    error: string | null;
}> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { clockedIn: 0, skipped: employeeIds.length, error: 'Unauthorized' };
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return { clockedIn: 0, skipped: employeeIds.length, error: 'Unauthorized' };
        }

        const now = new Date().toISOString();
        let clockedIn = 0;
        let skipped = 0;
        let firstError: string | null = null;

        for (const employeeId of employeeIds) {
            const conflict = await checkTimeEntryConflict(supabase, {
                employeeId,
                clockIn: now,
                clockOut: null
            });

            if (conflict.ok === false) {
                skipped += 1;
                firstError ??= conflict.error;
                continue;
            }

            const { error } = await supabase
                .from('time_entries')
                .insert([{ employee_id: employeeId, clock_in: now }]);

            if (error) {
                console.error('bulkClockInTimeEntries insert failed:', { employeeId, error });
                skipped += 1;
                firstError ??= resolveTimeEntryFailure(error);
                continue;
            }

            clockedIn += 1;
        }

        revalidateTimePaths();
        return { clockedIn, skipped, error: firstError };
    } catch (err) {
        console.error('bulkClockInTimeEntries unexpected error:', err);
        throw err;
    }
}

export async function bulkClockOutTimeEntries(entryIds: string[]): Promise<{
    clockedOut: number;
    skipped: number;
    error: string | null;
}> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { clockedOut: 0, skipped: entryIds.length, error: 'Unauthorized' };
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return { clockedOut: 0, skipped: entryIds.length, error: 'Unauthorized' };
        }

        const now = new Date().toISOString();
        let clockedOut = 0;
        let skipped = 0;
        let firstError: string | null = null;

        for (const entryId of entryIds) {
            const { data: entry } = await supabase
                .from('time_entries')
                .select('id, employee_id, clock_in, clock_out')
                .eq('id', entryId)
                .maybeSingle();

            if (!entry || entry.clock_out) {
                skipped += 1;
                continue;
            }

            const conflict = await checkTimeEntryConflict(supabase, {
                employeeId: entry.employee_id,
                clockIn: entry.clock_in,
                clockOut: now,
                excludeEntryId: entryId
            });

            if (conflict.ok === false) {
                skipped += 1;
                firstError ??= conflict.error;
                continue;
            }

            const { error } = await supabase
                .from('time_entries')
                .update({ clock_out: now })
                .eq('id', entryId);

            if (error) {
                console.error('bulkClockOutTimeEntries update failed:', { entryId, error });
                skipped += 1;
                firstError ??= resolveTimeEntryFailure(error);
                continue;
            }

            clockedOut += 1;
        }

        revalidateTimePaths();
        return { clockedOut, skipped, error: firstError };
    } catch (err) {
        console.error('bulkClockOutTimeEntries unexpected error:', err);
        throw err;
    }
}
