'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { assertNoTimeEntryConflict } from './validateTimeEntry';
import { TIME_ENTRY_OVERLAP_MESSAGE } from './overlap';

async function assertCanClockEmployee(supabase: Awaited<ReturnType<typeof createClient>>, employeeId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role === 'admin') {
        return { user };
    }

    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', employeeId)
        .maybeSingle();

    if (!employee) {
        throw new Error('Unauthorized');
    }

    return { user };
}

function revalidateTimePaths() {
    revalidatePath('/dashboard/time');
    revalidatePath('/dashboard/crew');
    revalidatePath('/dashboard/reports');
    revalidatePath('/dashboard/payroll');
}

export async function clockInTimeEntry(employeeId: string) {
    const supabase = await createClient();
    await assertCanClockEmployee(supabase, employeeId);

    const now = new Date().toISOString();
    await assertNoTimeEntryConflict(supabase, {
        employeeId,
        clockIn: now,
        clockOut: null
    });

    const { data, error } = await supabase
        .from('time_entries')
        .insert([{ employee_id: employeeId, clock_in: now }])
        .select('id, clock_in')
        .single();

    if (error || !data) {
        if (error?.code === '23505') {
            throw new Error(TIME_ENTRY_OVERLAP_MESSAGE);
        }
        throw new Error(error?.message || 'Failed to clock in');
    }

    revalidateTimePaths();
    return data;
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
) {
    const supabase = await createClient();

    const { data: entry, error: fetchErr } = await supabase
        .from('time_entries')
        .select('id, employee_id, clock_in, clock_out')
        .eq('id', entryId)
        .single();

    if (fetchErr || !entry) {
        throw new Error('Time entry not found');
    }

    if (entry.clock_out) {
        throw new Error('This shift is already clocked out');
    }

    await assertCanClockEmployee(supabase, entry.employee_id);

    const now = new Date().toISOString();
    await assertNoTimeEntryConflict(supabase, {
        employeeId: entry.employee_id,
        clockIn: entry.clock_in,
        clockOut: now,
        excludeEntryId: entryId
    });

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
        if (error.code === '23P01' || error.code === '23505') {
            throw new Error(TIME_ENTRY_OVERLAP_MESSAGE);
        }
        throw new Error(error.message || 'Failed to clock out');
    }

    revalidateTimePaths();
    return { success: true };
}

export async function bulkClockInTimeEntries(employeeIds: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    const now = new Date().toISOString();
    let clockedIn = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const employeeId of employeeIds) {
        try {
            await assertNoTimeEntryConflict(supabase, {
                employeeId,
                clockIn: now,
                clockOut: null
            });

            const { error } = await supabase
                .from('time_entries')
                .insert([{ employee_id: employeeId, clock_in: now }]);

            if (error) {
                if (error.code === '23505' || error.code === '23P01') {
                    errors.push(TIME_ENTRY_OVERLAP_MESSAGE);
                    skipped += 1;
                } else {
                    errors.push(error.message);
                    skipped += 1;
                }
                continue;
            }

            clockedIn += 1;
        } catch (err) {
            skipped += 1;
            if (err instanceof Error && err.message === TIME_ENTRY_OVERLAP_MESSAGE) {
                errors.push(`${employeeId}: ${TIME_ENTRY_OVERLAP_MESSAGE}`);
            }
        }
    }

    revalidateTimePaths();

    return {
        clockedIn,
        skipped,
        error: errors.length > 0 ? errors[0] : null
    };
}

export async function bulkClockOutTimeEntries(entryIds: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    const now = new Date().toISOString();
    let clockedOut = 0;
    let skipped = 0;

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

        try {
            await assertNoTimeEntryConflict(supabase, {
                employeeId: entry.employee_id,
                clockIn: entry.clock_in,
                clockOut: now,
                excludeEntryId: entryId
            });

            const { error } = await supabase
                .from('time_entries')
                .update({ clock_out: now })
                .eq('id', entryId);

            if (error) {
                skipped += 1;
                continue;
            }

            clockedOut += 1;
        } catch {
            skipped += 1;
        }
    }

    revalidateTimePaths();
    return { clockedOut, skipped };
}
